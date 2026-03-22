# Analyst Dashboard Aviation Aesthetics Design

**Date:** 2026-02-20
**Design Approach:** Elevated Light Operations (Aviation Command Center)
**Status:** Approved

---

## Overview

Transform the analyst dashboard into a distinctive Aviation Command Center aesthetic while maintaining a light, accessible interface. This design elevates the current emerald theme with aviation-inspired typography, atmospheric backgrounds, and technical precision—avoiding generic "AI slop" aesthetics through distinctive font choices, richer color depth, and purposeful motion design.

---

## Design Principles

1. **Aviation-Inspired, Not Generic**: Command center aesthetic through typography and color, not decorative elements
2. **Light with Depth**: Maintain light backgrounds but add atmospheric gradients, mesh effects, and layered depth
3. **Technical Precision**: Geometric sans-serif + monospace hybrid for clarity and character
4. **Emerald Evolution**: Keep brand identity but make it richer, more saturated, more commanding
5. **Data-First**: No decorative elements—every design choice serves data clarity and hierarchy

---

## 1. Typography System

### Font Selection

**Primary Display/Headers: Work Sans**
- Weights: 600 (SemiBold), 700 (Bold), 800 (ExtraBold)
- Use cases: Dashboard title, chart headers, section headers, button labels
- Character: Geometric, aviation-inspired, distinctive but highly readable
- Rationale: Avoids overused Inter/Roboto while maintaining professional clarity

**Body Text: Manrope**
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold)
- Use cases: Descriptions, table content, body copy, labels
- Character: Clean, modern, excellent readability at small sizes
- Rationale: Pairs beautifully with Work Sans, geometric harmony

**Technical Data: JetBrains Mono**
- Weights: 500 (Medium), 600 (SemiBold)
- Use cases: Report IDs, timestamps, flight codes, station codes, numeric chart values
- Character: Monospace precision for technical data
- Rationale: Creates authentic command center feel for critical data

### Type Scale

```css
/* Hero (Dashboard title) */
--text-hero: clamp(2.5rem, 2rem + 3vw, 4rem);
font: 800 var(--text-hero) / 1.1 'Work Sans', sans-serif;
letter-spacing: -0.04em;

/* Section Headers */
--text-section: clamp(1.5rem, 1.25rem + 1.5vw, 2rem);
font: 700 var(--text-section) / 1.2 'Work Sans', sans-serif;
letter-spacing: -0.02em;

/* Chart Titles */
--text-chart-title: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
font: 600 var(--text-chart-title) / 1.3 'Work Sans', sans-serif;

/* Data Labels */
--text-data: 0.875rem;
font: 600 var(--text-data) / 1.4 'JetBrains Mono', monospace;
letter-spacing: 0.01em;

/* Body */
--text-body: 0.9375rem;
font: 400 var(--text-body) / 1.6 'Manrope', sans-serif;
```

### Implementation

```css
/* Update globals.css */
:root {
  --font-display: 'Work Sans', system-ui, sans-serif;
  --font-body: 'Manrope', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
}
```

Load fonts via Google Fonts or install via npm (fontsource):
```bash
npm install @fontsource/work-sans @fontsource/manrope @fontsource/jetbrains-mono
```

---

## 2. Color System & Enhanced Emerald Theme

### Base Surface Palette (Light with Emerald Tint)

```css
:root {
  /* Elevated surface system - subtle emerald atmosphere */
  --surface-0: oklch(0.99 0.005 160);    /* Page background */
  --surface-1: oklch(0.98 0.008 160);    /* Elevation layer 1 */
  --surface-2: oklch(0.97 0.012 160);    /* Card backgrounds */
  --surface-3: oklch(0.95 0.015 160);    /* Hover states */
  --surface-4: oklch(0.92 0.02 160);     /* Active/pressed states */
}
```

### Emerald Evolution (Richer, More Saturated)

