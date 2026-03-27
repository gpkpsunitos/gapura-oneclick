'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
}

interface FeedbackBarChartProps {
  title: string;
  data: ChartDataItem[];
  limit?: number;
  sortByValue?: boolean;
}

const WrappedTick = (props: any) => {
  const { x, y, payload } = props;
  const words = payload.value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  const maxLineLength = 20;

  words.forEach((word: string) => {
    if ((currentLine + word).length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={-12}
          y={i * 11}
          dy={-((lines.length - 1) * 5.5)}
          textAnchor="end"
          fill="#475569"
          fontSize={9}
          fontWeight={700}
          className="tracking-tighter"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

/**
 * Dedicated Horizontal Bar Chart for Customer Feedback dashboard.
 * Focuses on clean axes and specific branding colors.
 */
export function FeedbackBarChart({ title, data, limit = 6, sortByValue = true }: FeedbackBarChartProps) {
  // Conditional sort and limit
  const displayData = React.useMemo(() => {
    let result = [...data];
    if (sortByValue) {
      result = result.sort((a, b) => b.value - a.value);
    }
    if (limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }, [data, limit, sortByValue]);

  const barColor = title.toLowerCase().includes('complaint') || title.toLowerCase().includes('irregularity') ? '#ef5350' : '#7cb342';
  
  // Dynamic height to prevent overlapping labels (65px per bar)
  const chartHeight = Math.max(250, displayData.length * 65);

  // Complexity: Time O(n) | Space O(1)
  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div style={{ height: chartHeight, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 20, right: 60, left: 10, bottom: 20 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              fontSize={10} 
              stroke="#94a3b8" 
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => val.toLocaleString('id-ID')}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={125} 
              fontSize={10} 
              stroke="#64748b" 
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={<WrappedTick />}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '11px'
              }}
            />
            <Bar 
              dataKey="value" 
              fill={barColor} 
              radius={[0, 6, 6, 0]} 
              barSize={18}
              animationDuration={800}
            >
              <LabelList 
                dataKey="value" 
                position="right" 
                style={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
