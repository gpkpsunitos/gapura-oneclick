# Task 3 — Dual-Space Code Audit

Roots: `/Volumes/Backup/ai-model/hf-space/` and `/Volumes/Backup/ai-model/hf-space/dl-space/` (nested — not siblings as spec implies).

## Disk reality

| Item | Size | Status |
|---|---|---|
| `hf-space/` total | **2.7 GB** | over budget by 1.7 GB |
| ↳ `.git/` | 958 MB | history bloated by old model blobs |
| ↳ `.venv/` | 305 MB | local Python venv — never deploy |
| ↳ `retrain-env/` (10,552 files) | 269 MB | second local venv — never deploy |
| ↳ `dl-space/` (nested) | 1.2 GB | should be a sibling repo, not nested |
| ↳ `sheets_dump_live.json` | 2.2 MB | dev snapshot; out of date |
| ↳ source code (api+services+training+scripts+data+docs) | ~5 MB | fine |
| `hf-space/dl-space/` total | **1.2 GB** | over budget by 200 MB |
| ↳ `models/` | 1.2 GB | see below |

### dl-space/models bloat

| File | Size | Verdict |
|---|---|---|
| `severity_v2.onnx.data` + `.onnx` | **256 MB** | KEEP — current model |
| `severity.onnx.data` + `.onnx` | **205 MB** | DELETE — superseded by v2 |
| `multi_task_transformer.pt` | **253 MB** | DELETE — PyTorch checkpoint; only ONNX runs in prod |
| `multi_task_transformer.onnx.data` + `.onnx` | **253 MB** | KEEP (or replace with INT8 in Task 5) |
| `sentence_encoder.onnx.data` + `.onnx` | **87 MB** | DELETE — FP32 superseded by INT8 |
| `sentence_encoder_int8.onnx` | **22 MB** | KEEP |
| `.cache/.../*.incomplete` | **183 MB** | DELETE — HuggingFace download cruft |
| `similarity_index.pkl` | 1.6 MB | KEEP |
| `tokenizer/`, `classifiers/`, manifests | ~3 MB | KEEP |
| `regression.onnx` + `regression_target_encodings.json` | 444 KB | DELETE — resolution-time model dropped per stakeholder decision |

After cleanup: dl-space/models drops to **~535 MB**, total dl-space **~545 MB** — under 1 GB ✓

## Architecture: the layering is wrong

The spec says hf-space = orchestrator (no weights), dl-space = model hub. Reality:

- `hf-space/api/main.py` exposes **70 routes** and imports torch/transformers/onnxruntime directly — it loads and runs models in-process. Env flag `DL_REMOTE_ONLY` exists but is opt-in (default off).
- `hf-space/services/data_fetcher.py` reads Google Sheets directly (`GOOGLE_SHEET_ID` env var) — hf-space owns data fetch too.
- `dl-space/api/routes.py` exposes **21 routes** for ML primitives (`/classify`, `/nlp/severity`, `/nlp/ner`, `/regression/predict`, etc.) — clean inference surface.
- hf-space barely calls dl-space. The two are siblings on paper, but hf-space is also a full ML server today.

That's the root cause of the 1.5 GB venv + 1.2 GB model dir living together: **hf-space is doing both jobs**.

## Requirements duplication and waste

### hf-space/requirements.txt — anti-laziness

`torch==2.1.1`, `transformers==4.35.2`, `datasets==2.16.1`, `accelerate==0.25.0`, `xgboost`, `lightgbm`, `matplotlib`, `scipy`, `scikit-learn`. For an orchestrator. None of these belong here. Combined wheel weight: ~1.5 GB installed.

**Lazy fix for hf-space:** `fastapi`, `uvicorn`, `httpx`, `orjson`, `pydantic`, `google-api-python-client`, `google-auth`, `pandas` (only if data shaping stays here — preferably push to dl-space), `numpy`. That's it. Install footprint: ~80 MB.

### dl-space/requirements.txt

Has both `flax==0.8.2` (JAX) AND `torch==2.1.1` AND `onnxruntime`. Pick one runtime. Production is ONNX → drop torch (export-time only, in dev requirements) and drop flax (not used in any service file).

**Lazy fix for dl-space:** `onnxruntime`, `transformers` (for tokenizer only — or replace with `tokenizers` standalone, 5 MB vs 200 MB), `fastapi`, `uvicorn`, `numpy`, `scikit-learn`, `pydantic`. Drop torch + flax. Install footprint: ~150 MB.

