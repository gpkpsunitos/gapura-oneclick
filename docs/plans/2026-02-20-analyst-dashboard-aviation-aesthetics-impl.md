# Analyst Dashboard Aviation Aesthetics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform analyst dashboard into Aviation Command Center aesthetic with distinctive typography, enhanced emerald theme, and atmospheric effects.

**Architecture:** Systematic updates to CSS variables, font loading, component styling with focus on typography (Work Sans + Manrope + JetBrains Mono), enhanced emerald colors (no dark tones), glassmorphic cards with gradient borders, and spring physics animations.

**Tech Stack:** Next.js 14, React, Tailwind CSS, CSS Variables (OKLCH), Google Fonts, Recharts

---

## Task 1: Install Fonts

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`

**Step 1: Install font packages**

```bash
npm install @fontsource/work-sans @fontsource/manrope @fontsource/jetbrains-mono
```

Expected: Packages installed successfully

**Step 2: Import fonts in layout**

Add to `app/layout.tsx` after imports:

```typescript
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/work-sans/700.css';
import '@fontsource/work-sans/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
```

**Step 3: Verify fonts load**

```bash
npm run dev
```

Check browser DevTools → Network → Filter by "font" → Should see Work Sans, Manrope, JetBrains Mono loading

**Step 4: Commit**

```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "feat: add aviation-inspired fonts (Work Sans, Manrope, JetBrains Mono)"
```

---

## Task 2: Update CSS Variables (Colors & Surfaces)

**Files:**
- Modify: `app/globals.css:10-76`

**Step 1: Update surface colors with emerald tint**

In `app/globals.css`, replace surface variables (lines 16-20):

```css
  /* Elevated surface system - subtle emerald atmosphere */
  --surface-0: oklch(0.99 0.005 160);    /* Page background */
  --surface-1: oklch(0.98 0.008 160);    /* Elevation layer 1 */
  --surface-2: oklch(0.97 0.012 160);    /* Card backgrounds */
  --surface-3: oklch(0.95 0.015 160);    /* Hover states */
  --surface-4: oklch(0.92 0.02 160);     /* Active/pressed states */
  --surface-glass: oklch(1 0 0 / 0.65);  /* High-transparency glass */
```

**Step 2: Update brand emerald colors (no dark tones)**

Replace brand aurora variables (lines 22-26):

```css
  /* Command center emerald - bright, saturated, no dark tones */
  --brand-emerald-50: oklch(0.95 0.05 165);
  --brand-emerald-100: oklch(0.90 0.08 163);
  --brand-emerald-400: oklch(0.70 0.16 160);
  --brand-emerald-500: oklch(0.65 0.18 160);  /* Primary brand */
  --brand-emerald-600: oklch(0.58 0.2 162);
  --brand-emerald-700: oklch(0.55 0.18 164);  /* Medium emerald - not dark */

  --brand-primary: var(--brand-emerald-500);
  --brand-accent: oklch(0.6 0.14 240);
```

**Step 3: Add technical accent colors**

After brand variables:

```css
  /* Aviation-inspired accents */
  --accent-cyan: oklch(0.7 0.15 200);
  --accent-amber: oklch(0.75 0.14 75);
  --accent-coral: oklch(0.65 0.18 25);
  --accent-purple: oklch(0.62 0.16 280);
```

**Step 4: Update text colors (dark for readability)**

Replace text variables (lines 30-33):

```css
  /* Dark text with emerald undertone for readability */
  --text-primary: oklch(0.25 0.04 160);
  --text-secondary: oklch(0.45 0.05 160);
  --text-muted: oklch(0.60 0.03 160);
  --text-on-brand: oklch(0.98 0.01 160);
```

**Step 5: Test in browser**

```bash
npm run dev
```

Open http://localhost:3000/dashboard/analyst
Expected: Subtle emerald tint on surfaces, brighter emerald accents

**Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat: update color system with aviation emerald palette (bright tones only)"
```

---

## Task 3: Update Typography Variables

**Files:**
- Modify: `app/globals.css:59-76`

**Step 1: Update font family variables**

Replace font variables (around line 61-62):

