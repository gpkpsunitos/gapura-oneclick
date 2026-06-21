# Handoff — 2026-06-21

Session worked through a 12-item dashboard spec. This doc captures **exactly what's done, half-done, and untouched** so the next agent can pick up cold.

Read top-to-bottom — the pending sections include the file paths and patterns you'll need.

---

## Status legend

- ✅ **DONE** — shipped, type-checked, dev-server route returns 200.
- 🟡 **PARTIAL** — pattern established, more call sites pending.
- ⛔ **NOT STARTED** — pending, no code changes yet.
- 🛇 **SKIPPED-BY-SPEC** — intentionally omitted per user direction.

---

## 1. Item-by-item status

### ✅ Item 2 (case classification move) — DONE
Removed `Summary Report Case Classification` section from [components/dashboard/tabs/SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx). New `Case Classification by Month` section added to [components/dashboard/tabs/ServiceQualityImprovementTab.tsx](components/dashboard/tabs/ServiceQualityImprovementTab.tsx) using `computeCaseClassByMonth(reports)` helper (module-level, year-scopable via `<YearCard>`).

### 🛇 Item 3 source-filter scope inside ARS deferred — see item 7.

### ✅ Item 4 (hide HC edaran + Circular & Material) — DONE
- Removed `Circulars & Materials` card from [app/dashboard/(main)/eskalasi/select/page.tsx](app/dashboard/(main)/eskalasi/select/page.tsx); removed `'HC'` from `COMING_SOON_DIVISIONS`.
- Hid `EDARAN_DIREKSI` from [components/hc/HCDocumentManagementPage.tsx](components/hc/HCDocumentManagementPage.tsx): removed from `CATEGORY_OPTIONS`, default form value swapped to `MATERI_SOSIALISASI`, listing filter drops any doc with that category.
- API still accepts `EDARAN_DIREKSI` server-side — existing rows stay in DB but are invisible in UI.

### ✅ Item 5 (YoY chart, dashed prior year) — DONE
- Summary tab's `YearTrendChartPanel`: previous-year line uses `stroke="#94a3b8"` + `strokeDasharray="6 5"`. Legend swatch says `{year} (prior)`. Inline comment with recipe for layering >2 priors (progressively lighter greys + longer dashes).
- SQI tab's YoY panel: same dashed-grey treatment, wrapped in `<YearCard>` so the "current year" of the pair follows the per-card year toggle.
- **Upstream still slices to 2 years** (`summaryYears.slice(-2)`). To support more priors you need to extend that slice + add additional `<Line>` entries with `#cbd5e1` etc.

### ✅ Item 6 (remove Root Cause Analysis section from SQI) — DONE
Deleted the whole section. Tab-level `rootRows` memo still exists because the `sectionAiContext` AI summary references it — left in place intentionally.

### ✅ Item 7 (Recurring Issues table changes) — DONE
In [ServiceQualityImprovementTab.tsx](components/dashboard/tabs/ServiceQualityImprovementTab.tsx):
- `computeChronicIssues(reports)` filters out compliments before bucketing.
- New `Case Classification` column added after `Sub-Category` (sourced via `topOf(reports, getCaseClass)`).
- Old `Months` count column removed (logic still uses `b.months.size >= 3` to filter).
- `Open` column → `Status` column rendering `N OPEN · M CLOSED` with `openCount` / `closedCount` fields.

### ✅ Item 8 (Big KPI hero breakdown) — DONE
`AnnualMetricStrip` in [SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx) now renders `Landside · X · Airside · Y · GSE · Z` under each year total. Breakdown computed via `computeSourceBreakdown(reports, year)` which uses `classifySourceArea`.

### ✅ Item 9 (title changes) — DONE
- Page H1s: Summary Report + "Landside & Airside" subline; SQI tab = "Landside & Airside" + "Detail Report" subline; GSE Performance + "Detail Report" subline.
- Tab pill labels in [components/dashboard/analyst/AnalystCharts.tsx](components/dashboard/analyst/AnalystCharts.tsx): stacked two-line for `summary`, `sqi`, `gse` (single line for `joumpa`, `cgo_cargo`, `delay`). `<span className="block">` inside `<span className="whitespace-normal text-center leading-tight">`.

