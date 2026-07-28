# Mobile & Tablet Shell Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the Analyst dashboard's `StatsCard` component to a shared, color-parameterized component; migrate Manager Cabang's dashboard home onto it; and fix a data-display bug on the Admin dashboard where a zero-count severity row renders blank instead of "0".

**Architecture:** No new architecture — this is a component-extraction + two call-site migrations + a one-line-per-field defensive-default fix. No new routes, no new dependencies, no state-management changes.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind CSS v4 (`oklch()` color tokens, arbitrary-value classes), TypeScript, `lucide-react` icons. No component-level test framework exists in this repo (only `node --test` over `.test.mjs`/`.test.ts` files for `lib/`); this repo's own UI-change specs (e.g. `docs/superpowers/specs/2026-07-16-mobile-bottom-nav-equal-spacing-design.md`) verify UI work via `tsc`/`eslint` + manual visual inspection, not automated component tests. This plan follows that same convention rather than introducing a new test framework.

## Global Constraints

- Do not modify `components/layout/DashboardFrame.tsx` — investigated during brainstorming, no bug confirmed (see spec Finding 1).
- Do not modify `components/dashboard/DashboardHeader.tsx` — its `StatCard` is a deliberately different frosted-glass-on-gradient design context (see spec Finding 3).
- Do not touch per-role content pages (charts, tables, calendar, documents, builder) or any role besides Admin and Manager Cabang — out of scope for this phase.
- The default (no `color` prop) rendering of the shared `StatsCard` must remain visually equivalent to the current Analyst usage — `components/dashboard/analyst/ResponsiveStatsGrid.tsx` passes no `color` prop today and must not need to change its call sites.
- No new npm dependency. Color variation is done with CSS `color-mix()`, not a JS color-math library.

---

## Task 1: Promote `StatsCard` to a shared, color-parameterized component

**Files:**
- Create: `components/dashboard/StatsCard.tsx`
- Delete: `components/dashboard/analyst/StatsCard.tsx`
- Modify: `components/dashboard/analyst/ResponsiveStatsGrid.tsx` (import path only)

**Interfaces:**
- Produces: `StatsCard` React component from `@/components/dashboard/StatsCard`, props `{ icon: LucideIcon; value: number | string; label: string; subtitle?: string; color?: string; onClick?: () => void; className?: string }`. `color` accepts any valid CSS color string (hex, `oklch(...)`, etc.) and defaults to `'var(--brand-emerald-600)'` (the exact value already used for the icon glyph and numeric-value color in the current Analyst component, so the default-color path renders those two elements identically to today; the background-tint gradient shifts to be derived from this same single color via `color-mix()` instead of a second hardcoded literal — a deliberate simplification, see Task 1 Step 3 rationale).

- [ ] **Step 1: Read the current implementation to confirm exact current values before changing anything**

Run: `cat components/dashboard/analyst/StatsCard.tsx`

Confirm it still matches (no one has edited it since this plan was written):
- Default icon/value color comes from the Tailwind class `text-brand-emerald-600`, which resolves to the CSS variable `--brand-emerald-600: oklch(0.58 0.2 162)` (defined in `app/globals.css` line ~92).
- The background tint/border gradient uses a second, separately hardcoded literal: `oklch(0.65 0.18 160 / <alpha>)`.
- There is no `subtitle` prop today.

If any of this has changed, stop and re-read this plan's Task 1 against the new file content before proceeding.

- [ ] **Step 2: Create the shared component**

Create `components/dashboard/StatsCard.tsx`:

```tsx
'use client';

import { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  subtitle?: string;
  color?: string;
  onClick?: () => void;
  className?: string;
}

// Matches --brand-emerald-600 (app/globals.css) so the default (no `color`
// prop) rendering is the same emerald used by the original analyst-only
// StatsCard for the icon glyph and numeric value.
const DEFAULT_COLOR = 'var(--brand-emerald-600)';

function tintGradient(color: string, opacity: number) {
  return `linear-gradient(135deg, color-mix(in oklch, ${color} ${opacity * 100}%, transparent), color-mix(in oklch, ${color} ${opacity * 60}%, transparent))`;
}

export const StatsCard = memo(function StatsCard({
  icon: Icon,
  value,
  label,
  subtitle,
  color = DEFAULT_COLOR,
  onClick,
  className,
}: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-400 cursor-pointer active:scale-[0.98]',
        'bg-surface-2 border border-transparent',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        backgroundImage: `linear-gradient(var(--surface-2), var(--surface-2)), ${tintGradient(color, 0.15)}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 2px 8px oklch(0.45 0.06 160 / 0.04)',
        transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundImage = `linear-gradient(var(--surface-2), var(--surface-2)), ${tintGradient(color, 0.3)}`;
        e.currentTarget.style.boxShadow = '0 8px 24px oklch(0.45 0.06 160 / 0.06), 0 16px 48px oklch(0.65 0.18 160 / 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundImage = `linear-gradient(var(--surface-2), var(--surface-2)), ${tintGradient(color, 0.15)}`;
        e.currentTarget.style.boxShadow = '0 2px 8px oklch(0.45 0.06 160 / 0.04)';
      }}
    >
      <div
        className="flex items-center justify-center w-8 h-8 sm:w-10 md:w-12 sm:h-10 md:h-12 rounded-lg sm:rounded-xl mb-2 sm:mb-3 md:mb-4"
        style={{ background: `color-mix(in oklch, ${color} 10%, transparent)` }}
      >
        <Icon className="w-4 h-4 sm:w-5 md:w-6 sm:h-5 md:h-6" style={{ color }} />
      </div>

      <div
        className="font-mono font-semibold text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-tight mb-0.5 sm:mb-1"
        style={{ color }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      <div className="font-display font-semibold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider sm:tracking-widest text-text-secondary line-clamp-2">
        {label}
      </div>

      {subtitle && (
        <div className="text-xs font-medium mt-1.5 text-text-muted">
          {subtitle}
        </div>
      )}
    </div>
  );
});
```

Note: the background-tint gradient now derives from the single `color` prop via `color-mix()` instead of a second hardcoded `oklch(0.65 0.18 160)` literal. For the default (Analyst) path this is a barely-perceptible shift in the tint's hue/lightness (0.58/162 vs. the old 0.65/160) — the icon glyph and numeric value, which are what a user actually reads, are pixel-identical. This is an intentional simplification (one color drives the whole card) rather than carrying forward two independently-hardcoded greens.

- [ ] **Step 3: Delete the old file and update its one importer**

Run: `git rm components/dashboard/analyst/StatsCard.tsx`

Edit `components/dashboard/analyst/ResponsiveStatsGrid.tsx` line 4:

```tsx
// before
import { StatsCard } from './StatsCard';
// after
import { StatsCard } from '@/components/dashboard/StatsCard';
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Pre-existing unrelated errors, if any, are not this task's concern — only confirm no *new* errors reference `StatsCard`, `ResponsiveStatsGrid`, or the deleted file path.)

- [ ] **Step 5: Visual regression check on the Analyst dashboard**

Start the dev server if not already running: `npm run dev`