```css
  --font-display: "Work Sans", system-ui, sans-serif;
  --font-body: "Manrope", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Courier New", monospace;
```

**Step 2: Update type scale**

Keep existing scale but ensure these values:

```css
  --text-hero: clamp(2.5rem, 2rem + 3vw, 4rem);
  --text-4xl: clamp(1.5rem, 1.25rem + 1.5vw, 2rem);
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
```

**Step 3: Test typography in browser**

```bash
npm run dev
```

Check that dashboard title uses Work Sans, body text uses Manrope

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: update typography system with Work Sans, Manrope, JetBrains Mono"
```

---

## Task 4: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.js:10-94`

**Step 1: Add font families to Tailwind**

Update fontFamily in theme.extend (around line 38-41):

```javascript
fontFamily: {
  display: ['Work Sans', 'system-ui', 'sans-serif'],
  body: ['Manrope', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Courier New', 'monospace'],
},
```

**Step 2: Add emerald color tokens**

Add to colors in theme.extend:

```javascript
colors: {
  surface: {
    0: 'var(--surface-0)',
    1: 'var(--surface-1)',
    2: 'var(--surface-2)',
    3: 'var(--surface-3)',
    4: 'var(--surface-4)',
    glass: 'var(--surface-glass)',
  },
  brand: {
    emerald: {
      50: 'var(--brand-emerald-50)',
      100: 'var(--brand-emerald-100)',
      400: 'var(--brand-emerald-400)',
      500: 'var(--brand-emerald-500)',
      600: 'var(--brand-emerald-600)',
      700: 'var(--brand-emerald-700)',
    },
    primary: 'var(--brand-primary)',
    accent: 'var(--brand-accent)',
  },
  accent: {
    cyan: 'var(--accent-cyan)',
    amber: 'var(--accent-amber)',
    coral: 'var(--accent-coral)',
    purple: 'var(--accent-purple)',
  },
  text: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    'on-brand': 'var(--text-on-brand)',
  },
},
```

**Step 3: Add custom animations**

Update keyframes in theme.extend:

```javascript
keyframes: {
  auroraFlow: {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  prismReveal: {
    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
  },
  fadeInUp: {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '200% 0' },
    '100%': { backgroundPosition: '-200% 0' },
  },
  emergencyPulse: {
    '0%, 100%': { boxShadow: '0 0 0 0 oklch(0.65 0.18 160 / 0.4)' },
    '50%': { boxShadow: '0 0 0 8px oklch(0.65 0.18 160 / 0)' },
  },
},
animation: {
  'aurora-flow': 'auroraFlow 20s ease infinite alternate',
  'prism-reveal': 'prismReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  'fade-in-up': 'fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  'shimmer': 'shimmer 1.5s infinite',
  'emergency-pulse': 'emergencyPulse 2s ease-in-out infinite',
},
```

**Step 4: Test Tailwind classes**

```bash
npm run dev
```

Try using `font-display`, `text-brand-emerald-500` in a component to verify

**Step 5: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add aviation theme tokens and animations to Tailwind"
```

---

## Task 5: Update Page Background with Grid Pattern

**Files:**
- Modify: `app/dashboard/(main)/analyst/page.tsx:665-666`

**Step 1: Add grid pattern wrapper**

Wrap the main container div (around line 665) with grid pattern:

```tsx
return (
  <div
    className="min-h-screen"
    style={{
      backgroundImage: `
        linear-gradient(oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
        linear-gradient(90deg, oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
        radial-gradient(circle at 0% 0%, oklch(0.65 0.18 160 / 0.08) 0%, transparent 40%),
        radial-gradient(circle at 100% 100%, oklch(0.58 0.2 162 / 0.06) 0%, transparent 40%)
      `,
      backgroundSize: '24px 24px, 24px 24px, 100% 100%, 100% 100%',
      backgroundPosition: '0 0, 0 0, 0 0, 0 0',
      backgroundColor: 'var(--surface-0)',
    }}
  >
    <div className="space-y-4 sm:space-y-6 pb-24 px-3 sm:px-4 lg:px-6">
      {/* existing content */}
    </div>
  </div>
);
```

**Step 2: Test grid visibility**

```bash
npm run dev
```

Expected: Subtle emerald grid pattern on page background with corner gradients

**Step 3: Commit**

```bash
git add app/dashboard/(main)/analyst/page.tsx
git commit -m "feat: add technical grid pattern and corner mesh gradients to analyst page"
```

---

## Task 6: Update Header Component (Typography & Styling)

**Files:**
- Modify: `components/dashboard/analyst/ResponsiveHeader.tsx:94-103`

**Step 1: Update title typography**

Replace title (around line 97-99):

```tsx
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-text-primary">
  Pusat Komando & Analytics
