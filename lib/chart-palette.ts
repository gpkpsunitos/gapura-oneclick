
export const CB_SAFE_PALETTE = [
  '#0072B2',
  '#E69300',
  '#009E9D',
  '#D55E00',
  '#792F8E',
  '#F0E442',
  '#6B7FAF',
  '#0F4C5A',
] as const;

export const SEVERITY_PALETTE: Record<string, { bg: string; text: string; fill: string }> = {
  'TOP RISK': { bg: '#FEE2E2', text: '#991B1B', fill: '#D55E00' },
  'HIGH RISK':{ bg: '#FEF3C7', text: '#C2410C', fill: '#E69300' },
  'MEDIUM':   { bg: '#FEF9CD', text: '#A16207', fill: '#F0E442' },
  'LOW':      { bg: '#ECFDF5', text: '#166534', fill: '#009E9D' },
} as const;

export const STATUS_PALETTE: Record<string, { bg: string; text: string; fill: string }> = {
  OPEN:     { bg: '#FEF3C7', text: '#C2410C', fill: '#E69300' },
  PROGRESS: { bg: '#FEF9CD', text: '#A16207', fill: '#F0E442' },
  CLOSED:   { bg: '#ECFDF5', text: '#166534', fill: '#009E9D' },
} as const;

export const CATEGORY_PALETTE: Record<string, { fill: string; label: string }> = {
  'Irregularity':          { fill: '#E69300', label: 'Irregularity' },
  'Complaint':             { fill: '#D55E00', label: 'Complaint' },
  'Compliment':            { fill: '#009E9D', label: 'Compliment' },
  'Accidents / Incidents': { fill: '#792F8E', label: 'Accidents / Incidents' },
  'Other':                 { fill: '#6B7FAF', label: 'Other' },
} as const;

export function generateCBSafeColors(count: number, alpha?: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = CB_SAFE_PALETTE[i % CB_SAFE_PALETTE.length];
    if (alpha !== undefined && alpha < 1) {

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

export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

export function computeTrend(current: number, previous: number): TrendDirection {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return 'none';
  const delta = current - previous;
  const pctChange = Math.abs(delta / previous);
  if (pctChange < 0.02) return 'flat';
  return delta > 0 ? 'down' : 'up';
}

export function computeDeltaLabel(current: number, previous: number): string {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return '—';
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