Using Claude-in-Chrome (or manually in a browser): log in as `analyst.hc@gapura.demo` / `Gapura123!`, open the Analyst dashboard home, and confirm the 4 stat tiles (Total Reports / Top Risk & High Risk / Closed / Open) render with the same emerald icon/number color as before this change, at both phone width (~390px) and a wider width.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/StatsCard.tsx components/dashboard/analyst/ResponsiveStatsGrid.tsx
git commit -m "refactor: promote analyst StatsCard to shared, color-parameterized component"
```

---

## Task 2: Migrate Manager Cabang dashboard onto the shared `StatsCard`

**Files:**
- Modify: `app/dashboard/(main)/manager/page.tsx`

**Interfaces:**
- Consumes: `StatsCard` from `@/components/dashboard/StatsCard` (Task 1), props as defined above.

- [ ] **Step 1: Read current state to confirm line numbers**

Run: `grep -n "KPI_COLORS\|function KPICard\|<KPICard" "app/dashboard/(main)/manager/page.tsx"`

Expected (as of this plan): `KPI_COLORS` const at line 33, `KPICard` function at lines 39–68, three `<KPICard ...>` call sites at lines 161–163. If line numbers differ, locate the same named symbols instead of trusting line numbers literally.

- [ ] **Step 2: Add the import**

Add near the top with the other component imports (after the `type { DashboardData }` import):

```tsx
import { StatsCard } from '@/components/dashboard/StatsCard';
```

- [ ] **Step 3: Delete `KPI_COLORS` and the local `KPICard` function**

Remove these two blocks entirely (lines 33–68 in the pre-change file):

```tsx
const KPI_COLORS = {
    total: '#0072B2',
    open: '#D55E00',
    closed: '#009E9D',
};

