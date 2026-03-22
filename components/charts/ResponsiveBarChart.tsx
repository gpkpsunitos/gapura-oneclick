'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';
import { useViewport } from '@/hooks/useViewport';
import { adaptToChartJSData } from '@/lib/utils/chartAdapters';
import { defaultMobileChartOptions, generateChartColors } from './chartConfig';
import { cn } from '@/lib/utils';

interface ResponsiveBarChartProps {
  data: any[];
  xAxisKey?: string;
  dataKeys: string[];
  layout?: 'horizontal' | 'vertical';
  title?: string;
  className?: string;
  height?: string;
  showLegend?: boolean;
  stacked?: boolean;
}

/**
 * Responsive Bar Chart
 * Uses Chart.js on mobile/tablet, Recharts on desktop
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
  const { isMobile, isTablet } = useViewport();
  const useMobileCharts = isMobile || isTablet;

  // Prepare Chart.js data
  const chartJSData = useMemo(() => {
    return adaptToChartJSData(data, xAxisKey, dataKeys);
  }, [data, xAxisKey, dataKeys]);

  // Chart.js options
  const chartJSOptions = useMemo(() => {
    const baseOptions = { ...defaultMobileChartOptions };
    return {
      ...baseOptions,
      indexAxis: layout === 'horizontal' ? 'y' : 'x',
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          display: showLegend,
        },
        title: title ? {
          display: true,
          text: title,
          font: { size: 12 },
          padding: { bottom: 10 },
        } : undefined,
      },
      scales: {
        ...baseOptions.scales,
        x: {
          ...baseOptions.scales?.x,
          stacked,
        },
        y: {
          ...baseOptions.scales?.y,
          stacked,
        },
      },
    } as any;
  }, [layout, showLegend, title, stacked]);

  if (useMobileCharts) {
    return (
      <div className={cn('w-full', height, className)}>
        <Bar data={chartJSData as any} options={chartJSOptions} />
      </div>
    );
  }

  // Desktop: Use Recharts
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
