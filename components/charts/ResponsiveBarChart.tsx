/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi komponen bar chart responsif yang menggunakan Recharts
 * untuk visualisasi data dalam format horizontal atau vertical.
 */

'use client';

import { BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';
import { generateChartColors } from './chartConfig';
import { cn } from '@/lib/utils';

/**
 * Props untuk komponen ResponsiveBarChart
 * @interface ResponsiveBarChartProps
 */
interface ResponsiveBarChartProps {
  /** Data chart */
  data: any[];
  /** Key untuk axis X */
  xAxisKey?: string;
  /** Array key untuk series data */
  dataKeys: string[];
  /** Layout chart: horizontal atau vertical */
  layout?: 'horizontal' | 'vertical';
  /** Judul chart */
  title?: string;
  /** Class CSS tambahan */
  className?: string;
  /** Tinggi chart */
  height?: string;
  /** Tampilkan legenda */
  showLegend?: boolean;
  /** Stack bar */
  stacked?: boolean;
}

/**
 * Komponen bar chart responsif
 * Menampilkan bar chart horizontal atau vertical dengan dukungan multiple series
 * @param ResponsiveBarChartProps - Props komponen
 * @returns JSX element bar chart
 * @example
 * ```tsx
 * <ResponsiveBarChart
 *   data={chartData}
 *   xAxisKey="month"
 *   dataKeys={['value1', 'value2']}
 *   layout="vertical"
 *   showLegend={true}
 * />
 * ```
 */
export function ResponsiveBarChart({
  data,
  xAxisKey = 'name',
  dataKeys,
  layout = 'vertical',
  title,
  className,
  height = 'h-[35vh] min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] lg:h-[300px]',
  showLegend = true,
  stacked = false,
}: ResponsiveBarChartProps) {
  const colors = generateChartColors(dataKeys.length);

  return (
    <div className={cn('w-full', height, className)}>
      <RechartsContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 30, left: layout === 'horizontal' ? 60 : 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          {layout === 'horizontal' ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey={xAxisKey} type="category" width={60} tick={{ fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
              <YAxis />
            </>
          )}
          <Tooltip />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <RechartsBar
              key={key}
              dataKey={key}
              fill={colors[index]}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </RechartsContainer>
    </div>
  );
}
