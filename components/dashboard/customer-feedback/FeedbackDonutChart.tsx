'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
}

interface FeedbackDonutChartProps {
  title: string;
  data: ChartDataItem[];
  colors?: string[];
  height?: number | `${number}%`;
}

const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

export function FeedbackDonutChart({ title, data, colors = [], height = 170 }: FeedbackDonutChartProps) {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  const isCompact = typeof height === 'number' && height <= 180;

  const innerR = isCompact ? 50 : 78;
  const outerR = isCompact ? 66 : 96;

  const getSliceColor = (index: number): string => {
    if (index < FIXED_DONUT_RANK_COLORS.length) return FIXED_DONUT_RANK_COLORS[index];
    const fallbackPalette = colors.length > 0 ? colors : DONUT_FALLBACK_COLORS;
    return fallbackPalette[(index - FIXED_DONUT_RANK_COLORS.length) % fallbackPalette.length];
  };

  const rankedData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({
        ...entry,
        fill: getSliceColor(index),
      }));
  }, [data, colors]);

  const totalFontSize = isCompact ? 'text-[22px]' : 'text-[32px]';
  const totalLabelSize = isCompact ? 'text-[7px]' : 'text-[9px]';
  const legendDotSize = isCompact ? 'w-1 h-1' : 'w-1.5 h-1.5';
  const legendFontSize = isCompact ? 'text-[7px]' : 'text-[9px]';
  const legendGapX = isCompact ? 'gap-x-3' : 'gap-x-6';
  const legendGapY = isCompact ? 'gap-y-1.5' : 'gap-y-3';
  const legendPadding = isCompact ? 'px-2 mt-2' : 'px-6 mt-4';
  const labelFontSize = isCompact ? 8 : 10;
  const centerOffset = isCompact ? 'translate-y-[-6px]' : 'translate-y-[-10px]';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rankedData}
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              label={({ cx, cy, midAngle, outerRadius, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = Number(outerRadius || 0) + (isCompact ? 4 : 6);
                const x = Number(cx || 0) + radius * Math.cos(-Number(midAngle || 0) * RADIAN);
                const y = Number(cy || 0) + radius * Math.sin(-Number(midAngle || 0) * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#4b5563"
                    textAnchor={x > Number(cx || 0) ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={labelFontSize}
                    fontWeight={800}
                  >
                    {Number(value || 0).toLocaleString('id-ID')}
                  </text>
                );
              }}
              animationBegin={0}
              animationDuration={600}
            >
              {rankedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 8px 12px -3px rgba(0,0,0,0.1)',
                fontSize: '11px',
                padding: '6px 10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${centerOffset}`}>
          <span className={`${totalFontSize} font-black text-gray-800 leading-none tracking-tight`}>
            {total.toLocaleString('id-ID')}
          </span>
          <span className={`${totalLabelSize} font-bold text-gray-400 uppercase tracking-widest mt-0.5 opacity-70`}>
            Total Reports
          </span>
        </div>
      </div>

      <div className={`mt-2 flex flex-wrap justify-center ${legendGapX} ${legendGapY} ${legendPadding}`}>
        {rankedData.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-1">
            <div
              className={`${legendDotSize} rounded-full shrink-0`}
              style={{ backgroundColor: entry.fill }}
            />
            <span className={`${legendFontSize} font-bold text-gray-500 uppercase tracking-wide whitespace-normal leading-tight max-w-[100px] break-words`}>
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