### ✅ Item 10 (Summary excludes CGO) — DONE
`SummaryReportTab` destructures `reports: rawReports` then computes `const reports = useMemo(() => rawReports.filter((r) => !isCargoReport(r)), [rawReports])` at the top. Every downstream memo inherits the filter.

### ✅ Item 11 (SQI excludes CGO + GSE + Joumpa) — DONE
`filteredSourceReports` in `ServiceQualityImprovementTab` now uses canonical helpers:
```ts
deferredReports.filter((r) => !isCargoReport(r) && !isGseServiceReport(r) && !isJoumpaServiceReport(r))
```
(Replaced fragile string matching on `service_business_type`.)

---

## 2. PENDING WORK — what the next agent must finish

### 🟡 Item 1 (per-card year toggle) — 1 of 6 tabs done

**Pattern is fully established. SQI tab is the proof.**

Foundation file: [components/dashboard/year-context.tsx](components/dashboard/year-context.tsx). Exports:
- `useCardYear(reports)` → `{ filtered, year, toggle, availableYears }` — local year state per call site, returns reports filtered by selected year + a ready-to-render toggle node.
- `<YearCard reports={X}>{({ filtered, toggle, year }) => ...}</YearCard>` — render-prop wrapper used in tab files.

**SQI tab done (proof of pattern):** [ServiceQualityImprovementTab.tsx](components/dashboard/tabs/ServiceQualityImprovementTab.tsx). All 16 panels wrapped with `<YearCard>`. Panel component accepts new `headerExtra?: ReactNode` prop and renders the toggle in its header.

**Refactor pattern per call site:**
```tsx
// BEFORE:
const someRows = useMemo(() => aggregate(scopedReports, getX), [scopedReports]);
<Panel title="X" total={total}>
  <BarList rows={someRows} onOpen={(row) => openDrilldown(scopedReports.filter(...), ...)} />
</Panel>

// AFTER:
<YearCard reports={scopedReports}>{({ filtered, toggle }) => {
  const rows = aggregate(filtered, getX);
  return (
    <Panel headerExtra={toggle} title="X" total={rows.reduce((s,r)=>s+r.total,0)}>
      <BarList rows={rows} onOpen={(row) => openDrilldown(filtered.filter(...), ...)} />
    </Panel>
  );
}}</YearCard>
```

**Tabs still pending (in recommended order, fastest first):**

| Tab | File | Panel count | Notes |
|---|---|---|---|
| GSE | [components/dashboard/tabs/GsePerformanceTab.tsx](components/dashboard/tabs/GsePerformanceTab.tsx) | 4 | Add `headerExtra` to local `Panel` component, then wrap 4 call sites. Mirror SQI exactly. |
| CGO | [components/dashboard/tabs/CgoCargoReportTab.tsx](components/dashboard/tabs/CgoCargoReportTab.tsx) | 13 | Same pattern; long but mechanical. |
| Delay | [components/dashboard/tabs/DelayCodeReportTab.tsx](components/dashboard/tabs/DelayCodeReportTab.tsx) | 9 | Same pattern. |
| Joumpa | [components/dashboard/tabs/JoumpaServiceTab.tsx](components/dashboard/tabs/JoumpaServiceTab.tsx) | ~6 bespoke tables | Doesn't use a shared `Panel`. Each bespoke table component (`JoumpaBarTable`, `JoumpaMatrixTable`, `VoiceSummaryTable`, `JoumpaCategoryMatrixTable`, `JoumpaIssueDetailTable`, plus detail tables) needs its own `headerExtra` slot OR wrap each at the call site with a custom header div above the table. Larger lift than the others. |
| Summary | [components/dashboard/tabs/SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx) | 4 + bespoke pivots + ARS composite | Already has a `selectedYear?: number` prop on the component (currently unused since AnalystCharts stopped passing it). The bespoke pivot tables already have a `headerExtra` slot from the source-filter work — just need to wrap each in `<YearCard>`. The `AnnualReportSummary` composite already shifts its YoY pair based on `activeYear` — keep that, just need to route the YearCard's `year` into it. |

