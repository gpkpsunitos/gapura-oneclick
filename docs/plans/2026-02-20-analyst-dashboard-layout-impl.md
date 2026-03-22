# Analyst Dashboard Layout Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the analyst dashboard into three distinct visual zones: a header with export actions, a side-by-side stats+table grid, and a tabbed chart section.

**Architecture:** Pure presentational refactor across 4 files — no API changes, no data logic changes. Each task is self-contained and can be implemented, reviewed, and committed independently.

**Tech Stack:** React 18, Next.js, Tailwind CSS, lucide-react icons, `cn()` utility from `@/lib/utils`.

**Design doc:** `docs/plans/2026-02-20-analyst-dashboard-layout-design.md`

---

## Task 1: Add `compact` prop to `ResponsiveStatsGrid`

**Files:**
- Modify: `components/dashboard/analyst/ResponsiveStatsGrid.tsx:23-88`

The stats grid currently always renders `grid-cols-2 lg:grid-cols-4`. When placed in the left column of the body grid (Task 3), we want it to stay 2×2 on desktop too. The `compact` prop locks it to `grid-cols-2` always.

**Step 1: Edit the interface at line 23**

Replace:
```ts
interface ResponsiveStatsGridProps {
  stats: {
    total: number;
    resolved: number;
    pending: number;
    highSeverity: number;
    resolutionRate?: number;
  };
  onStatClick?: (type: string) => void;
}
```
With:
```ts
interface ResponsiveStatsGridProps {
  stats: {
    total: number;
    resolved: number;
    pending: number;
    highSeverity: number;
    resolutionRate?: number;
  };
  onStatClick?: (type: string) => void;
  compact?: boolean;
}
```

**Step 2: Edit the function signature at line 40**

Replace:
```ts
export function ResponsiveStatsGrid({
  stats,
  onStatClick,
}: ResponsiveStatsGridProps) {
```
With:
```ts
export function ResponsiveStatsGrid({
  stats,
  onStatClick,
  compact,
}: ResponsiveStatsGridProps) {
```

**Step 3: Edit the grid div at line 79**

Replace:
```tsx
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up"
      style={{ animationDelay: '100ms' }}
    >
```
With:
```tsx
    <div
      className={cn(
        'grid gap-3 sm:gap-4 animate-fade-in-up',
        compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
      )}
      style={{ animationDelay: '100ms' }}
    >
```

**Step 4: Commit**

```bash
git add components/dashboard/analyst/ResponsiveStatsGrid.tsx
git commit -m "feat(analyst): add compact prop to ResponsiveStatsGrid"
```

---

## Task 2: Add export props + buttons to `ResponsiveHeader`

**Files:**
- Modify: `components/dashboard/analyst/ResponsiveHeader.tsx`

The goal is: Excel and PDF export buttons appear in the header's action row (icon-only at `xl`, icon+label at `2xl`, and in the mobile `MobileActionMenu`).

**Note:** `FileText` is already imported. You need to add `FileSpreadsheet`.

**Step 1: Add `FileSpreadsheet` to the lucide-react import at line 5**

Current import block (lines 5-17):
```ts
import {
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  Loader2,
  Plus,
  LayoutDashboard,
  Shield,
  MoreVertical,
  Calendar,
  ChevronDown,
} from 'lucide-react';
```
Replace with:
```ts
import {
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  Plus,
  LayoutDashboard,
  Shield,
  MoreVertical,
  Calendar,
  ChevronDown,
} from 'lucide-react';
```

**Step 2: Add export props to the interface at line 28**

Replace:
```ts
interface ResponsiveHeaderProps {
  dateRange: 'all' | 'week' | 'month';
  onDateRangeChange: (range: 'all' | 'week' | 'month') => void;
  onRefresh: () => void;
  refreshing: boolean;
  onCustomerFeedback: () => void;
  cfLoading: boolean;
  onFilterClick: () => void;
}
```
With:
```ts
interface ResponsiveHeaderProps {
  dateRange: 'all' | 'week' | 'month';
  onDateRangeChange: (range: 'all' | 'week' | 'month') => void;
  onRefresh: () => void;
  refreshing: boolean;
  onCustomerFeedback: () => void;
  cfLoading: boolean;
  onFilterClick: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  exporting: 'excel' | 'pdf' | null;
}
```

