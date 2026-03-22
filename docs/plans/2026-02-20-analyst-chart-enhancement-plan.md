# Analyst Dashboard Chart Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance all charts across 6 analyst dashboard slides with a new semantic color palette, larger sizing, refined grid/axis/tooltip styling, improved card styling, and updated heatmap table headers.

**Architecture:** All changes are confined to a single file: `components/dashboard/analyst/AnalystCharts.tsx` (2519 lines). No new files. No data logic changes. Changes are purely visual/styling.

**Tech Stack:** React, Recharts, Tailwind CSS, TypeScript

---

## Task 1: Update Color Constants

**File:** `components/dashboard/analyst/AnalystCharts.tsx:163-170`

**Step 1: Replace REFERENCE_COLORS and COLORS constants**

Find (lines 163–170):
```ts
// Reference color scheme
const REFERENCE_COLORS = {
    irregularity: '#81c784',  // Light green
    complaint: '#4fc3f7',     // Light blue
    compliment: '#dce775',    // Light yellow-green
};

const COLORS = ['#81c784', '#13b5cb', '#cddc39', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
```

Replace with:
```ts
// Semantic color palette — Gapura Emerald + complementary hues
const REFERENCE_COLORS = {
    irregularity: '#059669',  // Emerald-600 (brand anchor)
    complaint: '#0ea5e9',     // Sky-500 (cool blue)
    compliment: '#f59e0b',    // Amber-500 (warm accent)
};

const COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#94a3b8'];
```

**Step 2: Update heatColor function (lines 255–263)**

Find:
```ts
function heatColor(value: number, max: number): { bg: string; fg: string } {
    if (value === 0 || max === 0) return { bg: 'transparent', fg: '#374151' };
    const ratio = value / max;
    const lightness = Math.round(90 - ratio * 62); // 90% → 28%
    return {
        bg: `hsl(142, 55%, ${lightness}%)`,
        fg: lightness < 52 ? '#ffffff' : '#374151',
    };
}
```

Replace with:
```ts
function heatColor(value: number, max: number): { bg: string; fg: string } {
    if (value === 0 || max === 0) return { bg: 'transparent', fg: '#475569' };
    const ratio = value / max;
    // Emerald perceptual scale: #d1fae5 (low) → #064e3b (high)
    const stops = [
        { r: 209, g: 250, b: 229 }, // #d1fae5
        { r: 167, g: 243, b: 208 }, // #a7f3d0
        { r: 110, g: 231, b: 183 }, // #6ee7b7
        { r: 52,  g: 211, b: 153 }, // #34d399
        { r: 16,  g: 185, b: 129 }, // #10b981
        { r: 5,   g: 150, b: 105 }, // #059669
        { r: 4,   g: 120, b: 87  }, // #047857
        { r: 6,   g: 78,  b: 59  }, // #064e3b
    ];
    const idx = Math.min(Math.floor(ratio * (stops.length - 1)), stops.length - 2);
    const t = ratio * (stops.length - 1) - idx;
    const s = stops[idx], e = stops[idx + 1];
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return {
        bg: `rgb(${r},${g},${b})`,
        fg: luminance < 0.45 ? '#ffffff' : '#0f172a',
    };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to these constants.

---

## Task 2: Update CustomTooltip Styling

**File:** `components/dashboard/analyst/AnalystCharts.tsx:210-251`

**Step 1: Update the pie tooltip (lines 222–230)**

Find:
```tsx
        return (
            <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[140px]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <p className="text-sm font-bold text-gray-900">{displayName}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color }}>{displayValue as number}</p>
                <p className="text-xs text-gray-500">laporan</p>
            </div>
        );
```

Replace with:
```tsx
        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 min-w-[140px]" style={{ borderLeft: `4px solid ${color}` }}>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">{displayName}</p>
                <p className="text-2xl font-bold text-slate-900">{displayValue as number}</p>
                <p className="text-[11px] text-slate-400 font-medium">laporan</p>
            </div>
        );
```

**Step 2: Update the bar/line tooltip (lines 233–250)**

Find:
```tsx
    return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[160px]">
            <p className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
            <div className="space-y-2">
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color || entry.fill }} />
                            <span className="text-xs text-gray-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: entry.color || entry.fill }}>
                            {entry.value}{entry.name?.includes('%') || entry.dataKey === 'rate' ? '%' : ''}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
