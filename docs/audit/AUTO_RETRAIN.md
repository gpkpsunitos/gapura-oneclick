# Auto-retrain pipeline

```
                          weekly cron (Sun 02:00 UTC)
                                       │
              ┌────────────────────────▼────────────────────────┐
              │           GitHub Actions runner                  │
              │  .github/workflows/retrain.yml                   │
              │                                                  │
              │  ┌─────────────────────────────────────────┐     │
              │  │ scripts/retrain_all.py                   │     │
              │  │  1. dump live Google Sheet → JSON        │     │
              │  │  2. train_rca.py (LightGBM + SHAP)       │     │
              │  │  3. backtest_forecast.py (PASS/FAIL log) │     │
              │  │  4. quantize_models.py (ONNX → INT8)     │     │
              │  │  5. build_similarity_index.py            │     │
              │  │  6. write build_manifest.json            │     │
              │  └────────────────┬────────────────────────┘     │
              └───────────────────┼────────────────────────────────┘
                                  │ upload_folder()
                                  ▼
                  ┌──────────────────────────────┐
                  │  HF Models repo               │
                  │  gapura-dev/gapura-deep-      │
                  │  learning                     │
                  │  • severity_v2.onnx + .data   │
                  │  • multi_task_transformer*    │
                  │  • sentence_encoder_int8.onnx │
                  │  • rca_lgbm.joblib            │
                  │  • rca_meta.json              │
                  │  • similarity_index.pkl       │
                  │  • build_manifest.json        │
                  └──────────────┬───────────────┘
                                 │ restart_space(HF_SPACE_REPO)
                                 ▼
                  ┌──────────────────────────────┐
                  │  HF Space: dl-space           │
                  │  (boots → model_bootstrap.py  │
                  │   → snapshot_download)        │
                  │  serves /predictive/* etc     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  HF Space: hf-space           │
                  │  orchestrator                 │
                  │  /api/ai/insight/case         │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                       gapura-irrs2 Next.js
                       dashboard/op
```

## Secrets to set on GitHub (Settings → Secrets and variables → Actions)

| Type | Name | Value |
|---|---|---|
| Secret | `GOOGLE_SHEET_ID` | `1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8` |
| Secret | `GOOGLE_SERVICE_ACCOUNT_JSON` | full JSON of the service-account key (single line, paste the contents of the `gapura-487706-*.json` file) |
| Secret | `HF_TOKEN` | HF write token (Settings → Access Tokens → new token, role=write) |
| Variable | `HF_MODEL_REPO` | `gapura-dev/gapura-deep-learning` (or your repo name) |
| Variable | `HF_SPACE_REPO` | `gapura-dev/gapura-dl-space` (or your Space name) |
| Variable | `DL_SPACE_REPO_FULL` *(optional)* | full `owner/repo` of the dl-space code if you've split it out from gapura-irrs2 |

If `HF_SPACE_REPO` is unset, the workflow skips the Space restart — Space still picks up new models on its next manual restart.

## How dl-space loads models

`dl-space/app/main.py` calls `fetch_models()` at module import. That runs
`huggingface_hub.snapshot_download(repo_id=HF_MODEL_REPO, local_dir=./models)`.
If the download fails (network, missing token), it falls back to whatever is
already in `./models`. Logs the choice.

Manual reload without redeploy:

```
POST /admin/reload   # re-fetches from Hub, reinstantiates DLService
```

## Triggers other than weekly cron

- **Manual:** Actions tab → "retrain-dl-models" → Run workflow.
- **On every push** to `main`: add to `retrain.yml`:
  ```yaml
  on:
    push:
      branches: [main]
      paths: ['dl-space/services/**', 'dl-space/scripts/**']
  ```
- **On Sheet edit:** Google Sheets → Extensions → Apps Script → `UrlFetchApp.fetch('https://api.github.com/repos/USER/REPO/actions/workflows/retrain.yml/dispatches', ...)`. Worth it only if "every edit" actually means weekly-ish; otherwise CI minutes burn. **Recommended: keep weekly cron + the manual button. Add edit-triggered only when stakeholders say weekly is too slow.**

## Why this architecture

- **HF Models repo holds weights** (where they belong; designed for big binaries; git-LFS handled for you).
- **HF Spaces holds code only** (each Space stays under 100 MB → fast cold starts).
- **GitHub Actions runs training** (free CPU minutes; no Space CPU spent on training).
- **No MLflow / no DVC.** The model repo commit IS the version. Git SHA + timestamp in `build_manifest.json` IS the lineage.

## What this does NOT do

- No accuracy gate that aborts the upload. If retrained F1 drops, it still ships. To add: edit `retrain_all.py` → after `train()`, parse the CV F1 and `sys.exit(1)` if below a threshold. Trade-off: aggressive gates mean staler models when data wobbles.
- No A/B between old and new model. To add: upload to `models-staging/` first, swap via `HF_MODEL_REPO` env var when validated.
- No on-call alerts on failed runs. GitHub Actions emails the workflow owner by default.

→ skipped: Sheet-edit trigger, accuracy gate, staged rollout. Add when weekly cron proves insufficient or a regression slips through.
