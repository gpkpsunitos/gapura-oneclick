# Task 1 — AI Insight UI Audit (`dashboard/op`)

**Scope:** `components/dashboard/ai-summary/*` (3228 lines), `components/dashboard/ai/SectionAiSummaryInsightButton.tsx`, `components/dashboard/action-summary-insight-panel.tsx`. Route: `app/dashboard/(main)/op/page.tsx`.

**Method:** Read full source. No live screenshot — claims trace to file:line. Severity = Critical / Major / Minor by impact on C-level decision quality, hallucination risk, latency, or scan-ability.

---

## Critical (must fix before redesign)

### C1. Recursive fuzzy field hunt is a hallucination pipe
`findValue` / `findList` recursively walk arbitrary JSON up to depth 5, picking the **first** key whose name matches any of a synonym list (e.g. `["root_cause","rootCause","predicted_root_cause","label","category"]`). [AIAnalysisSection.tsx:155-207](components/dashboard/ai-summary/AIAnalysisSection.tsx:155)
- If the backend returns a field named `label` *anywhere* in the tree (a metadata tag, a chart axis, a debug echo), it gets surfaced as "Root cause" with no provenance.
- Violates rule #1 (zero hallucinations). Every claim must trace to a *named, validated* field, not a name-matching scavenger hunt.
- **Fix:** strict Pydantic-style schema per endpoint; drop `findValue`; render nothing if the contract field is missing.

### C2. 7 parallel POSTs on every mount, no batching, no abort
[AIAnalysisSection.tsx:483-566](components/dashboard/ai-summary/AIAnalysisSection.tsx:483) fires `/analyze`, `/action/recommend`, `/subcategory`, `/risk/calculate`, `/similar`, `/root-cause/classify`, `/root-cause/intelligence` in parallel via `Promise.all`. Per case. No `AbortController`. autoFetch refires on every `report` change.
- p95 latency budget = slowest of 7. Target <3s end-to-end is unrealistic.
- Rapid case switch → 14, 21, 28 in-flight requests racing to set state.
- **Fix:** single `/insight/case` endpoint server-side fans out, returns one validated payload. Add abort on unmount/re-fetch.

### C3. No executive headline, no signal badge, lede buried
Section opens with branded "GAPURA.AI INSIGHTS" + spinner + "Re-analyze" button. [AIAnalysisSection.tsx:599-635](components/dashboard/ai-summary/AIAnalysisSection.tsx:599) The actual insight (predicted resolution, severity, risk) is 4–8 collapsibles below.
- Exec scrolls past chrome to find the one number that drives a decision.
- Spec §7 requires headline + signal badge first. Currently absent.

### C4. No data lineage / "as-of" anywhere visible
Model version rendered as 10px gray text after all content. [AIAnalysisSection.tsx:909-913](components/dashboard/ai-summary/AIAnalysisSection.tsx:909) No record count, no data date, no confidence summary.
- Exec cannot tell if insight is stale, partial, or model-failed.
- Currently silent failures hide blocks (`{prediction && ...}`) without telling user *why* the block is missing.

### C5. No forecasting, no seasonality, no anomaly detection
This is a per-case classifier UI. Spec calls it "Predictive Analytics" but the surfaced predictions are: resolution-days (regression), severity (classifier), entities (NER), summary (LLM), sentiment, risk score (per-entity, static). No `t+7/t+30/t+90` forecast, no seasonal decomposition, no anomaly residual.
- Gap is structural, not cosmetic. Task 5 (model pipeline) must add these targets before the UI can show them.

### C6. Magic `riskScore / 10` divisor
[RiskSummaryCard.tsx:788](components/dashboard/ai-summary/RiskSummaryCard.tsx:788) hardcodes `displayPct = cat.riskScore / 10`. If backend changes risk scale (0–100 → 0–1 → 0–10), display is silently wrong.
- No type/range contract enforced. Display lies if backend drifts.

