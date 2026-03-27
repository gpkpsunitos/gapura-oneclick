'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonMetric {
  readonly label: string;
  readonly current: number;
  readonly previous: number;
  readonly momDelta: number;
  readonly yoyCurrent?: number;
  readonly yoyPrevious?: number;
  readonly yoyDelta?: number;
}

interface MonthlyTrendChartProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly data: ReadonlyArray<Record<string, string | number>>;
  readonly dataKeys: readonly string[];
  readonly colors?: readonly string[];
  readonly metrics?: readonly ComparisonMetric[];
  readonly height?: string;
}

const DEFAULT_COLORS = [
  'oklch(0.65 0.18 160)',
  'oklch(0.6 0.14 240)',
  'oklch(0.8 0.15 80)',
  'oklch(0.6 0.2 25)',
  'oklch(0.75 0.1 190)',
] as const;

function DeltaBadge({ value, label, subLabel, isNA }: { value: number; label: string; subLabel?: string; isNA?: boolean }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  const isCompliment = label.toLowerCase().includes('compliment');
  
  // Logic: For compliments, positive is good. For others (complaints/irregularities/total), negative is good.
  const isGood = isCompliment ? isPositive : (!isPositive && !isZero);

  const bgColor = isNA
    ? 'bg-[oklch(0.95_0.01_250)]'
    : isZero
    ? 'bg-[oklch(0.95_0.01_250)]'
    : isGood
      ? 'bg-[oklch(0.95_0.04_145)]' // Emerald/Green
      : 'bg-[oklch(0.95_0.04_25)]';  // Rose/Red

  const textColor = isNA
    ? 'text-[oklch(0.5_0.02_250)]'
    : isZero
    ? 'text-[oklch(0.5_0.02_250)]'
    : isGood
      ? 'text-[oklch(0.45_0.15_145)]' // Emerald/Green
      : 'text-[oklch(0.5_0.15_25)]';   // Rose/Red

  const Icon = isNA ? Minus : isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={`flex flex-col gap-1 px-3 py-2.5 rounded-2xl border border-black/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-sm ${bgColor}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[oklch(0.2 0.01 250 / 0.5)]">
        {label}
      </span>
      <div className={`flex items-center gap-1.5 ${textColor}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-sm font-black tabular-nums">
          {isNA ? 'N/A' : isZero ? '0%' : `${isPositive ? '+' : ''}${value.toFixed(1)}%`}
        </span>
      </div>
      {subLabel && (
        <span className="text-[9px] text-[var(--text-muted)]">{subLabel}</span>
      )}
    </div>
  );
}

// Complexity: Time O(n) per render | Space O(k) where k = data points
export function MonthlyTrendChart({
  title,
  subtitle,
  data,
  dataKeys,
  colors = DEFAULT_COLORS,
  metrics = [],
  height = 'h-[280px]',
}: MonthlyTrendChartProps) {
  const hasData = data.length > 0;

  const chartData = useMemo(() => [...data], [data]);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-[oklch(0.92_0.01_90/0.8)] bg-[var(--surface-1)] p-5">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          {title}
        </h4>
        <p className="text-xs text-[var(--text-muted)] text-center py-8">Tidak ada data</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[oklch(0.92_0.01_90/0.8)] bg-[var(--surface-1)] p-5 min-w-0">
      <div className="mb-4">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{subtitle}</p>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="space-y-6 mb-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="h-px flex-1 bg-[var(--surface-3)]" />
              <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] whitespace-nowrap">
                Perbandingan Bulanan (MoM)
              </h5>
              <span className="h-px flex-1 bg-[var(--surface-3)]" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.filter(m => m.label !== 'Total' && m.label !== 'Keseluruhan').map((m) => (
                <DeltaBadge
                  key={m.label}
                  value={m.momDelta}
                  label={m.label}
                  subLabel={`${m.previous.toLocaleString()} → ${m.current.toLocaleString()}`}
                  isNA={m.previous === 0}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="h-px flex-1 bg-[var(--surface-3)]" />
              <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] whitespace-nowrap">
                Perbandingan Tahunan (YoY)
              </h5>
              <span className="h-px flex-1 bg-[var(--surface-3)]" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.filter(m => m.label !== 'Total' && m.label !== 'Keseluruhan').map((m) => (
                <DeltaBadge
                  key={`yoy-${m.label}`}
                  value={m.yoyDelta ?? 0}
                  label={m.label}
                  subLabel={`${(m.yoyPrevious ?? 0).toLocaleString()} → ${(m.yoyCurrent ?? 0).toLocaleString()}`}
                  isNA={m.yoyPrevious === 0 || m.yoyPrevious === undefined}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {metrics.length > 0 && (
        <div className="text-[10px] text-[var(--text-muted)] mb-2">
          MoM = (Current − Previous) / Previous; ditampilkan N/A jika Previous = 0.
        </div>
      )}

      <div className={`w-full min-w-0 overflow-hidden ${height}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.9 0.01 90 / 0.5)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: 'oklch(1 0 0 / 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid oklch(0.92 0.01 90 / 0.6)',
                borderRadius: '1rem',
                boxShadow: '0 8px 32px oklch(0 0 0 / 0.08)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine y={0} stroke="oklch(0.8 0.01 90)" />
            {dataKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[i % colors.length] as string}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