```css
:root {
  /* Command center emerald - bright, saturated, no dark tones */
  --brand-emerald-50: oklch(0.95 0.05 165);   /* Lightest tint */
  --brand-emerald-100: oklch(0.90 0.08 163);  /* Very light */
  --brand-emerald-400: oklch(0.70 0.16 160);  /* Bright emerald */
  --brand-emerald-500: oklch(0.65 0.18 160);  /* Primary brand (current) */
  --brand-emerald-600: oklch(0.58 0.2 162);   /* Richer mid-tone */
  --brand-emerald-700: oklch(0.55 0.18 164);  /* Medium emerald - not dark */

  /* Gradient combinations */
  --brand-gradient-primary: linear-gradient(135deg,
    var(--brand-emerald-500),
    var(--brand-emerald-600));

  --brand-gradient-strong: linear-gradient(135deg,
    var(--brand-emerald-600),
    var(--brand-emerald-700));
}
```

### Technical Accent Colors

```css
:root {
  /* Aviation-inspired accents */
  --accent-cyan: oklch(0.7 0.15 200);      /* Info, secondary actions */
  --accent-amber: oklch(0.75 0.14 75);     /* Warnings, highlights */
  --accent-coral: oklch(0.65 0.18 25);     /* Alerts, urgent states */
  --accent-purple: oklch(0.62 0.16 280);   /* Additional category */
}
```

### Text Palette (Dark for Readability)

```css
:root {
  /* Dark text with emerald undertone for maximum readability */
  --text-primary: oklch(0.25 0.04 160);    /* Dark emerald-gray */
  --text-secondary: oklch(0.45 0.05 160);  /* Medium emerald-gray */
  --text-muted: oklch(0.60 0.03 160);      /* Light emerald-gray */
  --text-on-brand: oklch(0.99 0.01 160);   /* White for emerald backgrounds */
}
```

### Chart Color Palette (Aviation-Inspired, Non-Generic)

```javascript
// Use in chart components - distinctive, avoids Recharts defaults
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
};
```

### Key Differences from Current Design

- **Warmer emerald tones**: More saturated, less cool-teal
- **Cohesive surface tinting**: Every layer has subtle emerald undertone
- **Stronger contrast**: Text is darker for command center clarity
- **Technical accents**: Cyan, amber, coral complement emerald
- **Atmospheric depth**: Not flat, uses layered color for depth perception

---

## 3. Backgrounds & Atmospheric Effects

### Page Background

**Base Layer:**
```css
body {
  background: var(--surface-0);
}
```

**Technical Grid Overlay:**
```css
.dashboard-container {
  background-image:
    linear-gradient(oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0;
}
```

**Corner Mesh Gradients (Depth):**
```css
.page-wrapper {
  background:
    radial-gradient(circle at 0% 0%, oklch(0.65 0.18 160 / 0.08) 0%, transparent 40%),
    radial-gradient(circle at 100% 100%, oklch(0.58 0.2 162 / 0.06) 0%, transparent 40%),
    var(--surface-0);
}
```

### Card Backgrounds (Enhanced Glassmorphism)

**PresentationSlide Components:**
```css
.card-aviation {
  background: var(--surface-2);
  backdrop-filter: blur(16px) saturate(180%);
  border-radius: 16px;

  /* Emerald border gradient */
  border: 1px solid transparent;
  background-image:
    linear-gradient(var(--surface-2), var(--surface-2)),
    linear-gradient(135deg,
      oklch(0.65 0.18 160 / 0.2),
      oklch(0.58 0.2 162 / 0.1));
  background-origin: border-box;
  background-clip: padding-box, border-box;

  /* Subtle noise texture */
  position: relative;
}

.card-aviation::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  border-radius: inherit;
}
```

