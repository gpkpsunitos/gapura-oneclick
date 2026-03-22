'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

const DEFAULT_COLORS = ['#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65'];
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

/**
 * Dedicated Donut Chart for Customer Feedback dashboard.
 * Displays total count in the center and uses specific legend positioning.
 */
export function FeedbackDonutChart({ title, data, colors = DEFAULT_COLORS, height = 300 }: FeedbackDonutChartProps) {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
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
        fill: getSliceColor(index)
      }));
  }, [data, colors]);

  // Complexity: Time O(n) where n is data items | Space O(1)
  return (
    <div className="w-full flex flex-col items-center">
      {/* Chart Area with Perfectly Centered Total */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rankedData}
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={96}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              label={({ cx, cy, midAngle, outerRadius, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = Number(outerRadius || 0) + 6;
                const x = Number(cx || 0) + radius * Math.cos(-Number(midAngle || 0) * RADIAN);
                const y = Number(cy || 0) + radius * Math.sin(-Number(midAngle || 0) * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#4b5563"
                    textAnchor={x > Number(cx || 0) ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={800}
                  >
                    {Number(value || 0).toLocaleString('id-ID')}
                  </text>
                );
              }}
              animationBegin={0}
              animationDuration={800}
            >
              {rankedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '12px'
              }} 
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Number - Now perfectly centered in the relative chart wrapper */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-10px]">
          <span className="text-[32px] font-black text-gray-800 leading-none tracking-tight">
            {total.toLocaleString('id-ID')}
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">
            Total Reports
          </span>
        </div>
      </div>

      {/* Custom Legend - Positioned below the chart area */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 px-6">
        {rankedData.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-2">
            <div 
              className="w-1.5 h-1.5 rounded-full shrink-0" 
              style={{ backgroundColor: entry.fill }} 
            />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide whitespace-normal leading-tight max-w-[120px] break-words">
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