</h1>
```

**Step 2: Update subtitle with emerald color**

Replace subtitle (around line 100-102):

```tsx
<p className="text-sm sm:text-base font-body font-medium text-brand-emerald-700">
  Divisi Operational Services Center
</p>
```

**Step 3: Update date range segmented control styling**

Replace the desktop segmented control section (lines 110-125):

```tsx
<div className="hidden sm:flex p-1.5 rounded-2xl bg-[oklch(0.97_0.012_160_/_0.6)] backdrop-blur-xl border border-[oklch(0.65_0.18_160_/_0.15)] shadow-[inset_0_1px_2px_oklch(0.45_0.06_160_/_0.06)]">
  {dateRangeOptions.map((option) => (
    <button
      key={option.value}
      onClick={() => onDateRangeChange(option.value)}
      className={cn(
        'px-5 py-2.5 text-[11px] font-display font-black uppercase tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap min-h-[40px]',
        dateRange === option.value
          ? 'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)] shadow-lg shadow-emerald-500/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-[oklch(0.95_0.015_160_/_0.5)]'
      )}
    >
      {option.label}
    </button>
  ))}
</div>
```

**Step 4: Update primary buttons**

Update Customer Feedback button (around lines 166-183):

```tsx
<Button
  onClick={onCustomerFeedback}
  disabled={cfLoading}
  className={cn(
    'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-6',
    'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)]',
    'rounded-2xl border-0 shadow-lg shadow-emerald-500/20 transition-all duration-300',
    'hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 font-display font-bold',
    cfLoading && 'opacity-70 cursor-not-allowed'
  )}
>
  {cfLoading ? (
    <Loader2 size={16} className="animate-spin" />
  ) : (
    <LayoutDashboard size={16} />
  )}
  <span className="hidden 2xl:inline tracking-tight">Feedback</span>
</Button>
```

**Step 5: Update Create Report button**

Update button around lines 246-255:

```tsx
<Button
  onClick={() => router.push('/dashboard/employee/new')}
  className={cn(
    'min-h-[48px] px-6 rounded-2xl font-display font-bold tracking-tight transition-all duration-300',
    'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)]',
    'hover:shadow-xl hover:-translate-y-0.5 active:scale-95'
  )}
>
  <Plus size={18} className="sm:mr-2" />
  <span className="hidden sm:inline">Laporan</span>
</Button>
```

**Step 6: Test header styling**

```bash
npm run dev
```

Expected: Work Sans font in title, emerald gradient buttons, updated segmented control

**Step 7: Commit**

```bash
git add components/dashboard/analyst/ResponsiveHeader.tsx
git commit -m "feat: apply aviation typography and emerald styling to analyst header"
```

---

## Task 7: Update Stats Cards Component

**Files:**
- Create: `components/dashboard/analyst/StatsCard.tsx`
- Modify: `components/dashboard/analyst/ResponsiveStatsGrid.tsx`

**Step 1: Create enhanced StatsCard component**

Create new file `components/dashboard/analyst/StatsCard.tsx`:

```tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({ icon: Icon, value, label, onClick, className }: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl p-6 transition-all duration-400 cursor-pointer',
        'bg-surface-2 border border-transparent',
        'hover:-translate-y-1',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))
        `,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 2px 8px oklch(0.45 0.06 160 / 0.04)',
        transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundImage = `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.3), oklch(0.58 0.2 162 / 0.15))
        `;
        e.currentTarget.style.boxShadow = '0 8px 24px oklch(0.45 0.06 160 / 0.06), 0 16px 48px oklch(0.65 0.18 160 / 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundImage = `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))
        `;
        e.currentTarget.style.boxShadow = '0 2px 8px oklch(0.45 0.06 160 / 0.04)';
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[oklch(0.65_0.18_160_/_0.1)] mb-4">
        <Icon className="w-6 h-6 text-brand-emerald-600" />
      </div>

      {/* Value */}
      <div className="font-mono font-semibold text-3xl sm:text-4xl text-brand-emerald-600 tracking-tight mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Label */}
      <div className="font-display font-semibold text-xs uppercase tracking-widest text-text-secondary">
        {label}
      </div>
    </div>
  );
}
```