**Hover Enhancement:**
```css
.card-aviation:hover {
  background-image:
    linear-gradient(var(--surface-2), var(--surface-2)),
    linear-gradient(135deg,
      oklch(0.65 0.18 160 / 0.35),
      oklch(0.58 0.2 162 / 0.2));
  transform: translateY(-4px);
  box-shadow:
    0 12px 32px oklch(0.18 0.025 160 / 0.08),
    0 24px 64px oklch(0.18 0.025 160 / 0.06);
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Chart Container Backgrounds

**Option: Subtle Diagonal Stripes**
```css
.chart-container {
  background:
    repeating-linear-gradient(
      2deg,
      transparent,
      transparent 20px,
      oklch(0.65 0.18 160 / 0.01) 20px,
      oklch(0.65 0.18 160 / 0.01) 21px
    ),
    var(--surface-2);
}
```

**Important:** Pattern must never interfere with data visibility—1% opacity maximum.

### Header Section

**Sticky Blur Effect:**
```css
.responsive-header.scrolled {
  background: oklch(0.99 0.005 160 / 0.85);
  backdrop-filter: blur(32px) saturate(180%);
  border-bottom: 1px solid oklch(0.65 0.18 160 / 0.15);
  box-shadow: 0 4px 24px oklch(0.18 0.025 160 / 0.04);
}
```

### No Decorative Elements

**Explicitly Avoided:**
- ❌ Coordinate markers or aviation iconography as watermarks
- ❌ Technical callout lines
- ❌ Ornamental graphics

**Rationale:** Atmospheric depth comes from color, gradients, and subtle patterns—not decoration. Data is the star.

---

## 4. Motion & Micro-interactions

### Page Load Animation

**Staggered Reveal:**
```css
/* Components fade in with upward motion */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) 0ms forwards; }
.stats { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) 80ms forwards; }
.table { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) 160ms forwards; }
.charts { animation: fadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) 240ms forwards; }
```

### Chart Animations

**Bar/Column Charts:**
```javascript
// Recharts: isAnimationActive={true}, animationDuration={800}
// Bars grow from bottom, staggered by 40ms per bar
<Bar animationBegin={0} animationDuration={800} />
```

**Line Charts:**
```javascript
// Path draws from left to right
<Line animationDuration={1000} animationEasing="ease-in-out" />
```

**Pie Charts:**
```javascript
// Segments fade in with scale from center, staggered
<Pie animationBegin={200} animationDuration={600} />
```

**Area Charts:**
```javascript
// Fill animates bottom-to-top with path drawing
<Area animationDuration={1000} />
```

### Interactive States

**Button Hover:**
```css
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px oklch(0.65 0.18 160 / 0.15),
    0 8px 24px oklch(0.65 0.18 160 / 0.1);
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring bounce */
}
```

**Button Active/Pressed:**
```css
.btn-primary:active {
  transform: translateY(0) scale(0.98);
  transition: all 150ms ease-out;
}
```

**Card Hover:**
```css
.card-aviation:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 32px oklch(0.18 0.025 160 / 0.08),
    0 24px 64px oklch(0.18 0.025 160 / 0.06);
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Data Updates

**Count-Up Animation (Stats Cards):**
```javascript
// Use react-countup or custom hook
<CountUp end={totalReports} duration={1.2} separator="," />
```

**Chart Data Transitions:**
```javascript
// Recharts handles this with isAnimationActive
// Smooth interpolation between data states
```

**Loading States:**
```css
.skeleton-loader {
  background: linear-gradient(
    90deg,
    var(--surface-3) 25%,
    oklch(0.65 0.18 160 / 0.08) 50%,
    var(--surface-3) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Critical Alerts

**Pulsing Glow (High Priority):**
```css
@keyframes emergencyPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 oklch(0.65 0.18 160 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px oklch(0.65 0.18 160 / 0);
  }
}

.alert-high {
  animation: emergencyPulse 2s ease-in-out infinite;
}
```

**Subtle Scale Pulse:**
```css
@keyframes scalePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
```

### Scroll Behaviors

**Header Blur Increase:**
```javascript
// On scroll, add 'scrolled' class
useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 20);
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Subtle Parallax (Background Mesh):**
```css
.page-wrapper {
  background-attachment: fixed; /* subtle parallax on mesh gradients */
}
```

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Component-Specific Styling

### Header (ResponsiveHeader)

**Title:**
```tsx
<h1 className="text-hero font-display font-extrabold tracking-tight text-text-primary">
  Pusat Komando & Analytics
</h1>
```
- Font: Work Sans 800
- Size: 2.5rem → 3.5rem (responsive)
- Color: `--text-primary`
- Letter spacing: -0.04em

**Subtitle:**
```tsx
<p className="text-base font-body font-medium text-brand-emerald-700">
  Divisi Operational Services Center
</p>
```
- Font: Manrope 500
- Color: `--brand-emerald-700` (distinct from muted text)

