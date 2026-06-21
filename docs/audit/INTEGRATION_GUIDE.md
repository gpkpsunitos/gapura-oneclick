# Task 7 — Integration Guide

## What changed in the frontend

| File | Change |
|---|---|
| `lib/schemas/insight.ts` | **NEW** — Zod schemas mirroring `CaseInsightResponse` from dl-space. Single source of truth for what the UI will render. |
| `app/api/ai/insight/case/route.ts` | **NEW** — Next.js proxy. Forwards to hf-space orchestrator, validates response with Zod before returning to client. Off-schema payloads → 502. |
| `components/dashboard/ai-insight/AIInsightCard.tsx` | **NEW** — 280-line replacement for the 918-line `AIAnalysisSection`. Executive layout, 5-level severity palette, ID language, lineage footer. |
| `components/dashboard/ai-insight/index.ts` | **NEW** — barrel. |
| `components/dashboard/ReportDetailView.tsx` | **EDITED** — swapped `AIAnalysisSection` for `AIInsightCard` under `<SectionCard title="AI Insight">`. Old import retained for rollback; legacy section commented in place. |

## How it talks to the backend

```
ReportDetailView
   │
   ▼
AIInsightCard
   │  POST /api/ai/insight/case  (Next.js proxy, with session cookie + Zod validation)
   ▼
gapura-irrs2 server
   │  POST <HF_BASE>/api/ai/insight/case
   ▼
hf-space orchestrator  (api/insight_orchestrator.py)
   │  fan-out to dl-space
   ▼
dl-space  /predictive/rca, /predictive/forecast, /predictive/anomaly
   │
   ▼  Pydantic-validated CaseInsightResponse
hf-space → Next.js → Zod re-validate → AIInsightCard renders
```

If **any** layer's schema check fails, the missing fields render as **"Data tidak cukup"** badges, never as raw JSON or arbitrary text. That is the hallucination-rate-0 % contract from Task 1.

## How the audit findings map to the new UI

| Task 1 finding | Fix in new card |
|---|---|
| C1 — fuzzy field hunt | Zod `safeParse` + server proxy double-validation. No `findValue` anywhere. |
| C2 — 7 parallel POSTs | Single endpoint `/api/ai/insight/case`. Orchestrator fans out server-side. |
| C3 — no exec headline | `HeadlineBlock` is the first thing rendered — sentence + signal badge + confidence. |
| C4 — no lineage | Footer: `Berdasarkan N data terprofil · per <as_of> · model RCA n_train=<n>`. |
| C5 — no forecasts / anomaly / RCA | `ForecastCard`, `AnomalyCard`, `RCAList` components. |
| C6 — magic `/10` divisor | Gone. Numbers come from validated schema fields with explicit units. |
| C7 — frontend severity drift | Frontend `SEVERITY_STYLE` keyed off the same Zod enum the backend produces. |
| M1 — 6-tone palette | Reduced to 4 signal tones + 5 severity tones. Each has one meaning. |
| M2 — mixed languages | Single language: Bahasa Indonesia. |
| M3 — all-caps everywhere | Caps reserved for short labels (badge names). Body text is sentence-case. |
| M4 — gradient overload | Removed. Solid colors, single border. |
| M5 — framer-motion stagger | Removed. Static layout, instant render. Snappier on every device. |
| M6 — three competing layouts | One card, one narrative: headline → severity → forecast/anomaly → RCA → lineage. |
| M7 — silent empty states | Every panel has an `<Unavailable reason="…">` fallback. |
| M9 — risk card mixing models | Risk-by-entity panel lives in the dashboard layer (legacy `RiskSummaryCard` untouched for now — replace in a follow-up). |
| M11 — `esklasi_regex` URL injection | Not forwarded by the new proxy. New endpoint accepts only the structured payload. |

## What to verify after deploy

1. **Open any report detail.** Section header reads "AI Insight" with a `v2` badge.
2. **Headline appears in ID** with a colored signal pill (Aman / Pantau / Risiko / Peluang).
3. **Severity badge** shows one of `TOP RISK / HIGH RISK / HIGH / MEDIUM / LOW` (NOT the old 4-level `Critical / High / Medium / Low`).
4. **Forecast & Anomaly** cards either show numbers OR show "Data tidak cukup · seri tidak memenuhi minimum data". No card silently disappears.
5. **RCA list** shows up to 5 ranked drivers OR "Data tidak cukup · model RCA belum tersedia".
6. **Lineage footer** at the bottom — `Berdasarkan N data terprofil · per <timestamp> · model RCA n_train=<n>`.
7. **Re-fetch button** at top — single round trip; check Network tab → only one POST to `/api/ai/insight/case`.

## Rolling back if a regression appears

Uncomment the legacy block in `ReportDetailView.tsx`:

```tsx
<AIAnalysisSection report={report} autoFetch={true} />
```

…and comment out `<AIInsightCard report={report} />`. Both files are still present in the tree.

After production is stable for a week, delete:
- `components/dashboard/ai-summary/AIAnalysisSection.tsx`
- the legacy `AIAnalysisSection` import in `ReportDetailView.tsx`

## What this card does NOT do (deliberate, per ponytail)

- No "Predicted Resolution Time" card. Resolution-day model is dropped per stakeholder decision 2026-06-21 (no `Date_Closed` column in the Sheet — see [SCHEMA_MAP.md](SCHEMA_MAP.md)).
- No NER extracted-entities chip cluster. Low signal in current data; can re-add as a collapsible if requested.
- No sentiment circle. Same.
- No SHAP "what-if" interactive sliders. Adds a lot of complexity for marginal exec value; the ranked driver list is what gets used.
- No re-add of the 6 collapsible accordions. The whole point of the audit was that exec users open zero of them.

## Dependencies for the new component

- `zod ^4.3.6` (already in package.json)
- `lucide-react` (already in package.json)
- No new package adds. No new fonts. No new tailwind utilities.

## Known gap

`AIInsightCard` fetches against `/api/ai/insight/case`, which proxies to **hf-space** at `process.env.AI_SERVICE_URL || https://gapura-dev-gapura-ai.hf.space`. Until **Task 6 (deploy)** finishes pushing the new orchestrator code to that Space:
- Production hf-space still runs the legacy 70-route `api/main.py`.
- The new `/api/ai/insight/case` endpoint **does not exist on the live Space** yet.
- The card will fetch → get 404 → display "AI service error · HTTP 404".

That is expected pre-deploy. Once Step 4a in [DEPLOY_COMMANDS.md](DEPLOY_COMMANDS.md) runs, the route appears and the card lights up.
