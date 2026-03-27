'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import { LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer, Area, AreaChart } from 'recharts';
import { useViewport } from '@/hooks/useViewport';
import { adaptToChartJSData } from '@/lib/utils/chartAdapters';
import { defaultMobileChartOptions, generateChartColors } from './chartConfig';
import { cn } from '@/lib/utils';

interface ResponsiveLineChartProps {
  data: any[];
  xAxisKey?: string;
  dataKeys: string[];
  title?: string;
  className?: string;
  height?: string;
  showLegend?: boolean;
  showArea?: boolean;
  curved?: boolean;
}

/**
 * Responsive Line Chart
 * Uses Chart.js on mobile/tablet, Recharts on desktop
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
}: ResponsiveLineChartProps) {
  const { isMobile, isTablet } = useViewport();
  const useMobileCharts = isMobile || isTablet;

  // Prepare Chart.js data
  const chartJSData = useMemo(() => {
    return adaptToChartJSData(data, xAxisKey, dataKeys);
  }, [data, xAxisKey, dataKeys]);

  // Chart.js options
  const chartJSOptions = useMemo(() => {
    const baseOptions = { ...defaultMobileChartOptions };
    const colors = generateChartColors(dataKeys.length);
    
    return {
      ...baseOptions,
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
      elements: {
        line: {
          tension: curved ? 0.4 : 0,
          borderWidth: 2,
        },
        point: {
          radius: 3,
          hitRadius: 8,
          hoverRadius: 5,
        },
      },
    };
  }, [showLegend, title, curved, dataKeys.length]);

  // Update datasets for line/area styling
  const styledData = useMemo(() => {
    const colors = generateChartColors(dataKeys.length);
    return {
      ...chartJSData,
      datasets: chartJSData.datasets.map((dataset: any, index: number) => ({
        ...dataset,
        backgroundColor: showArea ? generateChartColors(1, 0.2)[0] : 'transparent',
        borderColor: colors[index],
        fill: showArea,
      })),
    };
  }, [chartJSData, showArea, dataKeys.length]);

  if (useMobileCharts) {
    return (
      <div className={cn('w-full', height, className)}>
        <Line data={styledData as any} options={chartJSOptions as any} />
      </div>
    );
  }

  // Desktop: Use Recharts
  const colors = generateChartColors(dataKeys.length);
  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={cn('w-full', height, className)}>
      <RechartsContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {showLegend && <Legend />}
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
                activeDot={{ r: 5 }}
              />
            );
          })}
        </ChartComponent>
      </RechartsContainer>
    </div>
  );
}

/**
 * Responsive Area Chart (convenience wrapper)
 */
export function ResponsiveAreaChart(props: Omit<ResponsiveLineChartProps, 'showArea'>) {
  return <ResponsiveLineChart {...props} showArea={true} />;
}
