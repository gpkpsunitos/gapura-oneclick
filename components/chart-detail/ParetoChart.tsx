'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Info } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface ParetoChartProps {
  result: QueryResult;
  title: string;
  explanation?: string;
}

export function ParetoChart({ result, title, explanation }: ParetoChartProps) {
  const processedData = useMemo(() => {
    const rows = result.rows as Record<string, unknown>[];
    if (rows.length === 0) return [];

    // Auto-detect columns
    const columns = result.columns;
    const sampleRow = rows[0];
    
    // Find Measure (numeric) and Dimension (string)
    const measureKey = columns.find(c => typeof sampleRow[c] === 'number') || columns[1];
    const dimKey = columns.find(c => typeof sampleRow[c] === 'string') || columns[0];

    // 1. Sort Descending
    const sorted = [...rows].sort((a, b) => (Number(b[measureKey]) || 0) - (Number(a[measureKey]) || 0));

    // 2. Calculate Total
    const total = sorted.reduce((sum, row) => sum + (Number(row[measureKey]) || 0), 0);

    // 3. Group "Others" (Logic: Top 5 or those contributing to 80%? Let's use Top 8 + Others for readability)
    const topN = 8;
    const topRows = sorted.slice(0, topN);
    const otherRows = sorted.slice(topN);

    let finalRows = topRows.map(r => ({
      name: String(r[dimKey]),
      value: Number(r[measureKey]) || 0
    }));

     if (otherRows.length > 0) {
      const otherTotal = otherRows.reduce((sum, r) => sum + (Number(r[measureKey]) || 0), 0);
      finalRows.push({
        name: 'Others',
        value: otherTotal
      });
    }

    // 4. Calculate Cumulative Percentage
    let cumulative = 0;
    return finalRows.map(row => {
      cumulative += row.value;
      return {
        ...row,
        cumulativePercentage: Math.round((cumulative / total) * 100)
      };
    });
  }, [result]);

  if (processedData.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden h-full">
      <div className="px-4 py-2 border-b border-gray-50 bg-white/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest pl-2">
            {title}
          </h4>
          <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
            80/20 Rule
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>

      <div className="flex-1 p-2 pt-8 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 35, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" vertical={false} />
            <XAxis 
              dataKey="name" 
              scale="band" 
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
              interval={0}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: '#999' } }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 10, fill: '#82ca9d' }} 
              tickLine={false}
              axisLine={false}
              unit="%"
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', style: { fontSize: '10px', fill: '#82ca9d' } }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              cursor={{ fill: '#f5f5f5' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar 
              yAxisId="left" 
              dataKey="value" 
              name="Total Cases" 
              barSize={30} 
              fill="#ecfdf5" 
              stroke="#059669"
              strokeWidth={1}
              radius={[4, 4, 0, 0]} 
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="cumulativePercentage" 
              name="Cumulative %" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {explanation && (
        <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
          <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[#777] leading-relaxed italic">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