```

Replace with:
```tsx
    return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 min-w-[160px]">
            <p className="text-[11px] font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100 uppercase tracking-wide">{label}</p>
            <div className="space-y-2">
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-sm" style={{ background: entry.color || entry.fill }} />
                            <span className="text-[11px] font-medium text-slate-500">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: entry.color || entry.fill }}>
                            {entry.value}{entry.name?.includes('%') || entry.dataKey === 'rate' ? '%' : ''}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
```

**Step 3: Update WrappedXAxisTick fill color (line 202)**

Find:
```tsx
                    fill="#6b7280"
                    fontSize={10}
```

Replace with:
```tsx
                    fill="#94a3b8"
                    fontSize={11}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 3: Update CategoryBarList Component

**File:** `components/dashboard/analyst/AnalystCharts.tsx:267-330`

**Step 1: Update the bar background and text styling**

Find (lines 281–296):
```tsx
                        <span className="text-xs text-gray-700 w-[140px] shrink-0 truncate" title={item.name}>
                            {item.name}
                        </span>
                        <div className="flex-1 flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-100 rounded-sm h-4 overflow-hidden">
                                <div
                                    className="h-full rounded-sm transition-all duration-300"
                                    style={{
                                        width: `${(item.value / maxValue) * 100}%`,
                                        backgroundColor: color,
                                    }}
                                />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-7 text-right shrink-0">
                                {item.value}
                            </span>
```

Replace with:
```tsx
                        <span className="text-[11px] font-medium text-slate-600 w-[140px] shrink-0 truncate" title={item.name}>
                            {item.name}
                        </span>
                        <div className="flex-1 flex items-center gap-1.5">
                            <div className="flex-1 bg-slate-100 rounded-sm h-3.5 overflow-hidden">
                                <div
                                    className="h-full rounded-sm transition-all duration-300"
                                    style={{
                                        width: `${(item.value / maxValue) * 100}%`,
                                        backgroundColor: color,
                                    }}
                                />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 w-7 text-right shrink-0">
                                {item.value}
                            </span>
```

**Step 2: Update the CategoryBarList color usages throughout the file**

In Slide 1 (lines ~1344–1375), find:
```tsx
<CategoryBarList data={terminalAreaCategoryData} color="#4ade80" />
```
Replace with:
```tsx
<CategoryBarList data={terminalAreaCategoryData} color="#059669" />
```

Find:
```tsx
<CategoryBarList data={apronAreaCategoryData} color="#60a5fa" />
```
Replace with:
```tsx
<CategoryBarList data={apronAreaCategoryData} color="#0ea5e9" />
```

In CGO Detail slide (lines ~2338–2358), find:
```tsx
<CategoryBarList data={cgoTerminalAreaCategoryData} color="#4ade80" />
```
Replace with:
```tsx
<CategoryBarList data={cgoTerminalAreaCategoryData} color="#059669" />
```

Find:
```tsx
<CategoryBarList data={cgoApronAreaCategoryData} color="#60a5fa" />
```
Replace with:
```tsx
<CategoryBarList data={cgoApronAreaCategoryData} color="#0ea5e9" />
```

---

## Task 4: Update Card Container Styling (Global Find-and-Replace)

**File:** `components/dashboard/analyst/AnalystCharts.tsx`

These are repetitive class changes across all slides.

**Step 1: Replace all plain white card containers**

Use replace_all for:

Pattern A — standard cards:
```
"bg-white rounded-lg border border-gray-200 p-4"
```
→
```
"bg-white rounded-xl border border-slate-200/70 shadow-sm p-5"
```

Pattern B — cards with flex:
```
"bg-white rounded-lg border border-gray-200 p-4 flex flex-col"
```
→
```
"bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col"
```

**Step 2: Replace card title classes**

Replace all:
```
"font-bold text-base text-gray-800 mb-1"
```
→
```
"font-semibold text-[13px] tracking-tight text-slate-900 mb-1"
```

Replace all:
```
"font-bold text-sm text-gray-800 mb-1"
```
→
```
"font-semibold text-[13px] tracking-tight text-slate-900 mb-1"
```

Replace all:
```
"font-bold text-sm text-gray-800 mb-3"
```
→
```
"font-semibold text-[13px] tracking-tight text-slate-900 mb-3"
```

Replace all:
```
"font-bold text-sm text-gray-800 mb-0.5"
```
→
```
"font-semibold text-[13px] tracking-tight text-slate-900 mb-0.5"
```

**Step 3: Replace card subtitle classes**

