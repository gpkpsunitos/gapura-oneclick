# Task 6 — Deploy commands

**Prereq:** rotated HF write token from https://huggingface.co/settings/tokens.
Export it once per shell:

```bash
export HF_TOKEN=hf_NEWTOKEN_HERE
huggingface-cli login --token "$HF_TOKEN" --add-to-git-credential
```

Repos (set once for convenience):

```bash
export HF_USER=gapura-dev
export HF_MODEL_REPO=$HF_USER/gapura-deep-learning   # model weights
export HF_DL_SPACE=$HF_USER/gapura-deep-learning      # Space
export HF_HF_SPACE=$HF_USER/gapura-ai                 # Space (orchestrator)
```

## Step 1 — Push current model artifacts to the Model repo

The Space code bootstraps weights from this repo. Without this step, dl-space
boots with empty `./models` and most endpoints 503.

```bash
cd /Volumes/Backup/ai-model/hf-space/dl-space
python scripts/upload_models_to_hub.py \
  --repo_id "$HF_MODEL_REPO" \
  --source_dir ./models \
  --commit_message "initial upload (severity_v2 + multitask + encoder_int8 + similarity)"
```

Expect ~10 min upload (537 MB total, mostly the two .onnx.data files).

## Step 2 — Push dl-space code to the dl-space Space

```bash
cd /Volumes/Backup/ai-model/hf-space/dl-space
git remote add hf "https://oauth2:$HF_TOKEN@huggingface.co/spaces/$HF_DL_SPACE"
git add .
git commit -m "deploy: predictive routes + Hub-backed model loading"
git push hf main
```

Watch the build at:
https://huggingface.co/spaces/gapura-dev/gapura-deep-learning?logs=build

## Step 3 — Set Space secrets for dl-space

UI: https://huggingface.co/spaces/gapura-dev/gapura-deep-learning/settings

Add as **Secrets** (not Variables):

| Name | Value |
|---|---|
| `HF_TOKEN` | your new token (so the Space can `snapshot_download`) |
| `HF_MODEL_REPO` | `gapura-dev/gapura-deep-learning` |
| `DL_SPACE_TOKEN` | a long random string, e.g. `python -c "import secrets;print(secrets.token_urlsafe(32))"` — this is what hf-space sends as Bearer auth |
| `GOOGLE_SHEET_ID` | `1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | full JSON of `gapura-487706-1dfda20b9184.json`, single line |

After setting, Space → Settings → "Factory reboot" once so the secrets take.

## Step 4 — Push hf-space code to the hf-space Space

**WARNING:** the legacy 70-route `api/main.py` still imports torch / transformers
/ models. Those packages aren't in `requirements-orchestrator.txt` — so a
straight push will fail to build. Two options:

### 4a. Lean push (orchestrator only, Task 1 audit fixes applied)

```bash
cd /Volumes/Backup/ai-model/hf-space
cp requirements-orchestrator.txt requirements.txt
# Move legacy main.py aside so the new orchestrator is the entrypoint.
# The new orchestrator-only main is in api/insight_orchestrator.py;
# need a slim main.py that mounts it. Quick replacement:
cat > api/main.py <<'PY'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.insight_orchestrator import router as insight_router

app = FastAPI(title="Gapura AI (orchestrator)", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(insight_router)

@app.get("/")
def root(): return {"status": "ok", "version": "2.0.0"}
@app.get("/health")
def health(): return {"status": "ok"}
PY
git init -b main 2>/dev/null || true
git add .
git commit -m "deploy: lean orchestrator (Task 1 audit fixes)"
git remote add hf "https://oauth2:$HF_TOKEN@huggingface.co/spaces/$HF_HF_SPACE" 2>/dev/null
git push hf main --force   # first push — overwrites legacy
```

### 4b. Keep the legacy fat hf-space alive temporarily

If the frontend still calls legacy endpoints (`/api/ai/risk/summary` etc.),
don't push 4a yet. Skip this Space until Task 7 finishes the UI rewrite.

## Step 5 — Set Space secrets for hf-space

UI: https://huggingface.co/spaces/gapura-dev/gapura-ai/settings

| Name | Value |
|---|---|
| `DL_SPACE_URL` | `https://gapura-dev-gapura-deep-learning.hf.space` |
| `DL_SPACE_TOKEN` | **same** value as in step 3 |
| `GOOGLE_SHEET_ID` | same as above |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | same as above |

Factory reboot.

## Step 6 — Verify

```bash
# dl-space alive?
curl -s https://gapura-dev-gapura-deep-learning.hf.space/ | jq .

# predictive routes ready?
curl -s -H "Authorization: Bearer $DL_SPACE_TOKEN" \
  https://gapura-dev-gapura-deep-learning.hf.space/predictive/health | jq .

# end-to-end insight call via hf-space:
curl -s -X POST https://gapura-dev-gapura-ai.hf.space/api/ai/insight/case \
  -H "Content-Type: application/json" \
  -d '{"report_text":"Delay loading cargo","hub":"HUB 1","area":"Apron Area"}' | jq .
```

Expect `headline.signal`, `severity_predicted`, `forecast`, `rca_top_drivers`
fields populated (or `warnings` explaining what was missing).

## Step 7 — Wire GitHub Actions for weekly retrain

Already-built workflow: `dl-space/.github/workflows/retrain.yml`.

```bash
# Create a GitHub repo for dl-space (private OK):
gh repo create gpkpsunitos/gapura-dl-space --private --source=. --remote=github
cd /Volumes/Backup/ai-model/hf-space/dl-space
git remote add github "git@github.com:gpkpsunitos/gapura-dl-space.git"
git push github main
```

Then on GitHub repo → Settings → Secrets and variables → Actions, set:

| Type | Name | Value |
|---|---|---|
| Secret | `GOOGLE_SHEET_ID` | as above |
| Secret | `GOOGLE_SERVICE_ACCOUNT_JSON` | as above |
| Secret | `HF_TOKEN` | as above |
| Variable | `HF_MODEL_REPO` | `gapura-dev/gapura-deep-learning` |
| Variable | `HF_SPACE_REPO` | `gapura-dev/gapura-deep-learning` |

Test: Actions tab → "retrain-dl-models" → Run workflow → main → Run.

## Troubleshooting

- **dl-space build fails on `huggingface_hub` import:** confirm `requirements-lean.txt` is the requirements.txt that ships (not the original `requirements.txt`). Quick fix: `cp requirements-lean.txt requirements.txt && git commit -am 'lean deps' && git push hf main`.
- **`snapshot_download` 401:** `HF_TOKEN` secret not set on the Space, or token doesn't have read access to the (private?) Model repo. If Model repo is private, the token MUST be a write or read token of that account.
- **dl-space boots with empty `./models`:** Step 1 wasn't run, or Hub repo is empty. `huggingface-cli upload "$HF_MODEL_REPO" ./models` directly.
- **hf-space 502 on `/api/ai/insight/case`:** Space couldn't reach dl-space. Check `DL_SPACE_URL` env var matches the literal dl-space hostname. HF subdomain pattern is `<owner>-<spacename>.hf.space` (lowercase, hyphens).
- **CORS errors from gapura-irrs2 frontend:** add the production dashboard origin to the CORS allowlist in the hf-space `main.py` (currently `allow_origins=["*"]` — fine).
