# Analyst Dashboard Layout Redesign — Design Document

**Date**: 2026-02-20
**Status**: Approved

---

## Problem

The current analyst dashboard stacks every section vertically in a single column:

```
Header
Stats Grid (4 cards)
Export Buttons (standalone slide — disconnected from context)
Reports Table
AnalystCharts (6 PresentationSlide sections, no navigation)
```

Pain points:
- Export buttons float between stats and table with no clear owner
- On desktop, the narrow stats grid + wide table side-by-side is wasted
- Charts section has no way to jump between topics — user must scroll through all 6 slides

---

## Approved Design

### 1. Header — Add Export Actions

Move Excel and PDF export buttons into `ResponsiveHeader`, alongside existing action buttons.

**Desktop (xl)**: icon-only buttons `hidden xl:inline-flex`
**Desktop (2xl)**: icon + label `hidden 2xl:inline-flex` (swap with xl version)
**Mobile**: add to `MobileActionMenu` alongside Customer Feedback and Filter

Props to add to `ResponsiveHeaderProps`:
```ts
onExportExcel: () => void;
onExportPDF: () => void;
exporting: 'excel' | 'pdf' | null;
```

Remove the standalone export `<PresentationSlide>` block from `page.tsx`.

---

### 2. Body — Side-by-Side Grid (Desktop)

Replace the stacked stats → table layout with a responsive 5-column grid:

```
┌─────────────────────────────────────────────────────────┐
│  Stats Grid (lg:col-span-2)  │  Reports Table (lg:col-span-3) │
└─────────────────────────────────────────────────────────┘
```

- Mobile: single column, stacked (stats first, then table)
- `lg+`: side by side with `items-start` so each section can grow independently
- Stats grid gets a `compact` prop forcing `grid-cols-2` (2×2 layout)

Grid wrapper:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
  <div className="lg:col-span-2">
    <PresentationSlide ...>
      <ResponsiveStatsGrid stats={filteredStats} onStatClick={handleStatClick} compact />
    </PresentationSlide>
  </div>
  <div className="lg:col-span-3">
    <ReportsTableSection ... />
  </div>
</div>
```

---

### 3. Charts — Tabbed Navigation

Add a horizontal scrollable pill tab bar at the top of `AnalystCharts`. Each tab shows a logical grouping of the existing `PresentationSlide` sections.

**Tabs (5 total)**:

| Tab label | Slides included | Current slide content |
|---|---|---|
| Tren & Kategori | Slide 2 | Tren & Distribusi Kategori Landside & Airside + CGO |
| Stasiun | Slide 3 | Analisis Stasiun Landside & Airside + CGO |
| Maskapai | Slide 4 | Analisis Maskapai Landside & Airside + CGO |
| CGO | Slides 5 & 6 | CGO Case Category + CGO Detail Report |
| Insights | Slide 7 | Additional Insights |

Tab bar markup (Tailwind):
```tsx
const TABS = ['tren', 'stasiun', 'maskapai', 'cgo', 'insights'] as const;
const TAB_LABELS: Record<typeof TABS[number], string> = {
  tren: 'Tren & Kategori',
  stasiun: 'Stasiun',
  maskapai: 'Maskapai',
  cgo: 'CGO',
  insights: 'Insights',
};

<div className="overflow-x-auto pb-1">
  <div className="flex gap-2 min-w-max">
    {TABS.map(tab => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
          activeTab === tab
            ? 'bg-primary text-white'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        {TAB_LABELS[tab]}
      </button>
    ))}
  </div>
</div>
```

Conditional rendering wraps each group:
```tsx
{activeTab === 'tren' && <PresentationSlide>...</PresentationSlide>}
{activeTab === 'stasiun' && <PresentationSlide>...</PresentationSlide>}
{activeTab === 'maskapai' && <PresentationSlide>...</PresentationSlide>}
{activeTab === 'cgo' && (
  <>
    <PresentationSlide>...</PresentationSlide>
    <PresentationSlide>...</PresentationSlide>
  </>
)}
{activeTab === 'insights' && <PresentationSlide>...</PresentationSlide>}
```

---

## Files Changed

| File | Change |
|---|---|
| `app/dashboard/(main)/analyst/page.tsx` | Remove standalone export slide; add 2-col body grid; pass `onExportExcel`, `onExportPDF`, `exporting` to `ResponsiveHeader` |
| `components/dashboard/analyst/ResponsiveHeader.tsx` | Add export props + Excel/PDF buttons to action row and mobile menu |
| `components/dashboard/analyst/ResponsiveStatsGrid.tsx` | Add `compact?: boolean` prop that forces `grid-cols-2` |
| `components/dashboard/analyst/AnalystCharts.tsx` | Add `activeTab` state + tab bar + conditional slide rendering |

---

## Out of Scope

- Changing chart data, chart types, or filter logic
- Changing the reports table columns or sorting
- Fixing the Next.js 16.1.6 dev-server startup crash (separate issue)
