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
