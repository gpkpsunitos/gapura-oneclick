/**
 * @file
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
  data: Array<Record<string, string | number | null | undefined>>;
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
  /** Callback ketika bar di klik */
  onBarClick?: (payload: any) => void;
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
  className,
  height = 'h-[35vh] min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] lg:h-[300px]',
  showLegend = true,
  stacked = false,
  onBarClick,
}: ResponsiveBarChartProps) {
  const colors = generateChartColors(dataKeys.length);
  const categoryAxisLabels = data.map((item) => String(item?.[xAxisKey] ?? ''));
  const longestCategoryLabel = categoryAxisLabels.reduce((max, label) => Math.max(max, label.length), 0);
  const showAllCategoryTicks = data.length > 0 && data.length <= 12;
  const rotateCategoryTicks = layout !== 'horizontal' && showAllCategoryTicks && longestCategoryLabel > 10;
  const categoryTickHeight = rotateCategoryTicks
    ? Math.min(104, Math.max(60, Math.round(longestCategoryLabel * 3.4)))
    : undefined;
  const categoryAxisWidth = layout === 'horizontal'
    ? Math.min(220, Math.max(60, Math.round(longestCategoryLabel * 7.5)))
    : 60;
  const chartMargin = {
    top: 10,
    right: 30,
    left: layout === 'horizontal' ? categoryAxisWidth : 0,
    bottom: rotateCategoryTicks ? 24 : 10,
  };

  return (
    <div className={cn('w-full', height, className)}>
      <RechartsContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={chartMargin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          {layout === 'horizontal' ? (
            <>
              <XAxis type="number" />
              <YAxis
                dataKey={xAxisKey}
                type="category"
                width={categoryAxisWidth}
                interval={showAllCategoryTicks ? 0 : 'preserveStartEnd'}
                tick={{ fontSize: 11 }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xAxisKey}
                interval={showAllCategoryTicks ? 0 : 'preserveStartEnd'}
                angle={rotateCategoryTicks ? -24 : 0}
                textAnchor={rotateCategoryTicks ? 'end' : 'middle'}
                height={categoryTickHeight}
                minTickGap={rotateCategoryTicks ? 0 : 5}
                tickMargin={rotateCategoryTicks ? 10 : 4}
                tick={{ fontSize: 11 }}
              />
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
              onClick={onBarClick ? (data: any) => onBarClick(data) : undefined}
              cursor={onBarClick ? 'pointer' : 'default'}
            />
          ))}
        </BarChart>
      </RechartsContainer>
    </div>
  );
}
