# Sub-Category Picker (Button Pills) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pill button row above the Full Data Table in `AreaSubCategoryDetail` so users can pick any sub-category and the table updates immediately.

**Architecture:** Single JSX insertion in `AreaSubCategoryDetail.tsx`. The `focusedCategory` state and `focusedReports` memo already exist and drive the table — we only add the UI. No new state, no new memos, no API calls.

**Tech Stack:** React, TypeScript, Tailwind CSS.

---

### Task 1: Insert the pill picker row

**Files:**
- Modify: `components/charts/area-sub-category/AreaSubCategoryDetail.tsx`

**Background:**

The file's JSX return has sections in this order:
1. Insight banner
2. Stat cards
3. Category ranking bar chart
4. Monthly trend line chart
5. Branch × category heatmap
6. Airline Contribution chart  ← insert the pill row AFTER this
7. Full Data Table             ← the pill row goes just before this

`categoryRanking` is already computed as `{ category: string, count: number, share: number }[]` sorted by count descending.

`focusedCategory` is `string` state. Setting it to `''` shows all data; setting it to a category name filters the table to that category.

**Step 1: Read the file to find the exact insertion point**

Open `/Users/nrzngr/Desktop/gapura-irrs/components/charts/area-sub-category/AreaSubCategoryDetail.tsx`.

Find the line that opens the Full Data Table section — it looks like:
```tsx
<div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
  <h3 className="text-sm font-bold text-gray-800 mb-4">
    Full Data Table{focusedCategory ? ` — ${focusedCategory}` : ''}
```

Note the exact line number.

**Step 2: Insert the pill picker block immediately before that `<div>`**

Insert the following JSX block directly before the opening `<div>` of the Full Data Table section:

```tsx
{/* ── Sub-Category Picker ── */}
{categoryRanking.length > 0 && (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
      Filter table by {contextMeta.singular}
    </p>
    <div className="flex flex-wrap gap-2">
      {/* "All" pill */}
      <button
        onClick={() => setFocusedCategory('')}
        className={`
          px-3 py-1.5 rounded-full text-xs font-bold border transition-all
          ${focusedCategory === ''
            ? 'bg-[#6b8e3d] text-white border-[#6b8e3d]'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
        `}
      >
        All · {categoryRanking.reduce((s, c) => s + c.count, 0).toLocaleString('id-ID')}
      </button>

      {/* One pill per sub-category */}
      {categoryRanking.map(({ category, count }) => (
        <button
          key={category}
          onClick={() => setFocusedCategory(category)}
          className={`
            px-3 py-1.5 rounded-full text-xs font-bold border transition-all
            ${focusedCategory === category
              ? 'bg-[#6b8e3d] text-white border-[#6b8e3d]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
          `}
        >
          {category} · {count.toLocaleString('id-ID')}
        </button>
      ))}
    </div>
  </div>
)}
```

**Notes:**
- `contextMeta` is already in scope (it's `CONTEXT_META[categoryField]` computed near the top of the component).
- `setFocusedCategory` is the setter from `useState<string>('')` already in the component.
- `categoryRanking` is already in scope.
- No new imports needed.

**Step 3: Verify the build**

Run from `/Users/nrzngr/Desktop/gapura-irrs`:
```bash
npx tsc --noEmit 2>&1 | grep "area-sub-category"
```

Expected: no output (no errors for this file).

**Step 4: Verify visually**

Open one of the detail pages (e.g. `http://localhost:3000/dashboard/charts/terminal-area-category/detail?sourceSheet=NON+CARGO`).

Check:
- [ ] Pill row appears above the Full Data Table
- [ ] The top category pill is active (green) by default
- [ ] Clicking "All" pill shows full dataset in the table and deactivates category pills
- [ ] Clicking any category pill highlights it green and filters the table to that category
- [ ] The Full Data Table heading updates to show `Full Data Table — {selectedCategory}` or `Full Data Table` for "All"
- [ ] Works on all three detail pages (terminal, apron, general)