**Step 2: Update ResponsiveStatsGrid to use new component**

Modify `components/dashboard/analyst/ResponsiveStatsGrid.tsx`:

```tsx
'use client';

import { TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface ResponsiveStatsGridProps {
  stats: {
    total: number;
    resolved: number;
    pending: number;
    highSeverity: number;
    resolutionRate: number;
  };
  onStatClick?: (type: 'total' | 'resolved' | 'pending' | 'high') => void;
  compact?: boolean;
}

export function ResponsiveStatsGrid({ stats, onStatClick, compact }: ResponsiveStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
      <StatsCard
        icon={TrendingUp}
        value={stats.total}
        label="Total Reports"
        onClick={() => onStatClick?.('total')}
      />
      <StatsCard
        icon={CheckCircle2}
        value={stats.resolved}
        label="Resolved"
        onClick={() => onStatClick?.('resolved')}
      />
      <StatsCard
        icon={Clock}
        value={stats.pending}
        label="Pending"
        onClick={() => onStatClick?.('pending')}
      />
      <StatsCard
        icon={AlertTriangle}
        value={stats.highSeverity}
        label="High Priority"
        onClick={() => onStatClick?.('high')}
      />
    </div>
  );
}
```

**Step 3: Test stats cards**

```bash
npm run dev
```

Expected: Cards with JetBrains Mono numbers, Work Sans labels, emerald gradient borders on hover

**Step 4: Commit**

```bash
git add components/dashboard/analyst/StatsCard.tsx components/dashboard/analyst/ResponsiveStatsGrid.tsx
git commit -m "feat: create aviation-styled stats cards with enhanced emerald borders"
```

---

## Task 8: Create Chart Configuration File

**Files:**
- Create: `lib/aviation-chart-config.ts`

**Step 1: Create chart color constants**

Create `lib/aviation-chart-config.ts`:

```typescript
/**
 * Aviation Command Center Chart Configuration
 * Distinctive color palette avoiding generic defaults
 */

export const AVIATION_CHART_COLORS = {
  primary: 'oklch(0.65 0.18 160)',      // Emerald
  secondary: 'oklch(0.7 0.15 200)',     // Cyan
  tertiary: 'oklch(0.75 0.14 75)',      // Amber
  quaternary: 'oklch(0.62 0.16 280)',   // Purple
  quinary: 'oklch(0.68 0.15 30)',       // Coral-red

  // Category-specific
  irregularity: 'oklch(0.65 0.18 160)', // Emerald
  complaint: 'oklch(0.65 0.18 25)',     // Coral
  compliment: 'oklch(0.7 0.15 200)',    // Cyan
} as const;

export const CHART_AXIS_STYLE = {
  tick: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    fontWeight: 500,
    fill: 'var(--text-muted)',
  },
  axisLine: {
    stroke: 'oklch(0.65 0.18 160 / 0.15)',
  },
  grid: {
    stroke: 'oklch(0.65 0.18 160 / 0.08)',
    strokeDasharray: '3 3',
  },
} as const;

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'oklch(0.99 0.005 160 / 0.95)',
    backdropFilter: 'blur(16px)',
    border: '1px solid oklch(0.65 0.18 160 / 0.2)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px oklch(0.45 0.06 160 / 0.12)',
    fontFamily: 'Manrope, sans-serif',
  },
  labelStyle: {
    fontFamily: 'Work Sans, sans-serif',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  itemStyle: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    fontWeight: 500,
  },
} as const;

export const CHART_LEGEND_STYLE = {
  wrapperStyle: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: '13px',
    fontWeight: 500,
  },
} as const;
```