Replace all:
```
"text-xs text-gray-500 mb-3"
```
→
```
"text-[11px] font-medium text-slate-400 mb-3"
```

Replace all:
```
"text-[10px] text-gray-500 mb-3"
```
→
```
"text-[11px] font-medium text-slate-400 mb-3"
```

---

## Task 5: Update Grid, Axis & Bar Colors in Slide 1

**File:** `components/dashboard/analyst/AnalystCharts.tsx:980-1375`

**Step 1: Update CartesianGrid stroke in Slide 1 (lines ~1049, ~1219)**

Replace all occurrences of:
```
strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5}
```
→
```
strokeDasharray="2 6" vertical={false} stroke="#f1f5f9"
```

Replace all occurrences of:
```
strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"
```
→
```
strokeDasharray="2 6" vertical={false} stroke="#f1f5f9"
```

**Step 2: Update axis tick colors in Slide 1 line chart (lines ~1054–1060)**

Find:
```tsx
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#374151', fontSize: 10 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#374151', fontSize: 10 }}
                                        />
```

Replace with:
```tsx
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        />
```

**Step 3: Update line chart colors (lines ~1062–1080)**

Find:
```tsx
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            name="Laporan Masuk"
                                            stroke="#4fc3f7"
                                            strokeWidth={2}
                                            dot={{ fill: '#4fc3f7', strokeWidth: 0, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="resolved"
                                            name="Selesai"
                                            stroke="#81c784"
                                            strokeWidth={2}
                                            dot={{ fill: '#81c784', strokeWidth: 0, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
```

Replace with:
```tsx
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            name="Laporan Masuk"
                                            stroke="#0ea5e9"
                                            strokeWidth={2.5}
                                            dot={{ fill: '#0ea5e9', strokeWidth: 0, r: 3.5 }}
                                            activeDot={{ r: 5.5 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="resolved"
                                            name="Selesai"
                                            stroke="#059669"
                                            strokeWidth={2.5}
                                            dot={{ fill: '#059669', strokeWidth: 0, r: 3.5 }}
                                            activeDot={{ r: 5.5 }}
                                        />
```

**Step 4: Update line chart legend dots in Slide 1 (lines ~1085–1092)**

Find:
```tsx
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ background: '#4fc3f7' }} />
                                    <span className="text-xs text-gray-600">Laporan Masuk</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ background: '#81c784' }} />
                                    <span className="text-xs text-gray-600">Selesai</span>
                                </div>
```

Replace with:
```tsx
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#0ea5e9' }} />
                                    <span className="text-[11px] font-medium text-slate-600">Laporan Masuk</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#059669' }} />
                                    <span className="text-[11px] font-medium text-slate-600">Selesai</span>
                                </div>
```

**Step 5: Update pie chart sizes in Slide 1 (lines ~999–1002 and ~1108–1112)**

For both pie charts (Case Category and Category by Area), find:
```tsx
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={2}
```

Replace with:
```tsx
                                            innerRadius={65}
                                            outerRadius={100}
                                            paddingAngle={3}
```

**Step 6: Update pie chart heights (lines ~992 and ~1101)**

Find `h-[220px]` inside the pie chart wrappers in Slide 1 and replace with `h-[260px]`.

**Step 7: Update line chart height (line ~1043)**

Find:
```tsx
                            <div className="h-[220px]">
```
(the one wrapping the LineChart for Tren Penyelesaian Bulanan)

Replace with:
```tsx
                            <div className="h-[270px]">
```

**Step 8: Update stacked bar chart height (line ~1212)**

Find:
```tsx
                        <div className="h-[280px] sm:h-[320px]">
```

Replace with:
```tsx
                        <div className="h-[320px] sm:h-[360px]">
```

**Step 9: Update stacked bar CartesianGrid (line ~1219)**

Find:
```tsx
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
```

Replace with:
```tsx
                                    <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#f1f5f9" />
```

**Step 10: Update stacked bar YAxis tick color (line ~1221)**

Find:
```tsx
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
```

Replace with:
```tsx
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
```

**Step 11: Update stacked bar LabelList fill (line ~1235)**

Find:
```tsx
                                            fill="#6b7280"
```
(inside the LabelList in the stacked bar)

Replace with:
```tsx
                                            fill="#94a3b8"
```

**Step 12: Update stacked bar legend dot and text (lines ~1246–1250)**

Find:
```tsx
                                <div key={cat} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[10px] text-gray-600">{cat}</span>
                                </div>
```

