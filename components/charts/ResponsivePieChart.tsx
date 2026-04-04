/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen pie/donut chart responsif yang menggunakan Recharts
 * untuk visualisasi data proporsional dengan dukungan labels dan legenda.
 */

'use client';

import { useMemo } from 'react';
import { PieChart, Pie as RechartsPie, Cell, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';
import { cn } from '@/lib/utils';

/** Warna fixed untuk rank donut chart */
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
/** Warna fallback untuk donut chart */
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

/** Palet warna untuk chart */
const chartColors = {
  primary: [
    '#059669',
    '#0284c7',
    '#d97706',
    '#e11d48',
    '#7c3aed',
    '#db2777',
    '#0d9488',
    '#ea580c',
  ],
};

/**
 * Payload untuk label pie chart
 * @type PieLabelPayload
 */
type PieLabelPayload = {
  /** Koordinat X center */
  cx?: number;
  /** Koordinat Y center */
  cy?: number;
  /** Sudut tengah */
  midAngle?: number;
  /** Radius luar */
  outerRadius?: number;
  /** Nilai data */
  value?: number | string;
};

/**
 * Props untuk komponen ResponsivePieChart
 * @interface ResponsivePieChartProps
 */
interface ResponsivePieChartProps {
  /** Data chart */
  data: { name: string; value: number }[];
  /** Judul chart */
  title?: string;
  /** Class CSS tambahan */
  className?: string;
  /** Tinggi chart */
  height?: string;
  /** Tampilkan sebagai donut */
  donut?: boolean;
  /** Tampilkan legenda */
  showLegend?: boolean;
  /** Radius dalam untuk donut */
  innerRadius?: number;
  /** Tampilkan label sebagai persentase */
  percentageLabels?: boolean;
  /** Tampilkan label data */
  showDataLabels?: boolean;
}

/**
 * Komponen pie/donut chart responsif
 * Menampilkan pie chart atau donut chart dengan dukungan labels dan legenda
 * @param ResponsivePieChartProps - Props komponen
 * @returns JSX element pie chart atau placeholder jika tidak ada data
 * @example
 * ```tsx
 * <ResponsivePieChart
 *   data={pieData}
 *   donut={true}
 *   showLegend={true}
 *   percentageLabels={true}
 * />
 * ```
 */
export function ResponsivePieChart({
  data,
  title,
  className,
  height = 'h-[35vh] min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] lg:h-[280px]',
  donut = false,
  showLegend = true,
  innerRadius: customInnerRadius,
  percentageLabels = false,
  showDataLabels = true,
}: ResponsivePieChartProps) {
  const displayData = useMemo(() => {
    if (!donut) return data;
    return [...data].sort((a, b) => b.value - a.value);
  }, [data, donut]);
  const total = useMemo(() => displayData.reduce((s, v) => s + (v?.value || 0), 0), [displayData]);

  if (!displayData || displayData.length === 0 || total === 0) {
    return (
      <div className={cn('w-full rounded-lg border border-gray-100 bg-white/60 p-4 flex items-center justify-center', className)} style={{ minHeight: 180 }}>
        <div className="text-xs font-medium text-gray-400">Tidak ada data</div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {title ? <div className="text-[10px] font-bold text-gray-600 mb-2">{title}</div> : null}
      <div className={cn(height)}>
      <RechartsContainer width="100%" height="100%">
        <PieChart>
          <RechartsPie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={donut ? customInnerRadius || 60 : 0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={donut && showDataLabels ? ({ cx, cy, midAngle, outerRadius, value }: PieLabelPayload) => {
              const RADIAN = Math.PI / 180;
              const radius = Number(outerRadius || 0) + 12;
              const x = Number(cx || 0) + radius * Math.cos(-Number(midAngle || 0) * RADIAN);
              const y = Number(cy || 0) + radius * Math.sin(-Number(midAngle || 0) * RADIAN);
              const text = percentageLabels && total > 0
                ? `${Math.round((Number(value || 0) / total) * 1000) / 10}%`
                : Number(value || 0).toLocaleString('id-ID');
              return (
                <text
                  x={x}
                  y={y}
                  fill="#374151"
                  textAnchor={x > Number(cx || 0) ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={700}
                >
                  {text}
                </text>
              );
            } : false}
          >
            {displayData.map((_, index) => {
              const fill = donut
                ? (index < FIXED_DONUT_RANK_COLORS.length
                  ? FIXED_DONUT_RANK_COLORS[index]
                  : DONUT_FALLBACK_COLORS[(index - FIXED_DONUT_RANK_COLORS.length) % DONUT_FALLBACK_COLORS.length])
                : chartColors.primary[index % chartColors.primary.length];
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </RechartsPie>
          {showLegend && <Legend />}
          <Tooltip />
        </PieChart>
      </RechartsContainer>
      </div>
    </div>
  );
}