**Step 3: Add new props to the function destructuring at line 42**

Replace:
```ts
export function ResponsiveHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onCustomerFeedback,
  cfLoading,
  onFilterClick,
}: ResponsiveHeaderProps) {
```
With:
```ts
export function ResponsiveHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onCustomerFeedback,
  cfLoading,
  onFilterClick,
  onExportExcel,
  onExportPDF,
  exporting,
}: ResponsiveHeaderProps) {
```

**Step 4: Add export actions to the mobile menu at line 63**

Replace:
```ts
  const mobileMenuActions = [
    {
      label: 'Customer Feedback',
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onCustomerFeedback,
    },
    {
      label: 'Filter Dashboard',
      icon: <Shield className="w-4 h-4" />,
      onClick: onFilterClick,
    },
  ];
```
With:
```ts
  const mobileMenuActions = [
    {
      label: 'Customer Feedback',
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onCustomerFeedback,
    },
    {
      label: 'Filter Dashboard',
      icon: <Shield className="w-4 h-4" />,
      onClick: onFilterClick,
    },
    {
      label: 'Download Excel',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: onExportExcel,
    },
    {
      label: 'Download PDF',
      icon: <FileText className="w-4 h-4" />,
      onClick: onExportPDF,
    },
  ];
```

**Step 5: Add Excel and PDF buttons to the desktop action row**

Find the block at lines 147-174 (the section that starts with `{/* Desktop: Full buttons */}` and contains the Customer Feedback + Filter buttons). Insert the two export buttons **after** the Filter `<Button>` and **before** the `{/* Mobile: Action menu ... */}` comment.

After the Filter button:
```tsx
          <Button
            onClick={onFilterClick}
            variant="outline"
            className="hidden xl:inline-flex items-center gap-2 min-h-[44px]"
          >
            <Shield size={16} />
            <span className="hidden 2xl:inline">Filter</span>
          </Button>
```

Insert immediately after it:
```tsx
          <Button
            onClick={onExportExcel}
            disabled={exporting !== null}
            variant="outline"
            className={cn(
              'hidden xl:inline-flex items-center gap-2 min-h-[44px]',
              'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
              exporting === 'excel' && 'opacity-50'
            )}
          >
            {exporting === 'excel' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            <span className="hidden 2xl:inline">Excel</span>
          </Button>

          <Button
            onClick={onExportPDF}
            disabled={exporting !== null}
            variant="outline"
            className={cn(
              'hidden xl:inline-flex items-center gap-2 min-h-[44px]',
              'text-red-700 border-red-200 hover:bg-red-50',
              exporting === 'pdf' && 'opacity-50'
            )}
          >
            {exporting === 'pdf' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            <span className="hidden 2xl:inline">PDF</span>
          </Button>
```

**Step 6: Commit**

```bash
git add components/dashboard/analyst/ResponsiveHeader.tsx
git commit -m "feat(analyst): add export buttons to ResponsiveHeader"
```

---

## Task 3: Refactor `page.tsx` — remove export section, add body grid

**Files:**
- Modify: `app/dashboard/(main)/analyst/page.tsx`

Three changes in this file:
1. Pass export props to `<ResponsiveHeader>`
2. Remove the standalone export `<PresentationSlide>` block
3. Wrap stats + table in a side-by-side grid

**Step 1: Pass export props to `<ResponsiveHeader>` at lines 669-679**

Replace:
```tsx
      <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
        <ResponsiveHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          onCustomerFeedback={handleCustomerFeedbackShortcut}
          cfLoading={cfLoading}
          onFilterClick={() => setShowFilterModal(true)}
        />
      </PresentationSlide>
```
With:
```tsx
      <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
        <ResponsiveHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          onCustomerFeedback={handleCustomerFeedbackShortcut}
          cfLoading={cfLoading}
          onFilterClick={() => setShowFilterModal(true)}
          onExportExcel={exportToExcel}
          onExportPDF={exportToPDF}
          exporting={exporting}
        />
      </PresentationSlide>
```

**Step 2: Replace the stats + export + table sections (lines 681-742)**

