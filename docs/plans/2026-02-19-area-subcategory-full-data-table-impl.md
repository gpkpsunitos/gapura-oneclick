# Area SubCategory Full Data Table — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the basic 150-row HTML table inside `AreaSubCategoryDetail` with the full-featured `InvestigativeTable` component (search, pagination, CSV export, expandable rows).

**Architecture:** Single file edit in `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`. Add an import, swap a `useMemo`, and swap the JSX block. The three detail pages (terminal, apron, general) all share this one component so one change covers all three.

**Tech Stack:** React, Next.js App Router, TypeScript, Tailwind CSS, existing `InvestigativeTable` component at `components/chart-detail/InvestigativeTable.tsx`.

---

### Task 1: Add the `InvestigativeTable` import

**Files:**
- Modify: `components/charts/area-sub-category/AreaSubCategoryDetail.tsx` (top of file, after existing imports)

**Step 1: Open the file and add the import**

At the top of `AreaSubCategoryDetail.tsx`, after the existing import block, add:

```tsx
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import type { QueryResult } from '@/types/builder';
```

The file already imports from `recharts` and `lucide-react`. Place these two new imports directly after those.

**Step 2: Verify the build still passes**

```bash
npx tsc --noEmit
```

Expected: no errors (we only added an import, nothing can break yet).

---

### Task 2: Replace `detailRows` with `queryResult`

**Files:**
- Modify: `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`

**Context:** Currently around line 351 there is:

```ts
const detailRows = useMemo(() => {
  return [...focusedReports]
    .sort((a, b) => parseEventDate(b) - parseEventDate(a))
    .slice(0, 150);
}, [focusedReports]);
```

**Step 1: Delete the `detailRows` memo entirely.**

Remove those 5 lines.

**Step 2: In its place, insert a `queryResult` memo that transforms `focusedReports` into a `QueryResult`.**

```ts
const queryResult = useMemo<QueryResult>(() => {
  const columns = [
    'date_of_event',
    'branch',
    'airlines',
    categoryField,
    'category',
    'severity',
    'status',
    'root_caused',
    'action_taken',
  ];

  const rows = [...focusedReports]
    .sort((a, b) => parseEventDate(b) - parseEventDate(a))
    .map((r) => ({
      date_of_event: String(r.date_of_event || r.incident_date || r.created_at || ''),
      branch: cleanLabel(r.branch || r.reporting_branch || r.station_code),
      airlines: cleanLabel(r.airlines || r.airline),
      [categoryField]: cleanLabel(r[categoryField]),
      category: normalizeMainCategory(
        r.main_category || r.category || r.irregularity_complain_category,
      ),
      severity: cleanLabel(r.severity || ''),
      status: cleanLabel(r.status || ''),
      root_caused: cleanLabel(r.root_caused) || '-',
      action_taken: cleanLabel(r.action_taken) || '-',
    }));

  return { columns, rows, rowCount: rows.length, executionTimeMs: 0 };
}, [focusedReports, categoryField]);
```

**Notes:**
- `categoryField` is a prop typed as `'terminal_area_category' | 'apron_area_category' | 'general_category'` — it's safe to use as a computed key.
- `cleanLabel`, `normalizeMainCategory`, and `parseEventDate` are all defined earlier in the same file — no new helpers needed.
- The `category` column contains the main category (Irregularity / Complaint / Compliment) — this is what `InvestigativeTable` uses for badge coloring.

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about the computed key `[categoryField]`, cast as:
```ts
[categoryField as string]: cleanLabel(r[categoryField]),
```

---

### Task 3: Replace the HTML table block with `InvestigativeTable`

**Files:**
- Modify: `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`

**Context:** The existing basic table JSX (currently around lines 494–530) looks like:

```tsx
<div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
  <h3 className="text-sm font-bold text-gray-800 mb-3">
    Investigative Table {focusedCategory ? `- ${focusedCategory}` : ''}
  </h3>
  <div className="overflow-auto max-h-[520px]">
    <table className="w-full text-xs">
      ...all the thead/tbody/tr/td markup...
    </table>
  </div>
</div>
```

**Step 1: Delete the entire `<div>` block above** (from the opening `<div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">` that wraps the table, down through its closing `</div>`).

**Step 2: In its place, insert:**

```tsx
<div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
  <h3 className="text-sm font-bold text-gray-800 mb-4">
    Full Data Table{focusedCategory ? ` — ${focusedCategory}` : ''}
  </h3>
  <InvestigativeTable
    title={focusedCategory || title}
    data={queryResult}
    className="shadow-none border-0"
  />
</div>
```

**Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 4: Verify visually in the browser

**Step 1: Start the dev server (if not already running)**

```bash
npm run dev
```

**Step 2: Navigate to a detail page**

Open one of:
- `http://localhost:3000/dashboard/charts/terminal-area-category/detail?sourceSheet=NON+CARGO`
- `http://localhost:3000/dashboard/charts/apron-area-category/detail?sourceSheet=NON+CARGO`
- `http://localhost:3000/dashboard/charts/general-category/detail?sourceSheet=NON+CARGO`

**Step 3: Check the following**

- [ ] The full data table renders below the airline contribution chart
- [ ] Pagination controls appear (10 rows/page)
- [ ] Search input is present and filters rows as you type
- [ ] CSV export button is present and downloads a file
- [ ] Category column shows color-coded badges (red = complaint, orange = irregularity, green = compliment)
- [ ] Changing the focused category selector (if present) updates the table rows
- [ ] No console errors appear

**Step 4: Check all three categories**

Repeat the visual check for terminal, apron, and general category detail pages.
