
'use client';

import { LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer, Area, AreaChart } from 'recharts';
import { generateChartColors } from './chartConfig';
import { cn } from '@/lib/utils';

interface ResponsiveLineChartProps {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];

  xAxisKey?: string;

  dataKeys: string[];

  title?: string;

  className?: string;

  height?: string;

  showLegend?: boolean;

  showArea?: boolean;

  curved?: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPointClick?: (payload: any) => void;
}

export function ResponsiveLineChart({
  data,
  xAxisKey = 'name',
  dataKeys,
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
          {}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          {}
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
          {}
          <YAxis tick={{ fontSize: 11 }} />
          {}
          <Tooltip />
          {}
          {showLegend && <Legend />}
          {}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={onPointClick ? ((data: any, _idx: number, event: any) => { if (event) event.stopPropagation(); onPointClick(data); }) as any : undefined}
              />
            );
          })}
        </ChartComponent>
      </RechartsContainer>
    </div>
  );
}

export function ResponsiveAreaChart(props: Omit<ResponsiveLineChartProps, 'showArea'>) {
  return <ResponsiveLineChart {...props} showArea={true} />;
}