Remove this entire block:
```tsx
      {/* Stats Grid */}
      <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
        <ResponsiveStatsGrid
          stats={filteredStats}
          onStatClick={handleStatClick}
        />
      </PresentationSlide>

      {/* Export Actions */}
      <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
        <div
          className="flex flex-wrap gap-2 sm:gap-3 animate-fade-in-up"
          style={{ animationDelay: '150ms' }}
        >
          <button
            onClick={exportToExcel}
            disabled={exporting !== null}
            className={cn(
              'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
              'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
              'min-h-[44px]',
              exporting === 'excel' && 'opacity-50'
            )}
          >
            {exporting === 'excel' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            Download Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting !== null}
            className={cn(
              'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
              'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
              'min-h-[44px]',
              exporting === 'pdf' && 'opacity-50'
            )}
          >
            {exporting === 'pdf' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            Download PDF
          </button>
        </div>
      </PresentationSlide>

      {/* Reports Table */}
      <ReportsTableSection
        reports={filteredReports}
        dateRange={dateRange}
        onViewReport={setSelectedReport}
        onTriageReport={(report) => {
          setTriageReport(report);
          setIsTriageOpen(true);
        }}
        drilldownUrl={drilldownUrl}
      />
```

Replace with:
```tsx
      {/* Body: Stats (left) + Table (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2">
          <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
            <ResponsiveStatsGrid
              stats={filteredStats}
              onStatClick={handleStatClick}
              compact
            />
          </PresentationSlide>
        </div>
        <div className="lg:col-span-3">
          <ReportsTableSection
            reports={filteredReports}
            dateRange={dateRange}
            onViewReport={setSelectedReport}
            onTriageReport={(report) => {
              setTriageReport(report);
              setIsTriageOpen(true);
            }}
            drilldownUrl={drilldownUrl}
          />
        </div>
      </div>
```

**Step 3: Remove unused imports**

After the above edits, `FileText` and `FileSpreadsheet` may no longer be used directly in `page.tsx` (they were only used in the removed export block). Check line 6:
```ts
import { FileText, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';
```
Remove `FileText` and `FileSpreadsheet` from this import if they are no longer referenced in `page.tsx`. `RefreshCw` and `Loader2` are still used in the loading spinner. The final import should be:
```ts
import { RefreshCw, Loader2 } from 'lucide-react';
```
**Verify first** by searching for `FileText` and `FileSpreadsheet` in `page.tsx` before removing — if they are used elsewhere in the file, keep them.

**Step 4: Commit**

```bash
git add app/dashboard/(main)/analyst/page.tsx
git commit -m "feat(analyst): side-by-side stats+table grid, move exports to header"
```

---

## Task 4: Add tab bar to `AnalystCharts`

**Files:**
- Modify: `components/dashboard/analyst/AnalystCharts.tsx`

`useState` is already imported at line 3. We add an `activeTab` state and a tab bar UI at the start of the return block. Each PresentationSlide is wrapped in a conditional render based on the active tab.

**Context:**
- Function starts at line 430
- Return statement at line 977, `<>` at 978, closing `</>` at 2517
- Slide boundaries:
  - `tren`: PresentationSlide starts at line 980, ends at line 1375 (just before `</PresentationSlide>` at 1375)
  - `stasiun`: line 1378–1675
  - `maskapai`: line 1678–1951
  - `cgo`: two slides — line 1953–2204 AND line 2206–2407
  - `insights`: line 2409–2516

**Step 1: Add `activeTab` state after the function opening at line 430**

Find the function opening:
```ts
export default function AnalystCharts({
```
Read lines 430–470 to find where the first `const` inside the function body appears (after props destructuring). Insert the following right after the closing `}` of the props block and before the first `const`:

```ts
    const TABS = ['tren', 'stasiun', 'maskapai', 'cgo', 'insights'] as const;
    type AnalystTab = typeof TABS[number];
    const TAB_LABELS: Record<AnalystTab, string> = {
        tren: 'Tren & Kategori',
        stasiun: 'Stasiun',
        maskapai: 'Maskapai',
        cgo: 'CGO',
        insights: 'Insights',
    };
    const [activeTab, setActiveTab] = useState<AnalystTab>('tren');
```

**Step 2: Replace the return block wrapper**

