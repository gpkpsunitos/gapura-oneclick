# Analyst Dashboard Chart Enhancement Design

**Date:** 2026-02-20
**Scope:** `components/dashboard/analyst/AnalystCharts.tsx`
**Approach:** Full chart redesign — colors, sizing, layout, grid styling
**Style direction:** Clean professional light, Emerald + complementary accent hues

---

## 1. Color Palette

### Semantic Category Colors

| Token | Hex | Usage |
|---|---|---|
| Irregularity | `#059669` (Emerald-600) | Primary brand anchor |
| Complaint | `#0ea5e9` (Sky-500) | Cool blue complement |
| Compliment | `#f59e0b` (Amber-500) | Warm accent |
| Extended-1 | `#6366f1` (Indigo-500) | 4th data series |
| Extended-2 | `#ec4899` (Pink-500) | 5th data series |
| Extended-3 | `#14b8a6` (Teal-500) | 6th data series |
| Extended-4 | `#f97316` (Orange-500) | 7th data series |
| Extended-5 | `#8b5cf6` (Violet-500) | 8th data series |
| Neutral-low | `#e2e8f0` (Slate-200) | Empty/zero bars |

### UI Chrome Colors

| Token | Value | Usage |
|---|---|---|
| Text-primary | `#0f172a` | Chart titles, bold labels |
| Text-secondary | `#64748b` | Axis ticks, legend labels |
| Text-muted | `#94a3b8` | Subtitles, hints |
| Grid lines | `#f1f5f9` | CartesianGrid stroke |
| Border | `rgba(148,163,184,0.3)` | Card border (slate-400/30) |

### Changes from Current

```diff
- irregularity: '#81c784'  →  '#059669'
- complaint:    '#4fc3f7'  →  '#0ea5e9'
- compliment:   '#dce775'  →  '#f59e0b'
- COLORS array: ['#81c784','#13b5cb','#cddc39','#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899']
+ COLORS array: ['#059669','#0ea5e9','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#94a3b8']
```

### Heatmap Color Scale

Replace single-channel HSL with emerald range:
- Zero: `transparent`
- Low (ratio 0–0.3): `#d1fae5` → `#a7f3d0`
- Mid (ratio 0.3–0.7): `#6ee7b7` → `#34d399`
- High (ratio 0.7–1.0): `#10b981` → `#064e3b`
- Text: white when lightness < 52%, `#0f172a` otherwise

---

## 2. Chart Sizing & Proportions

### Chart Heights

| Chart Type | Before | After |
|---|---|---|
| Donut/Pie | 220px | 260px |
| Line chart | 220px | 270px |
| Bar chart (top-10) | 220px | 300px |
| Stacked bar (full width) | 280px | 340px |
| CGO line/bar charts | 220px | 270px |

### Pie/Donut Radii

| Property | Before | After |
|---|---|---|
| innerRadius | 55 | 65 |
| outerRadius | 85 | 100 |
| paddingAngle | 2 | 3 |

### Bar Chart Tuning

```diff
- barCategoryGap: default (~10%)  →  '25%'
- barSize: implicit                →  explicit max 32px
```

---

## 3. Layout & Placement

### Slide 1 (Tren & Distribusi) — Grid Reorder

**Before:** 2×2 (pie, line / pie, table) + full-width bar
**After:**
- Row 1: Line chart (2/3 width) + Pie: Case Category (1/3 width) — trend first, proportion second
- Row 2: Stacked bar full width — sub-category breakdown
- Row 3: Heatmap pivot table + Pie: Category by Area side-by-side

Rationale: narrative flow — time trend → proportional breakdown → geographic/branch detail.

### Slides 2–5 (Stasiun, Maskapai, CGO)

No structural grid changes — improve visual quality of existing layout only.

### Slide 6 (Wawasan Tambahan)

No layout changes — refine colors and bar list bar height only.

---

## 4. Grid, Axis & Tooltip Styling

### CartesianGrid

```diff
- strokeDasharray="3 3"  →  strokeDasharray="2 6"
- stroke="#e5e7eb"        →  stroke="#f1f5f9"
- strokeOpacity: 0.5      →  strokeOpacity: 1  (lighter stroke, not reduced opacity)
```

### Axis Ticks

```diff
- fill: '#374151'  →  fill: '#94a3b8'  (slate-400, subtler)
- fontSize: 10     →  fontSize: 11
```

### Tooltip

- Left border: 4px solid colored (category color) instead of dot
- Value font size: `text-2xl font-bold`
- Background: `bg-white/95 backdrop-blur-sm`
- Border: `border border-slate-200`
- Shadow: `shadow-lg shadow-slate-200/60`

---

## 5. Card Styling

```diff
- className: "bg-white rounded-lg border border-gray-200 p-4"
+ className: "bg-white rounded-xl border border-slate-200/70 shadow-sm p-5"
```

### Card Title

```diff
- className: "font-bold text-base text-gray-800 mb-1"
+ className: "font-semibold text-[13px] tracking-tight text-slate-900 mb-1"
```

### Card Subtitle

```diff
- className: "text-xs text-gray-500 mb-3"
+ className: "text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-3"
```

---

## 6. Heatmap Table Column Headers

Add semantic color top-border to category headers:

```diff
- <th className="text-center py-2 px-2 font-semibold text-gray-700">Irregularity</th>
+ <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-emerald-500">Irregularity</th>

- <th className="text-center py-2 px-2 font-semibold text-gray-700">Complaint</th>
+ <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-sky-500">Complaint</th>

- <th className="text-center py-2 px-2 font-semibold text-gray-700">Compliment</th>
+ <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-amber-500">Compliment</th>
```

---

## 7. Legend Styling

```diff
- <span className="text-xs text-gray-600">...</span>
+ <span className="text-[11px] font-medium text-slate-600">...</span>

- <div className="w-3 h-3 rounded-full" />
+ <div className="w-2.5 h-2.5 rounded-sm" />  (square legend dots — cleaner for bar/line charts)
```

---

## Files Changed

- `components/dashboard/analyst/AnalystCharts.tsx` — all chart visual updates

No new files. No structural/data logic changes.

---

## Out of Scope

- KPI summary strip (user explicitly excluded)
- Adding new chart types
- Data logic / calculation changes
- Any files other than AnalystCharts.tsx
