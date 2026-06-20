/**
 * @file
 * 
 * File ini berisi komponen ResponsiveLineChart dan ResponsiveAreaChart
 * Menggunakan Recharts untuk visualisasi data dalam format line chart dengan dukungan area
 */

'use client';

import { LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer, Area, AreaChart } from 'recharts';
import { generateChartColors } from './chartConfig';
import { cn } from '@/lib/utils';

/**
 * Props untuk komponen ResponsiveLineChart
 * @interface ResponsiveLineChartProps
 */
interface ResponsiveLineChartProps {
  /** Data chart dalam format array object */
  data: any[];
  /** Key untuk sumbu X axis */
  xAxisKey?: string;
  /** Array key untuk series data yang akan ditampilkan */
  dataKeys: string[];
  /** Judul chart (opsional) */
  title?: string;
  /** Class CSS tambahan */
  className?: string;
  /** Tinggi chart */
  height?: string;
  /** Tampilkan legenda */
  showLegend?: boolean;
  /** Tampilkan sebagai area chart */
  showArea?: boolean;
  /** Gunakan kurva (monotone) atau garis lurus (linear) */
  curved?: boolean;
  /** Callback ketika point di klik */
  onPointClick?: (payload: any) => void;
}

/**
 * Komponen line chart responsif
 * Menampilkan line chart atau area chart dengan dukungan multiple series
 * Mendukung animasi dan responsive sizing
 * 
 * @param {ResponsiveLineChartProps} props - Props komponen
 * @returns {JSX.Element} Element React line chart atau area chart
 * 
 * @example
 * ```tsx
 * <ResponsiveLineChart
 *   data={chartData}
 *   xAxisKey="month"
 *   dataKeys={['revenue', 'profit']}
 *   showLegend={true}
 *   showArea={false}
 *   curved={true}
 * />
 * 
 * <ResponsiveAreaChart
 *   data={chartData}
 *   xAxisKey="month"
 *   dataKeys={['revenue']}
 * />
 * ```
 */
export function ResponsiveLineChart({
  data,
  xAxisKey = 'name',
  dataKeys,
  title,
  className,
  height = 'h-[35vh] min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] lg:h-[300px]',
  showLegend = true,
  showArea = false,
  curved = true,
  onPointClick,
}: ResponsiveLineChartProps) {
  const colors = generateChartColors(dataKeys.length);
  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={cn('w-full', height, className)}>
      <RechartsContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          {/* Grid lines horizontal */}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          {/* Sumbu X */}
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
          {/* Sumbu Y */}
          <YAxis tick={{ fontSize: 11 }} />
          {/* Tooltip saat hover */}
          <Tooltip />
          {/* Legenda jika diaktifkan */}
          {showLegend && <Legend />}
          {/* Series data */}
          {dataKeys.map((key, index) => {
            if (showArea) {
              return (
                <Area
                  key={key}
                  type={curved ? 'monotone' : 'linear'}
                  dataKey={key}
                  stroke={colors[index]}
                  fill={colors[index]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  onClick={onPointClick ? ((data: any, _idx: number, event: any) => { if (event) event.stopPropagation(); onPointClick(data); }) as any : undefined}
                />
              );
            }
            return (
              <RechartsLine
                key={key}
                type={curved ? 'monotone' : 'linear'}
                dataKey={key}
                stroke={colors[index]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, cursor: onPointClick ? 'pointer' : 'default' }}
                onClick={onPointClick ? ((data: any, _idx: number, event: any) => { if (event) event.stopPropagation(); onPointClick(data); }) as any : undefined}
              />
            );
          })}
        </ChartComponent>
      </RechartsContainer>
    </div>
  );
}

/**
 * Komponen area chart responsif (alias untuk ResponsiveLineChart dengan showArea=true)
 * Menampilkan area chart dengan fill di bawah garis
 * 
 * @param {Omit<ResponsiveLineChartProps, 'showArea'>} props - Props komponen tanpa showArea
 * @returns {JSX.Element} Element React area chart
 */
export function ResponsiveAreaChart(props: Omit<ResponsiveLineChartProps, 'showArea'>) {
  return <ResponsiveLineChart {...props} showArea={true} />;
}
