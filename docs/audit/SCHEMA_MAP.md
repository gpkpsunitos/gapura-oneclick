# Task 2 — Live Google Sheets Schema Map

**Source of truth.** Dumped 2026-06-21 via [scripts/dump-sheet-schema.mjs](scripts/dump-sheet-schema.mjs) using `.env` credentials. Full machine-readable copy: [docs/audit/schema.json](docs/audit/schema.json).

## Inventory

| Env var | Sheet title | Tabs | Total rows (profiled) | Useful for ML? |
|---|---|---|---|---|
| `GOOGLE_SHEET_ID` (IRRS_MAIN) | *Acc Data 2 - Irregularity Report - Manual for Dashboard* | NON CARGO (51 cols), CGO (41 cols) | **1110** (533+577) | yes — primary |
| `JOUMPA_SHEET_ID` | *IRRS Joumpa Service (Jawaban)* | Form Responses 1 (45 cols) | 45 | no — too small |
| `SLA_FULL_SERVICE_SHEET_ID` | *Data SLA Full Service Airline (Baru)* | Sheet1, AVSEC, Bag Handling, DEBRIEFING (4–6 cols each) | 67 total | no — too small |
| `WSN_SHEET_ID` | *Index Dashboard* | WSN (173), Weekly Service Notice (12), Quick Win (35, headers only) | 220 | reference only |
| `HC_SHEETS` | *OneClick HC Backup* | 4 tabs, mostly empty | 3 records total | no |

Only **IRRS_MAIN** has the volume to support modelling. Everything else is reference / lookup / form-collection. Treat them as joinable context, not training data.

## IRRS_MAIN — the real schema

Both tabs share most column names but **the schemas are not identical** (NON CARGO has 51 cols, CGO has 41 cols, ~70% overlap by name; column *indices* differ). Treat them as two related tables. Schema drift evidence: `Case Classification` (NON CARGO col 19) absent from CGO; `Category Case Cargo (CGO)` only meaningful in CGO; trailing `Column 51` on NON CARGO is debris.

### Signal columns (use these)

| Field | NON CARGO | CGO | Type | Cardinality | Null rate | Notes |
|---|---|---|---|---|---|---|
| `Date of Event` | col 0 | col 0 | **formatted string** ("January 25, 2025") | 279 / 126 dates | 0 | Needs parsing. Coverage looks like Jan 2025 → present, ~2 incidents/day. |
| `Jenis Maskapai` | 2 | 2 | enum | 5–6 | 0 | MPA / Garuda / Citilink / Pelita Air / Non Airline Case |
| `Airlines` | 3 | 3 | string | 40 / 26 | 0 | Free text — needs normalization (`#N/A ()` shows up in CGO). |
| `Flight Number` | 4 | 4 | string | 347 / 109 | 0 | High cardinality; not a feature on its own. |
| `Station` | 6 | 6 | enum (airport code) | 28 / 9 | 0 | CGK, DPS, KNO, etc. |
| `HUB` | 7 | 7 | enum | 5 | 0 | "HUB 1 CGK" vs "HUB 1" — inconsistent formatting NON vs CGO. |
| `Route` | 8 | 8 | string | 279 / 137 | 0 | High cardinality. |
| `Report Category` | 10 | 10 | enum | 5 / 3 | 0 | Irregularity / Complaint / Compliment / Occurrence / Accident-Incident |
| `Area` | 11 | 11 | enum | 4 | 0 | Terminal / Apron / General / GSE (NON) or Cargo (CGO) |
| `Report` | 12 | 12 | free text (mixed ID/EN) | ≈unique per row | 0 | NLP target. |
| `Root Caused` | 13 | 13 | free text | ≈unique | 0–0.4% | NLP target / RCA. |
| `Action Taken` | 14 | 14 | free text | high | 0–0.2% | Action recommender target. |
| `Severity Level` | 41 | 33 | **dirty enum** | 5 / 2 | **0.773 / 0.991** | See ⚠️ below. |
| `Status` | 42 | 34 | enum | 2 | 0 | OPEN / CLOSED — only outcome signal. |
| `KODE CABANG` (VLOOKUP) | 45 | 36 | string | 38 / 43 | 0.929 / 0.925 | Formula coverage broken — don't rely on. |
| `KODE HUB` (VLOOKUP) | 46 | 37 | enum | 5 / 6 | 0.929 / 0.925 | Same. |
| `MASKAPAI` (VLOOKUP) | 47 | 38 | string | 35 / 32 | 0.931 / 0.943 | Same. |

### Category breakdown columns (sparse, branched by Area)

| Field | NON null-rate | CGO null-rate | Use |
|---|---|---|---|
| `Terminal Area Category` | 0.469 | 0.993 | Only populated when Area=Terminal Area |
| `Apron Area Category` | 0.698 | 0.019 | Populated when Area=Apron Area (CGO uses it heavily) |
| `General Category` | 0.861 | 0.998 | NON only |
| `Case Classification` | 0.797 | empty | NON only |
| `Identification of Root` | 0.809 | 0.993 | Sparse RCA tag |
| `Category Case Cargo (CGO)` | 0.998 | 0.993 | CGO only — also 99% null on its own tab (likely fillable but unused) |

These are **target labels for the classifier**, not features. Use them only for training root-cause/category models, not as inputs.

### Dead / near-dead columns (drop from feature space)

