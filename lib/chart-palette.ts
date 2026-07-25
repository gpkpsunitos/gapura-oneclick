
export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

export function computeTrend(current: number, previous: number): TrendDirection {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return 'none';
  const delta = current - previous;
  const pctChange = Math.abs(delta / previous);
  if (pctChange < 0.02) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function computeDeltaLabel(current: number, previous: number): string {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return '—';
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