**Do NOT** re-add a global tab-level year toggle in `AnalystCharts`. The user explicitly rejected shared state — every card must own its own year.

**Verification per tab:**
1. `npx tsc --noEmit` — must be clean.
2. `/usr/bin/curl -sS -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/dashboard/op` — must return `200`.
3. Visual: navigate to the tab, confirm each card's header has a year pill toggle and flipping it filters only that card.

### 🟡 Item 7 — Summary tab source filter — `AnnualReportSummary` composite deferred

Per-card source filter (`<SourceCard>`) is wired in [SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx) on these cards:
- Summary Station ✅
- Summary Airlines ✅
- Airside Area Category ✅
- Airside Area by Airlines (inside ExpandableReportBlock) ✅

**Skipped per spec (intentional, do not wire):**
- Summary Report Landside Area Category section
- Summary Report General Service Category section

**Deferred — needs decision:** the `AnnualReportSummary` composite at the top of the tab contains:
1. Hero KPI cards (Total Reports prev/current with L/A/GSE breakdown) — **the breakdown already shows all three sources, so a source filter would be redundant.**
2. Two `YearCategorySummaryTable` (one per year) — could take a source filter.
3. `YearImprovementSummaryTable` (YoY comparison) — could take a source filter.
4. `YearTrendChartPanel` (Monthly trend chart) — could take a source filter.

Ask the user: do they want per-card source filters on the YoY tables + trend chart inside the composite, or is the existing hero breakdown enough?

If yes, the wrapping is similar to the existing ones but you'll need to pass `currentYearReports` (or `filteredSummaryReports`) into `AnnualReportSummary` and have each inner sub-component re-derive its rows from a source-filtered subset. The composite currently takes precomputed `previousRows` / `currentRows`. Major rewrite of the composite's prop shape. Worth confirming scope with user first.

**Foundation:**
- `classifySourceArea(report)` returns `'landside' | 'airside' | 'gse' | 'other'` — derived from real sheet values via [scripts/dump-source-fields.mjs](scripts/dump-source-fields.mjs). Run that script if new area values show up in the data.
- `applySourceFilter(reports, source)` is the one-line filter helper.
- `<SourceCard reports={X}>{({ filtered, toggle, source }) => ...}</SourceCard>` is the render-prop wrapper.

Source filter on **other tabs** (SQI, Joumpa, GSE, CGO, Delay) is **NOT in scope** — the original spec only asked for it on Summary. Confirm with user before extending.

---

## 3. Known cleanup debt (low priority)

### Dead memos to delete eventually
- [SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx) lines ~939–962: `airsideReports`, `airsideCategorySummary`, `airsideAirlineSummary` — now dead after source-filter refactor. The new `<SourceCard>` call sites re-derive them inside the render prop.
- [ServiceQualityImprovementTab.tsx](components/dashboard/tabs/ServiceQualityImprovementTab.tsx): tab-level memos `monthlyYear`/`setMonthlyYear`, `monthlyRows`, `caseByArea`, `branchByCategory`, `airlineByCategory`, `caseClassKeys`, `presentCategoryCols`, `presentAreaCols`, `branchKeys`, `airlineKeys`, `detailRows`, `caseClassByMonth`, `chronicIssueRows`, `yoyMonthlyRows`, `terminalSubRows`, `apronSubRows`, `generalSubRows` — many of these are STILL referenced by `sectionAiContext` (the AI summary feature) or the header KPI text. **Do NOT bulk-delete.** Grep each one before removing. Safe deletes: `monthlyYear`, `setMonthlyYear`, `caseByArea`, `branchByCategory`, `airlineByCategory`, the `*Keys` and `present*Cols` memos, `detailRows` (tab-level), `caseClassByMonth`, `chronicIssueRows` (tab-level), `yoyMonthlyRows`, `terminalSubRows`, `apronSubRows`, `generalSubRows`.