NON CARGO: cols 5 (`Case CGO`), 21–25 (GSE detail), 26–38 (Joumpa/Corporate/Non-Corp/Pax/Bag/Admin), 49 (User ID), 50 (`Column 51`) — all 100% null.
CGO: cols 19, 21, 23–29, 35, 40 — all 100% null.

Treat these as schema-residue from a merged form template. Don't feature-engineer them.

## ⚠️ Reality checks that override the spec

1. **No `Date_Closed` / `Resolved_At` column anywhere.** The existing "predict resolution days" regression model in `dl-space` has no actual learning target on this Sheet. Either:
   - Resolution timestamps live somewhere outside this workbook (ask), or
   - The model has been trained on synthetic / proxy data and is hallucinating its core target.
   - **Action:** Confirm before keeping any "predicted resolution time" UI. The Task 1 audit (C5) already flagged this; the schema confirms it.

2. **Severity Level is 77% null on NON CARGO, 99% null on CGO.** The "Risk Intelligence" card and severity-based forecasting rest on ~120 labeled NON CARGO rows + ~5 CGO rows.
   - "MEDIUM / LOW / HIGH / HIGH RISK / TOP RISK" — 5 levels, but UI maps to "Critical / High / Medium / Low" (`RiskSummaryCard.tsx:43`). **Labels do not match.** `TOP RISK` ≠ `Critical`. `HIGH RISK` ≠ `High`. Unmapped values fall to "Low" styling. This is a current bug.
   - **Action:** ETL must rationalize {`MEDIUM`, `LOW`, `HIGH`, `HIGH RISK`, `TOP RISK`} → 4 canonical levels with an audit log. The frontend's hardcoded `LEVEL_STYLE` keys must come from a shared enum, not be redefined.

3. **Volume is too small for deep learning.** 1110 incident rows aggregated to monthly = ~6 months × ~2 series = 12–24 points per series for forecasting. Aggregated weekly = 50–60 points. The spec asks for "N-BEATS / TFT / PatchTST (ONNX-exported, INT8 quantized)." That is malpractice on this data.
   - **Honest model ceiling:** Prophet / STL+ETS / LightGBM (with monotone + categorical features) for case-volume and severity-mix forecasts. Ensemble only if a single model loses by >5%. Conformal intervals are still appropriate.
   - Per-case targets (severity classification, root-cause tagging, action recommendation) are tabular classification problems where LightGBM + a small distilled sentence encoder for the text columns is the right answer. No N-BEATS, no TFT.

4. **Bilingual free text.** `Report`, `Root Caused`, `Action Taken` mix Bahasa Indonesia and English freely within the same column (often in the same row). NLP needs a multilingual encoder — `intfloat/multilingual-e5-small` (118MB, INT8 → ~30MB) is the lazy-and-correct fit. Anything monolingual will silently drop half the signal.

5. **Schema drift is real and ongoing.** The two tabs in the same workbook already disagree on column index and presence. Any frontend code that addresses columns by index (vs by header name) will break next time someone reorders. **All downstream code must address columns by name.**

6. **VLOOKUP columns are 92–94% null.** `KODE CABANG / KODE HUB / MASKAPAI (VLOOKUP)` look like recently-added formulas that haven't been backfilled across the history. Don't use them as join keys. Use `Station` + `HUB` + `Airlines` (raw) — those are 0% null.

## Feature/target plan (drives Task 5)

**Time-series forecast targets** (monthly + weekly grain):
- Total cases / week (per HUB, per Airline, per Report Category, per Area)
- Severity-mix proportions (where labeled)
- Open-case backlog (Status=OPEN count rolling)

**Per-case classification targets:**
- `Severity Level` (4-class, canonicalized) — train only on labeled 23% of NON CARGO
- `Terminal Area Category` / `Apron Area Category` / `General Category` (conditional on `Area`)
- `Identification of Root` (sparse multi-class)

**Action recommendation target:**
- `Action Taken` clustering → top-k similar resolved cases (retrieval, not generation)

**Features available:**
- Time: month, week, day-of-week, holiday flag (ID national + airline-cluster effects)
- Categorical: HUB, Station, Airlines, Jenis Maskapai, Report Category, Area
- Text embeddings: `Report` + `Root Caused` via multilingual-e5-small
- Rolling: 7d/30d incident count per HUB×Category, 30d severity mix

## Decisions (locked in by stakeholder, 2026-06-21)

- **Resolution-time model: DROP.** No `Date_Closed` source exists; do not fabricate one. Task 4 removes the regression endpoint from `dl-space`. Task 7 removes the "Predicted Resolution Time" card from the UI. Replace with **open-backlog forecast** (rolling count of `Status=OPEN`).
- **Severity canonical = 5 levels, identity mapping.** Keep `TOP RISK`, `HIGH RISK`, `HIGH`, `MEDIUM`, `LOW` as distinct. Frontend `LEVEL_STYLE` will be rebuilt against this enum (current 4-level mapping in [RiskSummaryCard.tsx:43](components/dashboard/ai-summary/RiskSummaryCard.tsx:43) is the bug). Suggested color order: TOP RISK = deep red, HIGH RISK = red, HIGH = orange, MEDIUM = amber, LOW = emerald.

---

→ skipped: deep schema inference for tabs <100 rows. Add when stakeholder confirms any of them have ML value. The numbers say none do.