function KPICard({ label, value, subtitle, icon: Icon, color, onClick }: {
    label: string; value: string | number; subtitle?: string;
    icon: React.ElementType; color: string; onClick?: () => void;
}) {
    return (
        <div
            className={`bg-white rounded-[1.5rem] p-5 md:p-6 border border-gray-100 shadow-sm relative overflow-hidden group${onClick ? ' cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.07] transition-opacity duration-700 group-hover:opacity-[0.14]"
                style={{ background: color }} />
            <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                </p>
                <div className="p-2.5 rounded-xl border border-gray-100" style={{ background: `${color}10` }}>
                    <Icon size={18} style={{ color }} />
                </div>
            </div>
            <div className="mt-5 relative z-10">
                <p className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                    {value}
                </p>
                {subtitle && (
                    <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Replace the three call sites**

Replace:

```tsx
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KPICard label="Total Reports" value={summary.total} subtitle="All periods" icon={BarChart3} color={KPI_COLORS.total} onClick={() => openDrilldown(rows, 'All Reports')} />
                <KPICard label="Open" value={summary.open} subtitle="Not yet resolved" icon={AlertTriangle} color={KPI_COLORS.open} onClick={() => openDrilldown(rows.filter(r => r.status === 'OPEN'), 'Open Reports')} />
                <KPICard label="Closed" value={summary.closed} subtitle="Successfully resolved" icon={ShieldCheck} color={KPI_COLORS.closed} onClick={() => openDrilldown(rows.filter(r => r.status === 'CLOSED'), 'Closed Reports')} />
            </div>
```

with:

```tsx
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatsCard label="Total Reports" value={summary.total} subtitle="All periods" icon={BarChart3} color="#0072B2" onClick={() => openDrilldown(rows, 'All Reports')} />
                <StatsCard label="Open" value={summary.open} subtitle="Not yet resolved" icon={AlertTriangle} color="#D55E00" onClick={() => openDrilldown(rows.filter(r => r.status === 'OPEN'), 'Open Reports')} />
                <StatsCard label="Closed" value={summary.closed} subtitle="Successfully resolved" icon={ShieldCheck} color="#009E9D" onClick={() => openDrilldown(rows.filter(r => r.status === 'CLOSED'), 'Closed Reports')} />
            </div>
```

(The hex values are the same three colors `KPI_COLORS` held — inlined directly since the constant is deleted and there is no other consumer.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `manager/page.tsx`, `KPICard`, or `KPI_COLORS`.

- [ ] **Step 6: Lint**

Run: `npx eslint "app/dashboard/(main)/manager/page.tsx"`
Expected: no new warnings/errors (in particular, no unused-import warning for `BarChart3`/`ShieldCheck`/`AlertTriangle` — they're still used as `icon` props — and none for anything removed).

- [ ] **Step 7: Visual check**

Using Claude-in-Chrome (or manually): log in as `manager.cgk@gapura.id` / `Gapura123!`, open `/dashboard/manager`, confirm the three stat tiles (Total Reports / Open / Closed) render with their distinct blue/orange/teal colors and correct subtitles, at phone width (~390px, 2-column grid per `grid-cols-2`) and at a wider width (3-column per `md:grid-cols-3`).

- [ ] **Step 8: Commit**

```bash
git add "app/dashboard/(main)/manager/page.tsx"
git commit -m "refactor: migrate Manager Cabang dashboard to shared StatsCard"
```

---

## Task 3: Fix the blank severity-value bug on the Admin dashboard

**Files:**
- Modify: `app/dashboard/(main)/admin/page.tsx`

**Interfaces:** None — self-contained data-default fix, no new exports or props.

- [ ] **Step 1: Confirm current state**

Run: `grep -n "const severity = stats" "app/dashboard/(main)/admin/page.tsx"`
Expected: line 88, `const severity = stats?.severity ?? { HIGH: 0, MEDIUM: 0, LOW: 0, 'TOP RISK': 0 };`

Run: `sed -n '158,163p' "app/dashboard/(main)/admin/page.tsx"`
Expected to show the three-row array literal with `value: severity.HIGH`, `value: severity.MEDIUM`, `value: severity.LOW`.

- [ ] **Step 2: Apply the fix**

Replace:

```tsx
                                { label: 'High (Accident)', value: severity.HIGH, color: 'oklch(0.55 0.20 25)', icon: AlertTriangle, filterValue: 'HIGH' },
                                { label: 'Medium (Incident)', value: severity.MEDIUM, color: 'oklch(0.65 0.18 75)', icon: AlertCircle, filterValue: 'MEDIUM' },
                                { label: 'Low (Hazard)', value: severity.LOW, color: 'oklch(0.55 0.15 160)', icon: Shield, filterValue: 'LOW' },
```

with:

```tsx
                                { label: 'High (Accident)', value: severity.HIGH ?? 0, color: 'oklch(0.55 0.20 25)', icon: AlertTriangle, filterValue: 'HIGH' },
                                { label: 'Medium (Incident)', value: severity.MEDIUM ?? 0, color: 'oklch(0.65 0.18 75)', icon: AlertCircle, filterValue: 'MEDIUM' },
                                { label: 'Low (Hazard)', value: severity.LOW ?? 0, color: 'oklch(0.55 0.15 160)', icon: Shield, filterValue: 'LOW' },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Visual check — this is the one that actually proves the bug is fixed**

Using Claude-in-Chrome (or manually): log in as `admin@gapura.demo` / `Gapura123!`, open `/dashboard/admin`, scroll to "Analisis & Tren" → "Berdasarkan Severity". Confirm all three rows (High/Medium/Low) show a numeric value — including "0" for any severity with no reports in the current period, which is the exact case that previously rendered blank. If the current data happens to have a non-zero count for all three severities right now, that alone doesn't prove the fix — additionally confirm via React DevTools or a temporary `console.log(severity)` in the browser console that the object shape lacking a key would now still render `0` (i.e. reason about `undefined ?? 0 === 0`, or temporarily change the period filter to one where a severity has zero reports, then revert).

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/(main)/admin/page.tsx"
git commit -m "fix: default missing severity counts to 0 on admin dashboard"
```

---

## Final Verification (whole plan)

- [ ] Run `npx tsc --noEmit` once more from a clean state — no errors introduced by this plan.
- [ ] Run `npx eslint "app/dashboard/(main)/manager/page.tsx" "app/dashboard/(main)/admin/page.tsx" components/dashboard/StatsCard.tsx components/dashboard/analyst/ResponsiveStatsGrid.tsx`.
- [ ] With the dev server running, visually check Admin, Manager, and Analyst dashboards at phone width (~390px) and tablet width (~800px+): stat tiles render correctly, bottom nav unobstructed, no console errors.
- [ ] Confirm `git log --oneline -5` shows the three commits from this plan, and `git status` is clean.