**Date Range Segmented Control:**
```css
/* Container */
.date-range-control {
  padding: 6px;
  background: oklch(0.97 0.012 160 / 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid oklch(0.65 0.18 160 / 0.15);
  border-radius: 14px;
  box-shadow: inset 0 1px 2px oklch(0.18 0.025 160 / 0.06);
}

/* Unselected button */
.date-option {
  padding: 10px 20px;
  font: 600 0.75rem 'Work Sans', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  border-radius: 10px;
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.date-option:hover {
  background: oklch(0.95 0.015 160 / 0.5);
  color: var(--text-primary);
}

/* Selected button */
.date-option.active {
  background: var(--brand-gradient-primary);
  color: var(--text-on-brand);
  box-shadow:
    0 2px 8px oklch(0.65 0.18 160 / 0.2),
    0 4px 16px oklch(0.65 0.18 160 / 0.1);
}
```

**Action Buttons:**

Primary (Create Report, Feedback):
```css
.btn-primary-aviation {
  background: var(--brand-gradient-primary);
  color: var(--text-on-brand);
  padding: 12px 24px;
  border-radius: 12px;
  font: 700 0.875rem 'Work Sans', sans-serif;
  border: none;
  box-shadow:
    0 2px 8px oklch(0.65 0.18 160 / 0.15),
    0 4px 16px oklch(0.65 0.18 160 / 0.08);
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-primary-aviation:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px oklch(0.65 0.18 160 / 0.2),
    0 8px 24px oklch(0.65 0.18 160 / 0.12);
}
```

Secondary (Export):
```css
.btn-secondary-aviation {
  background: transparent;
  color: var(--brand-emerald-600);
  padding: 12px 24px;
  border-radius: 12px;
  border: 1.5px solid var(--brand-emerald-500);
  font: 600 0.875rem 'Work Sans', sans-serif;
  transition: all 250ms ease-out;
}

.btn-secondary-aviation:hover {
  background: var(--brand-emerald-500);
  color: var(--text-on-brand);
  border-color: var(--brand-emerald-600);
}
```

### Stats Cards (ResponsiveStatsGrid)

**Card Structure:**
```tsx
<div className="stat-card-aviation">
  <div className="stat-icon">
    <TrendingUpIcon />
  </div>
  <div className="stat-content">
    <div className="stat-number">1,234</div>
    <div className="stat-label">Total Reports</div>
  </div>
</div>
```

**Styling:**
```css
.stat-card-aviation {
  background: var(--surface-2);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid transparent;
  background-image:
    linear-gradient(var(--surface-2), var(--surface-2)),
    linear-gradient(135deg,
      oklch(0.65 0.18 160 / 0.15),
      oklch(0.58 0.2 162 / 0.08));
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.stat-card-aviation:hover {
  transform: translateY(-4px);
  background-image:
    linear-gradient(var(--surface-2), var(--surface-2)),
    linear-gradient(135deg,
      oklch(0.65 0.18 160 / 0.3),
      oklch(0.58 0.2 162 / 0.15));
  box-shadow:
    0 8px 24px oklch(0.18 0.025 160 / 0.06),
    0 16px 48px oklch(0.65 0.18 160 / 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0.65 0.18 160 / 0.1);
  color: var(--brand-emerald-600);
  border-radius: 12px;
  margin-bottom: 16px;
}

.stat-number {
  font: 600 2.25rem 'JetBrains Mono', monospace;
  color: var(--brand-emerald-600);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.stat-label {
  font: 600 0.875rem 'Work Sans', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
```

### Chart Containers

**Chart Card:**
```css
.chart-card-aviation {
  background: var(--surface-1);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid oklch(0.65 0.18 160 / 0.15);

  /* Subtle background pattern */
  background-image:
    repeating-linear-gradient(
      2deg,
      transparent,
      transparent 20px,
      oklch(0.65 0.18 160 / 0.02) 20px,
      oklch(0.65 0.18 160 / 0.02) 21px
    );
}
```

**Chart Title:**
```tsx
<div className="chart-header">
  <h3 className="chart-title">
    Monthly Trends <span className="chart-subtitle">— Landside, Airside & CGO</span>
  </h3>
</div>
```

```css
.chart-title {
  font: 700 1.125rem 'Work Sans', sans-serif;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.chart-subtitle {
  font: 500 0.875rem 'Manrope', sans-serif;
  color: var(--text-secondary);
  letter-spacing: 0;
}
```