Replace:
```tsx
    return (
        <>
            {/* Slide 2: General Categories & Volume Trends */}
```
With:
```tsx
    return (
        <div className="space-y-4">
            {/* Tab Bar */}
            <div className="overflow-x-auto pb-1">
                <div className="flex gap-2 min-w-max">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                                activeTab === tab
                                    ? 'bg-[var(--brand-primary)] text-white'
                                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                            )}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Slide 2: General Categories & Volume Trends */}
            {activeTab === 'tren' && (
```

**Step 3: Wrap each slide group in a conditional**

For each of the 5 tab groups, wrap the corresponding `<PresentationSlide>...</PresentationSlide>` block:

**`tren` tab** (line 980–1375):
- After `{activeTab === 'tren' && (` (added in Step 2), find the closing `</PresentationSlide>` of the Tren slide at line 1375.
- After that `</PresentationSlide>`, add `)}` to close the conditional.

**`stasiun` tab** (line 1378–1675):
- Before the `{/* Slide 3: Station Analysis */}` comment, add:
  ```tsx
            {activeTab === 'stasiun' && (
  ```
- After the closing `</PresentationSlide>` at line 1675, add `)}`.

**`maskapai` tab** (line 1678–1951):
- Before `{/* Slide 4: Airline Analysis */}` comment, add:
  ```tsx
            {activeTab === 'maskapai' && (
  ```
- After the closing `</PresentationSlide>` at line 1951, add `)}`.

**`cgo` tab** (lines 1953–2204 and 2206–2407 — two slides):
- Before `{/* Slide CGO: CGO Case Category */}` comment, add:
  ```tsx
            {activeTab === 'cgo' && (
              <>
  ```
- After the closing `</PresentationSlide>` of the CGO Detail Report slide at line 2407, add:
  ```tsx
              </>
            )}
  ```

**`insights` tab** (line 2409–2516):
- Before `{/* Slide 5: Additional Insights */}` comment, add:
  ```tsx
            {activeTab === 'insights' && (
  ```
- After the closing `</PresentationSlide>` at line 2516, add `)}`.

**Step 4: Replace the closing of the return block**

The original closing is (line 2517):
```tsx
        </>
    );
```
Replace with:
```tsx
        </div>
    );
```

**Step 5: Add `cn` import if not already present**

Check the imports at the top of `AnalystCharts.tsx`. Search for `import.*cn.*from`. If `cn` is not imported, add:
```ts
import { cn } from '@/lib/utils';
```
after the existing imports.

**Step 6: Commit**

```bash
git add components/dashboard/analyst/AnalystCharts.tsx
git commit -m "feat(analyst): add tabbed navigation to AnalystCharts"
```

---

## Verification

After all 4 tasks are committed, visually verify:

1. **Header** — at `xl` breakpoint, Excel and PDF icon-only buttons appear alongside Feedback/Filter; at `2xl`, they show labels too; on mobile (below `xl`), they appear in the `MobileActionMenu` dropdown.
2. **Body** — on desktop (`lg+`), stats grid is 2 columns on the left (~40% width), reports table on the right (~60%); on mobile they stack vertically (stats first).
3. **Charts** — 5 pill tabs appear at top; clicking each tab shows only the corresponding chart slide(s); default tab is "Tren & Kategori".
4. **No regressions** — stats still clickable (drilldown), table still shows reports, modals still open.

---

## Notes for the Implementer

- This is a **pure UI refactor** — no API routes, no data logic, no type definitions for backend entities are touched.
- The `cn()` utility is from `@/lib/utils` and works like `clsx` — pass strings and conditionals to build className strings.
- `var(--brand-primary)`, `var(--surface-2)`, `var(--surface-3)`, `var(--text-muted)` are CSS variables defined in the project's global styles — use them as-is.
- `PresentationSlide` is a wrapper card component from `@/components/dashboard/PresentationSlide` — it renders a styled card with optional title/subtitle/icon props.
- The `MobileActionMenu` `actions` prop is `ActionItem[]` where each item has `{ label: string; icon?: ReactNode; onClick: () => void; variant?: 'default' | 'danger' | 'disabled' }`.
- Do **not** change the order of `AnalystCharts` props — the parent (`page.tsx`) passes them by name, order doesn't matter.