**Step 2: Commit**

```bash
git add lib/aviation-chart-config.ts
git commit -m "feat: create aviation chart configuration with distinctive colors"
```

---

## Task 9: Update Chart Title Component

**Files:**
- Create: `components/charts/ChartTitle.tsx`

**Step 1: Create ChartTitle component**

Create `components/charts/ChartTitle.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';

interface ChartTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function ChartTitle({ title, subtitle, className }: ChartTitleProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h3 className="font-display font-bold text-lg sm:text-xl text-text-primary tracking-tight">
        {title}
        {subtitle && (
          <span className="font-body font-medium text-sm sm:text-base text-text-secondary tracking-normal ml-2">
            — {subtitle}
          </span>
        )}
      </h3>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/charts/ChartTitle.tsx
git commit -m "feat: create ChartTitle component with Work Sans typography"
```

---

## Task 10: Update AnalystCharts Component (Sample Charts)

**Files:**
- Modify: `components/dashboard/analyst/AnalystCharts.tsx:1-100`

**Step 1: Import chart configuration**

Add imports at top of file:

```typescript
import { AVIATION_CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE, CHART_LEGEND_STYLE } from '@/lib/aviation-chart-config';
import { ChartTitle } from '@/components/charts/ChartTitle';
```

**Step 2: Update one chart as example (Case Category Pie)**

Find the Case Category chart section and update:

```tsx
<PresentationSlide className="relative">
  <ChartTitle
    title="Case Category Distribution"
    subtitle="Landside, Airside & CGO"
  />
  <ResponsiveContainer width="100%" height={320}>
    <RechartsPie>
      <Pie
        data={caseCategoryData}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={100}
        fill={AVIATION_CHART_COLORS.primary}
        dataKey="value"
        animationBegin={200}
        animationDuration={600}
      >
        {caseCategoryData.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={
              entry.name === 'Irregularity' ? AVIATION_CHART_COLORS.irregularity :
              entry.name === 'Complaint' ? AVIATION_CHART_COLORS.complaint :
              AVIATION_CHART_COLORS.compliment
            }
          />
        ))}
      </Pie>
      <Tooltip {...CHART_TOOLTIP_STYLE} />
      <Legend {...CHART_LEGEND_STYLE} />
    </RechartsPie>
  </ResponsiveContainer>
</PresentationSlide>
```

**Step 3: Add atmospheric background to PresentationSlide**

Each chart slide should have subtle pattern. Example wrapper:

```tsx
<PresentationSlide
  className="relative"
  style={{
    backgroundImage: `
      repeating-linear-gradient(
        2deg,
        transparent,
        transparent 20px,
        oklch(0.65 0.18 160 / 0.02) 20px,
        oklch(0.65 0.18 160 / 0.02) 21px
      )
    `,
    backgroundColor: 'var(--surface-1)',
  }}
>
  {/* chart content */}
</PresentationSlide>
```

**Step 4: Test chart styling**

```bash
npm run dev
```

Expected: Chart title in Work Sans, axis labels in JetBrains Mono, aviation colors

**Step 5: Commit**

```bash
git add components/dashboard/analyst/AnalystCharts.tsx
git commit -m "feat: apply aviation styling to analyst charts (colors, typography, backgrounds)"
```

---

## Task 11: Update Remaining Charts (Systematic)

**Files:**
- Modify: `components/dashboard/analyst/AnalystCharts.tsx` (all chart sections)

**Step 1: Apply pattern to all bar charts**

For each BarChart component:
- Add ChartTitle with subtitle
- Apply AVIATION_CHART_COLORS
- Add CHART_AXIS_STYLE to XAxis/YAxis
- Add CHART_TOOLTIP_STYLE to Tooltip
- Add CHART_LEGEND_STYLE to Legend
- Wrap in PresentationSlide with atmospheric background

**Step 2: Apply pattern to all line charts**

Same as Step 1 for LineChart components

**Step 3: Apply pattern to all area charts**