## Routes: duplication + dead ends

`hf-space/api/main.py` 70 routes — far too many. Spot inspection:

- `/api/ai/analyze`, `/api/ai/analyze-all`, `/api/ai/predict-single` — three flavours of the same op.
- `/api/ai/risk/{summary,airlines,branches,hubs,routes,categories}` + path-param variants — many of these can be one parameterized route.
- `/api/ai/train`, `/api/ai/train/status` — **training endpoints on a prod inference service.** Delete. Training belongs offline.
- `/api/ai/cache/{invalidate,status}` — OK but cache-as-API is odd; usually internal.
- `/api/ai/sheets/debug` — debug endpoint shipped to prod. Delete.

`dl-space/api/routes.py` 21 routes — cleaner, but `/nlp/multitask`, `/nlp/severity`, `/nlp/subcategory`, `/nlp/root-cause` overlap with `/classify`. Pick one entry point per model head.

## Hallucination & schema-drift root causes (ties back to Task 1)

- `hf-space/api/main.py` services return loosely-typed dicts; Pydantic `response_model` only on `/analyze` and `/analyze-all`. Other routes return whatever the underlying service produces. **This is exactly what feeds the frontend's `findValue`/`findList` hallucination pipe** ([Task 1 C1](AUDIT_REPORT.md)).
- No request-side Pydantic on most routes either — clients can send anything.
- Severity labels are produced freeform from the classifier — no canonical-enum guard before returning. The frontend `LEVEL_STYLE` mismatch ([Task 1 C7](AUDIT_REPORT.md)) is the downstream symptom.

## Security smells (out of scope but worth flagging)

- `dl-space/api/auth.py` uses `verify_token` on every route — good. hf-space has **no auth** on its 70 routes. The frontend talks to hf-space, so it's not internet-facing if behind a proxy, but the `/api/ai/sheets/debug` + `/api/ai/train` endpoints + raw Sheet ID env exposure is a posture concern.
- `esklasi_regex` URL param ([Task 1 M11](AUDIT_REPORT.md)) is accepted by several routes without sanitization.

## Inter-space communication

Currently almost none. hf-space has one `DL_REMOTE_ONLY` flag and one `REGRESSION_USE_ONNX` flag. There is no httpx client wrapping dl-space calls, no retry, no circuit-breaker, no schema for the wire format.

**Lazy correct shape:** one `services/dl_client.py` in hf-space with typed methods per dl-space route, `httpx.AsyncClient` with 2.5 s timeout, 1 retry with jitter, Pydantic models for request + response. ~150 lines total.

## Audit verdict per spec criterion

| Criterion | Verdict |
|---|---|
| hf-space ≤ 1 GB | ❌ 2.7 GB → fixable: delete .git+venvs+nested dl-space = ~30 MB |
| dl-space ≤ 1 GB | ❌ 1.2 GB → fixable: model dedup = ~545 MB |
| No dead code | ❌ duplicate routes, train endpoints in prod, debug endpoints |
| Clean inter-space contract | ❌ no httpx client, no Pydantic on wire |
| No hallucination surface | ❌ untyped responses on 60+ routes |
| Models quantized / ONNX | ⚠️ partial — INT8 sentence_encoder exists; severity + multitask are FP32 ONNX with external `.data` files |

## Task 4 cleanup plan (next turn)

1. Delete `hf-space/.venv/`, `hf-space/retrain-env/` (574 MB).
2. Delete `hf-space/sheets_dump_live.json` (dev snapshot).
3. Delete dl-space duplicate / superseded model files (~648 MB).
4. Delete `hf-space/.git/` and re-init clean (frees 958 MB). **Confirm before nuking** — losing git history is hard to undo.
5. Move nested `hf-space/dl-space/` out to sibling `/Volumes/Backup/ai-model/dl-space/` so the two Spaces are independent repos. **Confirm before moving.**
6. Update `.gitignore` to exclude venvs, caches, model .data files (use HF LFS or remote storage if >100 MB).
7. Trim hf-space requirements.txt (drop torch/transformers/datasets/accelerate/xgboost/matplotlib).
8. Trim dl-space requirements.txt (drop flax/torch; keep onnxruntime).

After steps 1–3: hf-space ≈ 1.2 GB (nested dl-space dominates).
After step 5: hf-space ≈ 30 MB. dl-space ≈ 545 MB. Both under budget.

→ skipped: rewriting hf-space main.py route by route. That belongs to Task 5 (where we replace 70 routes with ~6 well-typed ones).
