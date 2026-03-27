'use client';

import { useMemo } from 'react';
import { Pie, Doughnut } from 'react-chartjs-2';
import { PieChart, Pie as RechartsPie, Cell, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';
import { useViewport } from '@/hooks/useViewport';
import { adaptToPieChartData } from '@/lib/utils/chartAdapters';
import { defaultMobileChartOptions, chartColors } from './chartConfig';
import { cn } from '@/lib/utils';
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];
type PieLabelPayload = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  value?: number | string;
};

interface ResponsivePieChartProps {
  data: { name: string; value: number }[];
  title?: string;
  className?: string;
  height?: string;
  donut?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  percentageLabels?: boolean;
  showDataLabels?: boolean;
}

/**
 * Responsive Pie/Donut Chart
 * Uses Chart.js on mobile/tablet, Recharts on desktop
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
  const { isMobile, isTablet } = useViewport();
  const useMobileCharts = donut ? false : (isMobile || isTablet);
  const displayData = useMemo(() => {
    if (!donut) return data;
    return [...data].sort((a, b) => b.value - a.value);
  }, [data, donut]);
  const total = useMemo(() => displayData.reduce((s, v) => s + (v?.value || 0), 0), [displayData]);

  // Prepare Chart.js data
  const chartJSData = useMemo(() => {
    const base = adaptToPieChartData(displayData);
    if (!donut || !base.datasets?.[0]) return base;
    const rankedColors = displayData.map((_, index) => {
      if (index < FIXED_DONUT_RANK_COLORS.length) return FIXED_DONUT_RANK_COLORS[index];
      return DONUT_FALLBACK_COLORS[(index - FIXED_DONUT_RANK_COLORS.length) % DONUT_FALLBACK_COLORS.length];
    });
    return {
      ...base,
      datasets: [
        {
          ...base.datasets[0],
          backgroundColor: rankedColors,
          borderColor: rankedColors,
        },
      ],
    };
  }, [displayData, donut]);

  // Chart.js options
  const chartJSOptions = useMemo(() => {
    const baseOptions = { ...defaultMobileChartOptions };
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          display: showLegend,
          position: 'bottom',
        },
        title: title ? {
          display: true,
          text: title,
          font: { size: 12 },
          padding: { bottom: 10 },
        } : undefined,
      },
    };
  }, [showLegend, title]);

  if (!displayData || displayData.length === 0 || total === 0) {
    return (
      <div className={cn('w-full rounded-lg border border-gray-100 bg-white/60 p-4 flex items-center justify-center', className)} style={{ minHeight: 180 }}>
        <div className="text-xs font-medium text-gray-400">Tidak ada data</div>
      </div>
    );
  }

  if (useMobileCharts) {
    return (
      <div className={cn('w-full', height, className)}>
        {donut ? (
          <Doughnut data={chartJSData as unknown} options={chartJSOptions as unknown} />
        ) : (
          <Pie data={chartJSData as unknown} options={chartJSOptions as unknown} />
        )}
      </div>
    );
  }

  // Desktop: Use Recharts
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
