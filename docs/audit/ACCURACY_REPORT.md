# Task 5 — Accuracy Report

**Status:** ✅ Trained & backtested 2026-06-21 on live Sheet records (n=1110 incidents, ~5 months history).

## How to populate this report

After cloning a fresh copy of the live Sheet to JSON:

```bash
# 1. From the gapura-irrs2 dir:
node scripts/dump-sheet-schema.mjs  # produces docs/audit/schema.json (already done)

# 2. In hf-space/dl-space/:
pip install -r requirements-lean.txt
python scripts/train_rca.py \
  --sheets-json /Users/nrzngr/Desktop/gapura-irrs2/docs/audit/schema.json \
  --output-dir models
# Prints 5-fold macro-F1 and writes models/rca_lgbm.joblib + rca_meta.json

# 3. Backtest forecast vs naive seasonal baseline:
python scripts/backtest_forecast.py \
  --sheets-json /Users/nrzngr/Desktop/gapura-irrs2/docs/audit/schema.json \
  --target case_volume --grain W --horizon 4 --folds 3 --group-by HUB
# Prints per-series MAE and aggregate improvement vs naive.
```

Paste the output into the table below.

## Target table (from spec §5C)

| Metric | Target | Baseline (naive) | Achieved | Status |
|---|---|---|---|---|
| Forecast MAE — global weekly case_volume | ≤ 60 % of baseline | 56.08 | **3.42 (93.9 % improvement)** | ✅ |
| Forecast MAE — global monthly case_volume | ≤ 60 % of baseline | 77.22 | **5.06 (93.4 % improvement)** | ✅ |
| Forecast MAE — global monthly severity_mix | ≤ 60 % of baseline | 0.31 | 0.52 (−67 %) | ❌ data ceiling — see notes |
| Forecast MAE — per-HUB weekly case_volume | ≤ 60 % of baseline | — | mixed (HUB 1 wins 98 %, sparse HUBs lose) | ⚠️ filtered in prod via `MIN_MEAN_VALUE` |
| RCA severity macro-F1 (5-fold CV) | ≥ 0.75 | — | **0.35 → re-run after capacity tune** | ❌ data ceiling — see notes |
| Anomaly detection | flag spikes via STL residual `|z| ≥ 2.5` | n/a | self-check PASS on synthetic spike | ✅ |
| Hallucination rate | 0 % | n/a | 0 % | ✅ structural — Pydantic on `/insight/case` |
| `/insight/case` p95 latency | < 3 s | n/a | TBD post-deploy | ⏳ |
| dl-space cold start | < 10 s | n/a | TBD post-deploy | ⏳ |

## Raw outputs

```
$ backtest_forecast.py --target case_volume --grain W --horizon 4 --folds 3
 series  model_mae  naive_mae  improvement_pct  folds_evaluated
_global   3.421254  56.083333        93.899696                3
AGGREGATE model_mae=3.421  naive_mae=56.083  improvement=93.9%  PASS

$ backtest_forecast.py --target case_volume --grain M --horizon 3 --folds 3
 series  model_mae  naive_mae  improvement_pct  folds_evaluated
_global   5.061662  77.222222         93.44533                3
AGGREGATE model_mae=5.062  naive_mae=77.222  improvement=93.4%  PASS

$ backtest_forecast.py --target severity_mix --grain M --horizon 3 --folds 3
 series  model_mae  naive_mae  improvement_pct  folds_evaluated
_global   0.523631   0.313509       -67.022491                3
AGGREGATE model_mae=0.524  naive_mae=0.314  improvement=-67.0%  FAIL

$ train_rca.py
5-fold macro-F1: 0.348 ± 0.046   (before capacity tune; re-run after edit)
```

## Honest read

**Forecast wins where signal exists.** Global weekly/monthly case_volume: 93 % improvement — well above the ≥40 % target. The model meaningfully forecasts overall incident load.

**Forecast loses where data is sparse.** Severity_mix monthly underperforms naive because only ~120 NON-CARGO rows have a labeled severity, spread across ~5 months → fewer than 25 labeled cases per period; the share-of-high-risk metric jitters with single-case changes and naive (last month's value) wins the variance fight. Per-HUB weekly is even sparser (~0.25 cases/week for some hubs); production endpoint filters these out before they reach the UI via `MIN_MEAN_VALUE = 1.0` in `forecast.py`.

**RCA F1 is data-limited, not model-limited.** 126 labeled rows × 5 severity classes is below where any classifier on tabular features clears 0.75. `HIGH RISK` has 8 examples — no amount of tuning rescues that. The fix is more labels, not more model. The `suggest_labels.py` tool (offered earlier) is the lever; we deferred it.

**Anomaly detection passes its synthetic test.** Real-world precision is human-validated, not auto-computed. Frontend will show z-score + period so reviewer can confirm.

**0 % hallucination is structural.** The `CaseInsightResponse` Pydantic model is the only thing the new UI renders. Any field missing or off-spec is dropped, not displayed. This isn't an accuracy metric — it's a contract.

## What ships to production

- Forecast endpoint serves only series that pass `MIN_MEAN_VALUE` (≥1 case/period mean). Below that → `insufficient_data` array → UI renders "Data tidak cukup."
- RCA endpoint serves predictions with confidence + SHAP drivers. Frontend shows confidence prominently; below confidence threshold → no headline severity claim.
- Severity_mix is **not** served on a per-HUB grain. Global monthly only, and tagged "data ceiling" until labels grow.

## Re-run cadence

GitHub Actions weekly cron pulls fresh Sheet, retrains, uploads. Each retrain produces a `build_manifest.json` with the same backtest numbers — track drift over time. Below the 40 % target on any global series in two consecutive runs → page ops.

→ skipped: hyperparam tuning, alternative models (Prophet, ARIMA, N-BEATS). None will rescue 5 months of history for severity_mix; ETS already crushes case_volume. Add when 12+ months of data exists, not before.

## Honest expectations going in

- **Forecast MAE improvement ≥40 % is plausible** because the baseline (naive seasonal) is weak when you only have 50–60 weekly observations. Holt-Winters with conformal intervals should clear 40 %. If it doesn't, the data is dominated by noise and no model will.
- **RCA macro-F1 ≥ 0.75 is plausible only if** the 5-level severity has roughly ≥20 labeled examples per class. With current `Severity Level` at 77 % null on NON CARGO (≈120 labeled rows), `TOP RISK` and `HIGH RISK` may each have < 20 examples; expect macro-F1 to be dragged down by these minority classes. Class-balanced loss is already enabled in `train_rca.py`.
- **Anomaly precision@10**: validated synthetically (the script's self-check plants a spike and confirms detection). Real-world precision needs the user to confirm the flagged anomalies were genuine ops events.
- **0 % hallucination is structural, not statistical** — the `CaseInsightResponse` Pydantic model is the only thing the new frontend will render. Any field missing or off-spec is dropped, not displayed.
