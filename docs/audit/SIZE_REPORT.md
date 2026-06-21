# Task 4 — Cleanup Size Report

| Space (as separate HF repo) | Before | After | Budget | Status |
|---|---|---|---|---|
| `hf-space` (without nested `dl-space/`, gitignored) | 2.7 GB | **1.1 MB** | 1 GB | ✅ |
| `dl-space` | 1.2 GB | **537 MB** | 1 GB | ✅ |

## What was deleted

**hf-space root:**
- `.git/` (958 MB) — fresh `git init -b main` per stakeholder OK
- `.venv/` (305 MB), `retrain-env/` (269 MB) — local Python venvs
- `.ruff_cache/`, `.pytest_cache/`, `__pycache__/` recursive
- `sheets_dump_live.json` (2.2 MB) — stale dev snapshot

**dl-space/models:**
- `severity.onnx` + `severity.onnx.data` (205 MB) — superseded by `severity_v2`
- `multi_task_transformer.pt` (253 MB) — PyTorch checkpoint; only ONNX ships
- `sentence_encoder.onnx` + `sentence_encoder.onnx.data` (87 MB) — FP32; INT8 kept
- `.cache/` (183 MB) — HuggingFace download cruft
- `regression.onnx` + `regression_target_encodings.json` (444 KB) — resolution-time model dropped per stakeholder decision

## What was preserved

**dl-space/models (537 MB):**
- `severity_v2.onnx` + `.data` (256 MB) — current severity classifier
- `multi_task_transformer.onnx` + `.data` (253 MB) — multi-head classifier (will be re-quantized to INT8 in Task 5; target ~70 MB)
- `sentence_encoder_int8.onnx` (22 MB) — multilingual embedding model
- `similarity_index.pkl` (1.6 MB), `tokenizer/`, `classifiers/`, `manifest.json` — runtime metadata

## Wiring changes

- Both spaces now have independent `git init` and will push to separate HF Space repos.
- `hf-space/.gitignore` now excludes `dl-space/`, `retrain-env/`, and all `*.onnx*` / `*.pt` / `*.pkl` artifacts — local nested layout preserved per stakeholder decision but the nested dir is invisible to hf-space's git.
- `hf-space/dl-space/.gitattributes` configured for git-LFS on `*.onnx`, `*.onnx.data`, `*.pt`, `*.pkl` — required for HF Space push (>10 MB files).

## What is NOT done in Task 4 (deferred to Task 5)

- `requirements.txt` trimming: hf-space still lists `torch`, `transformers`, `datasets`, `accelerate`, `xgboost`, `matplotlib`. These don't belong in an orchestrator. Trimming now would break `api/main.py` which currently imports them. Task 5 rewrites the code in lockstep with deps.
- Route consolidation: hf-space's 70 routes collapse to ~6 typed endpoints in Task 5.
- INT8 quantization of `multi_task_transformer.onnx.data` (253 MB → ~70 MB target).

→ skipped: `git add` / first commit. Add when Task 5 lands the new orchestrator code, so the first commit reflects the final architecture, not the half-cleaned mid-state.