### Unused prop
- `selectedYear?: number` on [SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx) is currently never passed by AnalystCharts (was removed when global year toggle was reverted). The internal fallback (`fallbackYear = max year in data`) handles the default case. The prop will be re-used when Summary is migrated to per-card year toggles.

### Year-context exports
[components/dashboard/year-context.tsx](components/dashboard/year-context.tsx) exports `YearCard`, `useCardYear`. The old `YearProvider` was removed when the global toggle was abandoned — make sure no stray imports remain (verified clean as of this handoff).

---

## 4. Architecture quick reference

### Data flow
```
AnalystCharts (global filter UI: hubs/branches/airlines/categories)
  → filteredReports: Report[]   ← already filtered by global controls
  → passed RAW to each tab (no year pre-filter)

Each tab:
  → tab-internal date-range filter → scopedReports
  → each card: <YearCard reports={scopedReports}>{({ filtered, toggle }) => ...}</YearCard>
    → inside the card render, aggregate `filtered` to produce rows
    → render <Panel headerExtra={toggle} title="..."> with those rows
```

### Source classification (Summary tab only, for now)
File: [components/dashboard/tabs/SummaryReportTab.tsx](components/dashboard/tabs/SummaryReportTab.tsx)

```ts
classifySourceArea(report) → 'landside' | 'airside' | 'gse' | 'other'
```
Rules derived from live sheet probe (`scripts/dump-source-fields.mjs`):
- `area = "Terminal Area"` → landside
- `area = "Apron Area"` AND apron_area_category contains `"gse"` → gse
- `area = "Apron Area"` otherwise → airside
- `area = "GSE Availability"` → gse
- `isGseServiceReport(report)` → gse (catches `service_business_type = gse` and gse-only fields)
- everything else → other

### Item 8 KPI breakdown helper
`computeSourceBreakdown(reports, year)` returns `{ landside, airside, gse }` for the year, used by `AnnualMetricStrip`.

---

## 5. Verification commands

After any change, run:

```bash
# Type-check
npx tsc --noEmit

# Smoke-test the live route (dev server already running on :3000)
/usr/bin/curl -sS -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/dashboard/op
# Expect: 200
```

If the dev server isn't running, start it via the Claude Preview tool (`preview_start name="dev"`).

For data inspection (Google Sheets):
```bash
node scripts/dump-source-fields.mjs
```
Probes unique values of `Area`, `Terminal Area Category`, `Apron Area Category`, `GSE Availability Area`, `GSE Available Requirement`, `Source Sheet`, `Service / Business Type` across all sheets in the Google Sheet. Useful when sheet schema changes or new area values appear.

Credentials are in `.env` (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `NEXT_PUBLIC_GOOGLE_SHEET_ID`).

---

## 6. Conventions established this session

- **Per-card state, never global** for year and source toggles. User has explicitly rejected shared state twice. Do not re-introduce a `YearProvider` / shared context.
- **Render-prop wrappers** (`<YearCard>`, `<SourceCard>`) for any per-card local state that affects the card's data. Pattern is established — reuse it.
- **`headerExtra?: ReactNode` slot** on shared wrappers (Panel, TableShell). Drop the toggle here.
- **`ponytail:` inline comments** mark deliberate simplifications and their upgrade path. Preserve them.
- **No bulk cleanup** of dead memos without verifying every reference (especially `sectionAiContext` and KPI strip computations).
- **Boomer-executive UX**: avoid extra clicks. Stacked prior years over toggle UX (#5). Visible-everywhere over hidden controls.

---

## 7. Open questions the next agent should ask the user

1. Do you want per-card source filters on `AnnualReportSummary` (YoY tables + trend chart inside the composite) on the Summary tab? Or is the hero KPI breakdown enough?
2. Cascade order for the remaining year-toggle tabs — GSE → CGO → Delay → Joumpa → Summary is the recommendation (fastest to slowest). Confirm or re-order.
3. Do you want the dead tab-level memos cleaned up as a separate small PR, or rolled in with the year-toggle cascade?

End of handoff.