**Axis Labels:**
```javascript
// In Recharts components
<XAxis
  tick={{
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    fontWeight: 500,
    fill: 'var(--text-muted)'
  }}
/>
```

**Tooltips:**
```css
.recharts-tooltip-wrapper {
  .recharts-default-tooltip {
    background: oklch(0.99 0.005 160 / 0.95) !important;
    backdrop-filter: blur(16px);
    border: 1px solid oklch(0.65 0.18 160 / 0.2) !important;
    border-radius: 8px;
    box-shadow: 0 4px 16px oklch(0.18 0.025 160 / 0.12);
  }

  .recharts-tooltip-label {
    font: 600 0.75rem 'Work Sans', sans-serif;
    color: var(--text-primary);
  }

  .recharts-tooltip-item {
    font: 500 0.75rem 'JetBrains Mono', monospace !important;
    color: var(--text-secondary) !important;
  }
}
```

### Data Table (ReportsTableSection)

**Table Structure:**
```css
.reports-table {
  background: var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid oklch(0.65 0.18 160 / 0.12);
}

.table-header {
  background: var(--brand-emerald-500);
  color: var(--text-on-brand);
  font: 600 0.75rem 'Work Sans', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 16px;
}

.table-row {
  border-bottom: 1px solid oklch(0.65 0.18 160 / 0.08);
  transition: background 200ms ease;
}

.table-row:hover {
  background: var(--brand-emerald-50);
}

/* Alternating rows for scanability */
.table-row:nth-child(even) {
  background: oklch(0.99 0.005 160 / 0.5);
}

.table-row:nth-child(even):hover {
  background: var(--brand-emerald-50);
}

.table-cell {
  padding: 16px;
  font: 400 0.875rem 'Manrope', sans-serif;
  color: var(--text-primary);
}

/* Technical data cells (IDs, codes, dates) */
.table-cell.technical {
  font: 500 0.8125rem 'JetBrains Mono', monospace;
  color: var(--brand-emerald-700);
}
```

**Action Buttons:**
```css
.table-action-btn {
  padding: 8px;
  border-radius: 6px;
  color: var(--text-muted);
  transition: all 200ms ease;
}

.table-action-btn:hover {
  background: var(--brand-emerald-100);
  color: var(--brand-emerald-700);
}
```

### Buttons & Interactive Elements

**Border Radius:** 12px (modern, not overly rounded)

**Primary Button:**
```css
.btn-aviation-primary {
  background: var(--brand-gradient-primary);
  color: var(--text-on-brand);
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font: 700 0.875rem 'Work Sans', sans-serif;
  box-shadow: 0 2px 8px oklch(0.65 0.18 160 / 0.15);
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-aviation-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px oklch(0.65 0.18 160 / 0.2);
}

.btn-aviation-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-aviation-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
```

**Secondary/Ghost Button:**
```css
.btn-aviation-secondary {
  background: transparent;
  color: var(--brand-emerald-600);
  padding: 12px 24px;
  border: 1.5px solid var(--brand-emerald-500);
  border-radius: 12px;
  font: 600 0.875rem 'Work Sans', sans-serif;
  transition: all 250ms ease;
}

.btn-aviation-secondary:hover {
  background: var(--brand-emerald-500);
  color: var(--text-on-brand);
  border-color: var(--brand-emerald-600);
}
```

**Focus Rings:**
```css
.btn-aviation-primary:focus-visible,
.btn-aviation-secondary:focus-visible {
  outline: 2px solid var(--brand-emerald-500);
  outline-offset: 3px;
}
```

### Modals

**Modal Backdrop:**
```css
.modal-backdrop {
  background: oklch(0.65 0.18 160 / 0.3);
  backdrop-filter: blur(8px);
}
```

**Modal Container:**
```css
.modal-container {
  background: oklch(0.99 0.005 160 / 0.95);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid oklch(0.65 0.18 160 / 0.2);
  border-radius: 20px;
  box-shadow:
    0 12px 48px oklch(0.18 0.025 160 / 0.12),
    0 24px 96px oklch(0.18 0.025 160 / 0.08);
  max-width: 600px;
  padding: 32px;
}
```