Replace with:
```tsx
                                <div key={cat} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[11px] font-medium text-slate-600">{cat}</span>
                                </div>
```

---

## Task 6: Update Slide 1 Heatmap Pivot Table Headers

**File:** `components/dashboard/analyst/AnalystCharts.tsx:1133-1200`

**Step 1: Update Case Category by Branch pivot table header row**

Find:
```tsx
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-2 font-semibold text-gray-700">Branch</th>
                                                <th className="text-center py-2 px-2 font-semibold text-gray-700">Irregularity</th>
                                                <th className="text-center py-2 px-2 font-semibold text-gray-700">Complaint</th>
                                                <th className="text-center py-2 px-2 font-semibold text-gray-700">Compliment</th>
                                                <th className="text-center py-2 px-2 font-semibold text-gray-700">Grand total</th>
                                            </tr>
                                        </thead>
```

Replace with:
```tsx
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 px-2 font-semibold text-slate-700">Branch</th>
                                                <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-emerald-500">Irregularity</th>
                                                <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-sky-500">Complaint</th>
                                                <th className="text-center py-2 px-2 font-semibold text-slate-700 border-t-2 border-amber-500">Compliment</th>
                                                <th className="text-center py-2 px-2 font-semibold text-slate-700">Grand total</th>
                                            </tr>
                                        </thead>
```

**Step 2: Update pivot table grand total row**

Find (in the pivot table):
```tsx
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="py-2 px-2 text-gray-800">Grand total</td>
```

Replace with:
```tsx
                                        <tr className="bg-slate-100 font-bold">
                                            <td className="py-2 px-2 text-slate-800">Grand total</td>
```

**Step 3: Update CGO Case Category by Branch pivot table header (lines ~2101–2109)**

Find:
```tsx
                                                        <tr className="border-b border-gray-200">
                                                            <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Reporting Br...</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Complaint</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Irregularity</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Compliment</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Grand total</th>
                                                        </tr>
```

Replace with:
```tsx
                                                        <tr className="border-b border-slate-200">
                                                            <th className="text-left py-1.5 px-2 font-semibold text-slate-700">Reporting Br...</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-slate-700 border-t-2 border-sky-500">Complaint</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-slate-700 border-t-2 border-emerald-500">Irregularity</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-slate-700 border-t-2 border-amber-500">Compliment</th>
                                                            <th className="text-center py-1.5 px-2 font-semibold text-slate-700">Grand total</th>
                                                        </tr>
```

---

## Task 7: Update Slide 2 (Stasiun) Bar Colors and Table Headers

**File:** `components/dashboard/analyst/AnalystCharts.tsx:1378-1675`

**Step 1: Update "Total Laporan per Stasiun" bar fill (line ~1403)**

Find:
```tsx
                                    fill="#10b981"
```
(inside Slide 3 Stasiun bar chart)

Replace with:
```tsx
                                    fill="#059669"
```

**Step 2: Update "Kategori per Stasiun" grouped bar fills (lines ~1486–1494)**

Find:
```tsx
                                        <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="irregularity" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="complaint" name="Complaint" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="complaint" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="compliment" name="Compliment" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="compliment" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
```

Replace with:
```tsx
                                        <Bar dataKey="irregularity" name="Irregularity" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="irregularity" position="top" style={{ fill: '#94a3b8', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="complaint" name="Complaint" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="complaint" position="top" style={{ fill: '#94a3b8', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="compliment" name="Compliment" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="compliment" position="top" style={{ fill: '#94a3b8', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
```

**Step 3: Update detail area-by-branch table headers (bg-green-500 → bg-emerald-600)**

Find all occurrences of:
```tsx
                                    <thead className="bg-green-500 text-white sticky top-0 z-10">
```

Replace all with:
```tsx
                                    <thead className="bg-emerald-600 text-white sticky top-0 z-10">
```

---

## Task 8: Update Slide 3 (Maskapai) Bar Colors

**File:** `components/dashboard/analyst/AnalystCharts.tsx:1677-1951`

**Step 1: Update "Total Laporan Maskapai" bar fill (line ~1703)**

Find:
```tsx
                                    fill="#3b82f6"
```
(inside the Maskapai total bar chart)

Replace with:
```tsx
                                    fill="#0ea5e9"
```

**Step 2: Update "Kategori per Maskapai" grouped bar fills (lines ~1769–1771)**