Same as Step 1 for AreaChart components

**Step 4: Apply pattern to all composed charts**

Same as Step 1 for ComposedChart components

**Step 5: Test all charts**

```bash
npm run dev
```

Scroll through analyst dashboard, verify all charts have:
- Work Sans titles
- JetBrains Mono axis labels
- Aviation color palette
- Subtle background patterns

**Step 6: Commit**

```bash
git add components/dashboard/analyst/AnalystCharts.tsx
git commit -m "feat: apply aviation styling to all analyst charts systematically"
```

---

## Task 12: Update Table Component Styling

**Files:**
- Modify: `components/dashboard/analyst/ReportsTableSection.tsx`

**Step 1: Update table header styling**

Find table header row and update className:

```tsx
<thead className="bg-brand-emerald-500 text-text-on-brand">
  <tr>
    <th className="px-4 py-4 text-left font-display font-semibold text-xs uppercase tracking-widest">
      ID
    </th>
    {/* other headers */}
  </tr>
</thead>
```

**Step 2: Update table cell typography**

Regular cells:

```tsx
<td className="px-4 py-3 font-body font-normal text-sm text-text-primary">
  {report.description}
</td>
```

Technical cells (IDs, codes, dates):

```tsx
<td className="px-4 py-3 font-mono font-medium text-sm text-brand-emerald-700">
  {report.id}
</td>
```

**Step 3: Update row hover states**

```tsx
<tr className="border-b border-[oklch(0.65_0.18_160_/_0.08)] hover:bg-brand-emerald-50 transition-colors duration-200">
  {/* cells */}
</tr>
```

**Step 4: Add alternating row backgrounds**

```tsx
<tr className={cn(
  "border-b border-[oklch(0.65_0.18_160_/_0.08)] transition-colors duration-200",
  "hover:bg-brand-emerald-50",
  index % 2 === 1 && "bg-[oklch(0.99_0.005_160_/_0.5)]"
)}>
  {/* cells */}
</tr>
```

**Step 5: Test table styling**

```bash
npm run dev
```

Expected: Emerald header, monospace for IDs/codes, alternating rows

**Step 6: Commit**

```bash
git add components/dashboard/analyst/ReportsTableSection.tsx
git commit -m "feat: apply aviation typography and emerald styling to reports table"
```

---

## Task 13: Add Page Staggered Animation

**Files:**
- Modify: `app/dashboard/(main)/analyst/page.tsx:665-730`

**Step 1: Add animation delays to main sections**

Update main sections with staggered animation:

```tsx
{/* Header Section */}
<PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
  <ResponsiveHeader {...headerProps} />
</PresentationSlide>

{/* Body: Stats + Table */}
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
  <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
    <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
      <ResponsiveStatsGrid {...statsProps} />
    </PresentationSlide>
  </div>
  <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
    <ReportsTableSection {...tableProps} />
  </div>
</div>

{/* Charts */}
<div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
  <AnalystCharts {...chartProps} />
</div>
```

**Step 2: Test animation sequence**

```bash
npm run dev
```

Reload page, watch sections fade in sequentially

**Step 3: Commit**

```bash
git add app/dashboard/(main)/analyst/page.tsx
git commit -m "feat: add staggered fade-in animations to analyst dashboard sections"
```

---

## Task 14: Add Enhanced Card Borders to PresentationSlide

**Files:**
- Modify: `components/dashboard/PresentationSlide.tsx`

**Step 1: Read current PresentationSlide component**

Check what props and styling it currently has

**Step 2: Add gradient border effect**

Update the component to support gradient borders:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { ReactNode, CSSProperties } from 'react';

interface PresentationSlideProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function PresentationSlide({ children, className, style, onClick }: PresentationSlideProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-6 transition-all duration-400',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid transparent',
        backgroundImage: `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))
        `,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 2px 8px oklch(0.45 0.06 160 / 0.04)',
        position: 'relative',
        ...style,
      }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
