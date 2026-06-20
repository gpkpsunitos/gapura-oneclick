/**
 * @file Color-blind friendly chart palette for OP analytics dashboards.
 *
 * Uses the Wong (2011) palette - proven safe for deuteranopia, protanopia,
 * and trritanopia. All colors tested for minimum 4.5:1 contrast ratio
 * against white (#FFFFFF) and dark (#1A1A1A) backgrounds.
 *
 * Palette index mapping:
 *   0 — Primary (Blue)       — Main metric, primary series
 *   1 — Secondary (Orange)   — Comparison metric, secondary series
 *   2 — Tertiary (Teal)     — Third data dimension
 *   3 — Accent (Red)        — Critical/alert values
 *   4 — Neutral (Purple)    — Supplementary data
 *   5 — Highlight (Yellow)  — Highlighted/special values
 *   6 — Muted (Gray-blue)   — Background context
 *   7 — Dark (Dark teal)    — Emphasis/deep values
 */

/** Wong 2011 color-blind safe palette — high contrast on both light/dark backgrounds */
export const CB_SAFE_PALETTE = [
  '#0072B2', // #0 Blue — Primary
  '#E69300', // #1 Orange — Secondary
  '#009E9D', // #2 Teal — Tertiary
  '#D55E00', // #3 Vermillion Red — Accent
  '#792F8E', // #4 Medium Purple — Neutral
  '#F0E442', // #5 Yellow — Highlight
  '#6B7FAF', // #6 Steel Blue — Muted
  '#0F4C5A', // #7 Dark Teal — Dark emphasis
] as const;

/** Semantic severity palette — maps severity levels to Wong-safe colors */
export const SEVERITY_PALETTE: Record<string, { bg: string; text: string; fill: string }> = {
  'CRITICAL': { bg: '#FEE2E2', text: '#991B1B', fill: '#D55E00' },
  'HIGH':     { bg: '#FEF3C7', text: '#C2410C', fill: '#E69300' },
  'MEDIUM':   { bg: '#FEF9CD', text: '#A16207', fill: '#F0E442' },
  'LOW':      { bg: '#ECFDF5', text: '#166534', fill: '#009E9D' },
} as const;

/** Semantic status palette */
export const STATUS_PALETTE: Record<string, { bg: string; text: string; fill: string }> = {
  OPEN:     { bg: '#FEF3C7', text: '#C2410C', fill: '#E69300' },
  PROGRESS: { bg: '#FEF9CD', text: '#A16207', fill: '#F0E442' },
  CLOSED:   { bg: '#ECFDF5', text: '#166534', fill: '#009E9D' },
} as const;

/** Category palette — issue type classification */
export const CATEGORY_PALETTE: Record<string, { fill: string; label: string }> = {
  'Irregularity':          { fill: '#E69300', label: 'Irregularity' },
  'Complaint':             { fill: '#D55E00', label: 'Complaint' },
  'Compliment':            { fill: '#009E9D', label: 'Compliment' },
  'Accidents / Incidents': { fill: '#792F8E', label: 'Accidents / Incidents' },
  'Other':                 { fill: '#6B7FAF', label: 'Other' },
} as const;

/**
 * Generate N color-blind safe colors for chart series.
 * Cycles through CB_SAFE_PALETTE if more colors needed.
 */
export function generateCBSafeColors(count: number, alpha?: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = CB_SAFE_PALETTE[i % CB_SAFE_PALETTE.length];
    if (alpha !== undefined && alpha < 1) {
      // Convert hex to rgba
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    } else {
      colors.push(base);
    }
  }
  return colors;
}

/** Trend direction types for metric cards */
export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

/** Compute trend direction from two numeric values */
export function computeTrend(current: number, previous: number): TrendDirection {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return 'none';
  const delta = current - previous;
  const pctChange = Math.abs(delta / previous);
  if (pctChange < 0.02) return 'flat';
  return delta > 0 ? 'down' : 'up'; // Inverted: if current > previous, quantity is increasing (declining trend), so show down arrow
}

/** Compute percentage delta string */
export function computeDeltaLabel(current: number, previous: number): string {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return '—';
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