### C7. Hardcoded threshold drift
[RiskSummaryCard.tsx:108-121](components/dashboard/ai-summary/RiskSummaryCard.tsx:108) thresholds (70/50/30) and `LEVEL_STYLE` keys ("Critical/High/Medium/Low") are duplicated in UI; backend's authoritative thresholds are not imported.
- Two sources of truth. Exec sees "High" badge that backend classified "Medium" if scales shift.

---

## Major

### M1. Tone palette of 6 colors with no semantic discipline
`PredictiveInsightCard` accepts `blue|emerald|amber|red|slate|indigo`. [AIAnalysisSection.tsx:399-406](components/dashboard/ai-summary/AIAnalysisSection.tsx:399) Indigo "Sub-Category" badge competes for attention with red "Risk Score" badge. Color stops meaning anything.
- Lock to four: 🟢 ok / 🟡 watch / 🔴 risk / 🔵 forecast.

### M2. Mixed English/Indonesian
Headings English ("Predicted Resolution Time", "Severity Classification"), body Indonesian ("Estimasi", "Lebih cepat", "Belum tersedia"). [AIAnalysisSection.tsx:666-699](components/dashboard/ai-summary/AIAnalysisSection.tsx:666)
- Pick one. C-suite Gapura → Bahasa Indonesia, period.

### M3. ALL-CAPS + 0.14–0.18em letter-spacing everywhere
Used for labels, titles, badges, footers. Visually fatiguing, slower to scan. "Looks designed," reads worse.

### M4. Decorative gradient overload
4+ unique gradient pairs (rose→orange, blue→cyan, violet→purple, teal→emerald, indigo→indigo). [RiskSummaryCard.tsx:368, 488, 599, 685](components/dashboard/ai-summary/RiskSummaryCard.tsx:368) Decoration without information. Exec dashboards reward neutral chrome.

### M5. framer-motion on every row with staggered delays
`initial/animate` + `delay: 0.04 * rank` per EntityRiskRow, CategoryRow, severity card. [RiskSummaryCard.tsx:162-165, 312-318, 680-685](components/dashboard/ai-summary/RiskSummaryCard.tsx:162) Janks at >10 items; pure decoration for an analytics surface that should snap.

### M6. Three competing layouts, no shared narrative
`AISummaryKPICards`, `RiskSummaryCard`, `ActionSummaryCard`, `AIAnalysisSection` each render their own header, palette, density. Exec sees four mini-dashboards stacked, not one story.

### M7. Hidden empty states
Every block guards `{prediction && ...}`, `{classification && ...}`. When the model can't predict, the block silently disappears. No "Insufficient data — 3 records, need ≥10" panel.

### M8. Predictive Case Insights card is a synonym scavenger
`buildPredictiveInsights` [AIAnalysisSection.tsx:215-302](components/dashboard/ai-summary/AIAnalysisSection.tsx:215) tries 4–8 candidate field names per row, fallback "Belum ada detail". If model is right but field name differs, exec sees "Belum ada detail." Same fuzzy hunt as C1, same hallucination class.

### M9. RiskSummaryCard mixes 3 mental models in one card
- "Entity count per risk level" (severity cards) [line 675-713](components/dashboard/ai-summary/RiskSummaryCard.tsx:675)
- "Risk score by category" (percentage bars with /10 divisor) [line 778-818](components/dashboard/ai-summary/RiskSummaryCard.tsx:778)
- "Categories breakdown" (resolution rate, severity dist, top actions) [line 821-854](components/dashboard/ai-summary/RiskSummaryCard.tsx:821)
- Tooltip exists [line 620-632](components/dashboard/ai-summary/RiskSummaryCard.tsx:620) to explain "angka di kartu = jumlah entitas, bukan jumlah laporan" — a card needing a tooltip to explain its own number is mislabeled.

### M10. No keyboard or screen-reader story
CollapsibleSection uses bare `<button>`. No `aria-expanded`. AnimatePresence drops elements from tab order during transition. Sparkline circles unlabeled. EntityTag has no `aria-label`.