Find:
```tsx
                                    <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="complaint" name="Complaint" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="compliment" name="Compliment" fill="#06b6d4" radius={[4, 4, 0, 0]} />
```

Replace with:
```tsx
                                    <Bar dataKey="irregularity" name="Irregularity" fill="#059669" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="complaint" name="Complaint" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="compliment" name="Compliment" fill="#f59e0b" radius={[4, 4, 0, 0]} />
```

---

## Task 9: Update CGO Slide 4 Chart Colors and Sizing

**File:** `components/dashboard/analyst/AnalystCharts.tsx:1953-2204`

**Step 1: Update all CGO horizontal bar chart fills (`#81c784` → `#059669`)**

Find all occurrences in CGO Slide 4:
```tsx
                                            <Bar dataKey="count" name="Laporan" fill="#81c784"
```

Replace all with:
```tsx
                                            <Bar dataKey="count" name="Laporan" fill="#059669"
```

**Step 2: Update CGO CartesianGrid strokes (lines ~1978–2079)**

Find all in CGO Slide 4:
```tsx
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
```

Replace all with:
```tsx
                                            <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="#f1f5f9" />
```

**Step 3: Update CGO axis tick fills**

Find all in CGO Slide 4:
```tsx
tick={{ fill: '#6b7280', fontSize: 10 }}
```

Replace all with:
```tsx
tick={{ fill: '#94a3b8', fontSize: 10 }}
```

Find all in CGO Slide 4:
```tsx
tick={{ fill: '#374151', fontSize: 11 }}
```

Replace all with:
```tsx
tick={{ fill: '#94a3b8', fontSize: 11 }}
```

Find all in CGO Slide 4:
```tsx
tick={{ fill: '#374151', fontSize: 10 }}
```

Replace all with:
```tsx
tick={{ fill: '#94a3b8', fontSize: 10 }}
```

**Step 4: Update CGO LabelList fill colors**

Find all in CGO Slide 4:
```tsx
style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
```

Replace all with:
```tsx
style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
```

**Step 5: Update CGO chart heights (h-[200px] → h-[230px])**

In CGO Slide 4, the 4 small bar charts (lines ~1971, ~1996, ~2018, ~2040) have `h-[200px]`. Replace all 4 with:
```tsx
                                <div className="h-[230px]">
```

The "Category by Area" chart (line ~2066) has `h-[220px]`. Replace with:
```tsx
                                <div className="h-[240px]">
```

---

## Task 10: Update CGO Detail Slide 5 Colors and Styling

**File:** `components/dashboard/analyst/AnalystCharts.tsx:2206-2519`

**Step 1: Update HUB Report bar fill (line ~2383)**

Find:
```tsx
                                <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={28}>
```
(Keep `#8b5cf6` — violet is fine as an Extended-5 color. No change needed here.)

**Step 2: Update HUB Report CartesianGrid and axis tick**

Find:
```tsx
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
```

Replace with:
```tsx
                                                <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
```

**Step 3: Update HUB Report height (line ~2372)**

Find:
```tsx
                                    <div className="h-[220px]">
```
(the one wrapping the HUB Report BarChart)

Replace with:
```tsx
                                    <div className="h-[250px]">
```

---

## Task 11: Final Verification

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Exit 0 (no errors).

**Step 2: Run dev server and visually check**

Run: `npm run dev`
Navigate to `/dashboard/analyst` and cycle through all 6 slides.

Verify per slide:
- [ ] Slide 1: Emerald pie, sky line, amber compliment, refined grid, larger charts
- [ ] Slide 2: Emerald bars, sky/amber category bars, emerald-600 table headers
- [ ] Slide 3: Sky total bar, emerald/sky/amber grouped bars
- [ ] Slide 4 (CGO): Emerald horizontal bars, correct pivot headers with color borders
- [ ] Slide 5 (CGO Detail): Emerald CategoryBarList, violet HUB bar
- [ ] All slides: shadow-sm cards, rounded-xl, slate text, refined tooltips

---

## Notes for Executor

- The file is 2519 lines. Use precise `old_string` context when making edits to avoid ambiguity.
- For global replace_all operations (Task 4), verify count of replacements — the card container class appears ~20 times.
- Do NOT touch any data logic, computed values, or handler functions.
- The `card-solid` class (used in Slides 2–3) is a CSS variable class from globals.css — do NOT replace it. Only replace `bg-white rounded-lg border border-gray-200 p-4` pattern.
- Test after each task by running `npx tsc --noEmit`.