```

**Step 3: Test card appearance**

```bash
npm run dev
```

Expected: Cards have emerald gradient borders, subtle noise texture

**Step 4: Commit**

```bash
git add components/dashboard/PresentationSlide.tsx
git commit -m "feat: add gradient borders and noise texture to PresentationSlide cards"
```

---

## Task 15: Add Hover Effects to Interactive Elements

**Files:**
- Modify: `components/dashboard/analyst/StatsCard.tsx`
- Modify: `components/dashboard/PresentationSlide.tsx`

**Step 1: Enhanced hover for StatsCard** (already done in Task 7)

Verify hover effects work as expected

**Step 2: Add hover to clickable PresentationSlides**

Update PresentationSlide hover when onClick is provided:

```tsx
export function PresentationSlide({ children, className, style, onClick }: PresentationSlideProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setIsHovered(true)}
      onMouseLeave={() => onClick && setIsHovered(false)}
      className={cn(
        'rounded-2xl p-6 transition-all duration-400',
        onClick && 'cursor-pointer',
        isHovered && onClick && '-translate-y-1',
        className
      )}
      style={{
        // ... existing styles
        boxShadow: isHovered && onClick
          ? '0 8px 24px oklch(0.45 0.06 160 / 0.06), 0 16px 48px oklch(0.65 0.18 160 / 0.08)'
          : '0 2px 8px oklch(0.45 0.06 160 / 0.04)',
        backgroundImage: isHovered && onClick
          ? `linear-gradient(var(--surface-2), var(--surface-2)), linear-gradient(135deg, oklch(0.65 0.18 160 / 0.3), oklch(0.58 0.2 162 / 0.15))`
          : `linear-gradient(var(--surface-2), var(--surface-2)), linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))`,
        ...style,
      }}
    >
      {/* ... rest */}
    </div>
  );
}
```

**Step 3: Test hover interactions**

```bash
npm run dev
```

Hover over stats cards and clickable chart cards

**Step 4: Commit**

```bash
git add components/dashboard/PresentationSlide.tsx
git commit -m "feat: add enhanced hover effects to interactive cards"
```

---

## Task 16: Final Quality Check & Polish

**Files:**
- Test all components visually

**Step 1: Full visual audit**

```bash
npm run dev
```

Navigate to analyst dashboard and check:
- [ ] Page background has grid + corner gradients
- [ ] Header uses Work Sans (title) and Manrope (subtitle)
- [ ] Date range control has emerald gradient when active
- [ ] Stats cards have JetBrains Mono numbers, emerald borders
- [ ] Charts have Work Sans titles, JetBrains Mono axes
- [ ] Charts use aviation color palette (not defaults)
- [ ] Table header is emerald background
- [ ] Table IDs/codes use JetBrains Mono
- [ ] Staggered page load animation works
- [ ] Hover effects work on cards and buttons
- [ ] No dark colors anywhere (all bright tones)

**Step 2: Responsive check**

Test on mobile (375px), tablet (768px), desktop (1440px)

**Step 3: Performance check**

Check font loading doesn't block render:
- Open DevTools → Network
- Reload page
- Verify fonts load with `font-display: swap`

**Step 4: Accessibility check**

```bash
npm run dev
```

Open DevTools → Lighthouse → Accessibility
- Target: 90+ score
- Check color contrast (bright text on bright bg)
- Check reduced motion support

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final aviation aesthetics polish and quality checks"
```

---

## Task 17: Documentation Update

**Files:**
- Create: `docs/aviation-aesthetics-guide.md`

**Step 1: Create usage guide**

Create `docs/aviation-aesthetics-guide.md`:

```markdown
# Aviation Aesthetics Usage Guide

## Typography

### Font Families

- **Display/Headers**: Work Sans (font-display)
- **Body Text**: Manrope (font-body)
- **Technical Data**: JetBrains Mono (font-mono)

### When to Use Each

**Work Sans:**
- Dashboard titles
- Chart titles
- Button labels
- Section headers
- Uppercase labels

**Manrope:**
- Body copy
- Descriptions
- Table content (non-technical)
- Tooltips
- Modal content

**JetBrains Mono:**
- Report IDs
- Station codes
- Timestamps
- Numeric values in charts
- Flight numbers
- Any technical identifiers

## Colors

### Primary Palette

```css
--brand-emerald-500  /* Primary actions, accents */
--brand-emerald-600  /* Gradients, hover states */
--brand-emerald-700  /* Medium emphasis */
```

### Usage

- **Buttons**: Use emerald-500 → emerald-600 gradient
- **Text**: Use text-primary (medium emerald-gray), text-secondary (lighter)
- **Borders**: Use emerald with 10-30% opacity
- **Charts**: Import from lib/aviation-chart-config.ts

### Color Guidelines

**Dark Text on Light Backgrounds:**
- Text uses dark colors for maximum readability
- `--text-primary`: Dark emerald-gray (oklch 0.25)
- `--text-secondary`: Medium emerald-gray (oklch 0.45)

**No Dark Backgrounds:**
- All surfaces remain bright and light
- Avoid dark background colors
- Keep surface lightness > 0.90

## Components

### Using ChartTitle

```tsx
import { ChartTitle } from '@/components/charts/ChartTitle';

<ChartTitle
  title="Main Title"
  subtitle="Context or scope"
/>
```

### Using StatsCard

```tsx
import { StatsCard } from '@/components/dashboard/analyst/StatsCard';
import { TrendingUp } from 'lucide-react';

<StatsCard
  icon={TrendingUp}
  value={1234}
  label="Metric Name"
  onClick={handleClick}
/>
```

### Chart Styling

Always import configuration:

```tsx
import {
  AVIATION_CHART_COLORS,
  CHART_AXIS_STYLE,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_STYLE
} from '@/lib/aviation-chart-config';

<BarChart>
  <XAxis {...CHART_AXIS_STYLE} />
  <YAxis {...CHART_AXIS_STYLE} />
  <Tooltip {...CHART_TOOLTIP_STYLE} />
  <Legend {...CHART_LEGEND_STYLE} />
  <Bar dataKey="value" fill={AVIATION_CHART_COLORS.primary} />
</BarChart>
```

## Animations

### Page Load Stagger

Use `animate-fade-in-up` with delays:

```tsx
<div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>...</div>
<div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>...</div>
<div className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>...</div>
```

### Hover Effects

Built into StatsCard and PresentationSlide components.

## Backgrounds

### Grid Pattern

```tsx
style={{
  backgroundImage: `
    linear-gradient(oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px)
  `,
  backgroundSize: '24px 24px',
}}
```

### Corner Mesh Gradients

```tsx
style={{
  backgroundImage: `
    radial-gradient(circle at 0% 0%, oklch(0.65 0.18 160 / 0.08) 0%, transparent 40%),
    radial-gradient(circle at 100% 100%, oklch(0.58 0.2 162 / 0.06) 0%, transparent 40%)
  `,
}}
```

### Chart Backgrounds

Use subtle diagonal stripes at 1-2% opacity.
```

**Step 2: Commit documentation**

```bash
git add docs/aviation-aesthetics-guide.md
git commit -m "docs: add aviation aesthetics usage guide"
```

---

## Completion Checklist

- [x] Fonts installed and loaded
- [x] CSS variables updated (colors, surfaces, text)
- [x] Typography system configured
- [x] Tailwind config extended
- [x] Page background with grid + gradients
- [x] Header component styled
- [x] Stats cards enhanced
- [x] Chart configuration created
- [x] Charts updated with aviation styling
- [x] Table component styled
- [x] Page animations added
- [x] Card borders enhanced
- [x] Hover effects implemented
- [x] Quality checks completed
- [x] Documentation created

## Success Metrics

After implementation:

1. **No generic fonts**: Inter/Roboto completely removed
2. **No dark backgrounds**: All surfaces bright (lightness > 0.90)
3. **Dark text for readability**: High contrast text on light backgrounds
4. **Distinctive palette**: Aviation emerald, not purple/teal defaults
5. **Atmospheric depth**: Grid patterns, gradients, noise textures
6. **Technical precision**: Monospace for data, geometric sans for UI
7. **Smooth motion**: Staggered animations, spring physics easing

## Next Steps

After implementation:
1. User feedback session
2. Performance optimization (font subset loading)
3. Consider other dashboards for consistent styling
4. A/B test with original design