### M11. URL-param prompt-injection vector
`esklasi_regex` lifted from `window.location.search` and forwarded raw into POST bodies and URL query [AIAnalysisSection.tsx:464](components/dashboard/ai-summary/AIAnalysisSection.tsx:464). If backend uses it in prompts or regex without sanitization, this is a prompt-injection / ReDoS surface.

---

## Minor

- M1n. Inline `// Complexity: Time O(1) | Space O(1)` comments on trivial getters [RiskSummaryCard.tsx:107, 115, 142, 548](components/dashboard/ai-summary/RiskSummaryCard.tsx:107) — pure noise.
- M2n. `MessageSquare` "Sentiment" sparkline circle [AIAnalysisSection.tsx:782-803](components/dashboard/ai-summary/AIAnalysisSection.tsx:782) is decorative — number + bar would convey same info in 1/4 the pixels.
- M3n. Entity tag confidence rendered `[37%]` after the entity text [AIAnalysisSection.tsx:369](components/dashboard/ai-summary/AIAnalysisSection.tsx:369) — confidence has no calibration story; meaningless number.
- M4n. "Re-analyze" button label is English [AIAnalysisSection.tsx:633](components/dashboard/ai-summary/AIAnalysisSection.tsx:633) — see M2.
- M5n. Header shimmer animation [line 600](components/dashboard/ai-summary/AIAnalysisSection.tsx:600) draws attention to chrome, not data.
- M6n. RiskSummaryCard imports both `motion` and `AnimatePresence` but uses them on bars/rows only, not on parent — animation adds weight without UX payoff.
- M7n. Lucide icon imports total ~30+ icons across the four files; many overlap (TrendingUp used 3 ways). Consolidate.

---

## Predictive analytics gap matrix

| Required (spec §5/§7) | Current state | Source |
|---|---|---|
| Time-series forecast (t+7/30/90) | ❌ none | — |
| Forecast intervals (calibrated) | ⚠️ per-case resolution range only | [AIAnalysisSection.tsx:662-703](components/dashboard/ai-summary/AIAnalysisSection.tsx:662) |
| Seasonality / decomposition | ❌ none | — |
| Anomaly detection (residual / STL) | ❌ none | — |
| Risk scoring (forward-looking) | ⚠️ static per-entity score | [RiskSummaryCard.tsx](components/dashboard/ai-summary/RiskSummaryCard.tsx) |
| Root cause attribution (SHAP-style) | ⚠️ free-text classification, no ranked drivers | [AIAnalysisSection.tsx:288-297](components/dashboard/ai-summary/AIAnalysisSection.tsx:288) |
| Counterfactual / what-if | ❌ none | — |
| Confidence calibration in headline | ❌ none (buried) | — |
| Data lineage / as-of footer | ⚠️ model version only, 10px | [AIAnalysisSection.tsx:909-913](components/dashboard/ai-summary/AIAnalysisSection.tsx:909) |
| Zero-hallucination guard | ❌ fuzzy-key picker on arbitrary JSON | [AIAnalysisSection.tsx:155-187](components/dashboard/ai-summary/AIAnalysisSection.tsx:155) |

---

## Fix priority (drives Task 7 redesign)

1. Replace `findValue`/`findList` with strict per-endpoint Pydantic-on-server + Zod-on-client schemas. Hard-fail unknown shape; render "data unavailable" badge.
2. Collapse 7 frontend calls into one `/insight/case` server endpoint with abort + 2.5s timeout per sub-call.
3. Top-of-component executive headline: one sentence + signal badge + as-of stamp.
4. Lock palette to 4 semantic tones; delete decorative gradients.
5. Single language (Bahasa Indonesia).
6. Add explicit empty/insufficient-data states with the threshold ("perlu ≥N records").
7. Move framer-motion to opt-in (reduced-motion default).
8. After Task 5 ships forecasts/anomaly/SHAP: add Forecast Card, Risk & Anomaly Panel, Root Cause Breakdown per spec §7.

---

→ skipped: live screenshot of `dashboard/op` (dev server not started; spec said skip env validation). Add when Task 7 starts — verify against real render before final UI sign-off.