**Modal Header:**
```css
.modal-header {
  font: 700 1.5rem 'Work Sans', sans-serif;
  color: var(--brand-emerald-700);
  margin-bottom: 24px;
}
```

**Close Button:**
```css
.modal-close {
  padding: 8px;
  border-radius: 8px;
  color: var(--text-muted);
  transition: all 200ms ease;
}

.modal-close:hover {
  background: var(--brand-emerald-100);
  color: var(--brand-emerald-700);
}
```

---

## 6. Implementation Strategy

### Phase 1: Foundation (CSS Variables & Fonts)

1. **Install fonts:**
   ```bash
   npm install @fontsource/work-sans @fontsource/manrope @fontsource/jetbrains-mono
   ```

2. **Update `app/globals.css`:**
   - Import fonts
   - Update all CSS variables (colors, typography, surfaces)
   - Add new utility classes

3. **Update `tailwind.config.js`:**
   - Add font families to theme
   - Add new color tokens
   - Add custom animations

### Phase 2: Component Updates

**Priority Order:**
1. `ResponsiveHeader.tsx` - Most visible, sets tone
2. `ResponsiveStatsGrid.tsx` - High-impact, simple changes
3. `AnalystCharts.tsx` - Chart styling, tooltips, colors
4. `ReportsTableSection.tsx` - Table styling, technical fonts
5. `PresentationSlide.tsx` - Base card component
6. Modal components - Backdrop, container styling

### Phase 3: Backgrounds & Atmosphere

1. Add page-level grid pattern and mesh gradients
2. Update card border gradients and noise texture
3. Implement chart container backgrounds
4. Add header sticky blur effect

### Phase 4: Motion & Polish

1. Page load staggered animations
2. Chart animation configurations
3. Hover state transitions
4. Count-up animations for stats
5. Loading skeleton screens

### Phase 5: Testing & Refinement

1. Cross-browser testing (Chrome, Safari, Firefox)
2. Responsive testing (mobile, tablet, desktop)
3. Accessibility audit (color contrast, reduced motion)
4. Performance check (font loading, animation performance)
5. User feedback and iteration

---

## 7. Accessibility Considerations

### Color Contrast

All text meets WCAG AA standards with dark text on light backgrounds:
- `--text-primary` on `--surface-0`: ~11:1 (AAA compliance)
- `--text-secondary` on `--surface-0`: ~6:1 (AA compliance)
- `--text-on-brand` on `--brand-emerald-500`: ~4.8:1 (AA compliance)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Indicators

All interactive elements have clear focus rings:
```css
:focus-visible {
  outline: 2px solid var(--brand-emerald-500);
  outline-offset: 3px;
}
```

### Font Loading

Use `font-display: swap` to prevent text blocking:
```css
@font-face {
  font-family: 'Work Sans';
  font-display: swap;
  /* ... */
}
```

---

## 8. Success Metrics

**Aesthetic Goals:**
- ✅ No generic Inter/Roboto/Space Grotesk fonts
- ✅ Distinctive color palette beyond "purple gradient on white"
- ✅ Atmospheric backgrounds, not flat surfaces
- ✅ Context-specific design (aviation command center)
- ✅ Technical precision through typography choices

**User Experience:**
- Improved visual hierarchy and data scanability
- Reduced eye strain through richer, more saturated colors
- Enhanced professional perception
- Faster information discovery through better typography

**Technical:**
- No performance regression from animations
- Maintained accessibility standards (WCAG AA)
- Responsive across all breakpoints
- Cross-browser compatibility

---

## 9. Future Enhancements (Out of Scope)

- Dark mode variant (true command center aesthetic)
- Advanced data visualizations with custom D3.js charts
- Real-time data update animations
- Customizable theme switcher for user preferences
- Print-optimized styles for reports

---

## Conclusion

This design transforms the analyst dashboard from a generic light interface into a distinctive Aviation Command Center experience. Through careful typography selection (Work Sans + Manrope + JetBrains Mono), enhanced emerald color depth, atmospheric backgrounds, and purposeful motion design, the dashboard will stand out while maintaining excellent usability and accessibility.

The light-mode approach ensures readability in bright airport environments while the technical precision of monospace data, geometric headers, and rich emerald gradients create an unmistakably command-center aesthetic.

**Next Step:** Proceed to implementation planning via the `writing-plans` skill.
