'use client';

import React, { useMemo } from 'react';
import type { QueryResult } from '@/types/builder';

interface FeedbackPivotTableProps {
  title: string;
  result: QueryResult;
  rowKey?: string;
  colKey?: string;
  valueKey?: string;
}

// 5-step Green Scale (Light to Dark)
const HEATMAP_SCALE = [
  { bg: '#E8F5E9', text: '#374151', min: 0.00 },
  { bg: '#C8E6C9', text: '#1B5E20', min: 0.15 },
  { bg: '#81C784', text: '#1B5E20', min: 0.40 },
  { bg: '#43A047', text: '#FFFFFF', min: 0.60 },
  { bg: '#1B5E20', text: '#FFFFFF', min: 0.80 }
];

function formatAxisLabel(value: string): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getIntensity(value: number, max: number) {
  if (value === 0 || max === 0) return { bg: '#f8fbf8', text: '#9ca3af' };
  const ratio = value / max;
  const step = [...HEATMAP_SCALE].reverse().find(s => ratio >= s.min) || HEATMAP_SCALE[0];
  return step;
}

/**
 * Dedicated Pivot Table for Customer Feedback dashboard.
 * Implements a specific green-scale heatmap and optimized layout.
 */
export function FeedbackPivotTable({ title, result, rowKey, colKey, valueKey }: FeedbackPivotTableProps) {
  const { rows, columns } = result;

  // Auto-detect keys if not provided
  const keys = useMemo(() => {
    // We want dimensions (strings) for rk and ck, and measures (numbers) for vk
    const dimensions = columns.filter(c => rows.length > 0 && typeof rows[0][c] === 'string');
    const measures = columns.filter(c => rows.length > 0 && typeof rows[0][c] === 'number');

    const rk = rowKey || dimensions[0] || columns[0];
    const ck = colKey || dimensions[1] || columns[1];
    const vk = valueKey || measures[0] || columns[2] || columns[columns.length - 1];
    
    return { rk, ck, vk };
  }, [columns, rows, rowKey, colKey, valueKey]);

  const pivotData = useMemo(() => {
    const matrix = new Map<string, number>();
    const rowTotals = new Map<string, number>();
    const colTotals = new Map<string, number>();
    const colCoverage = new Map<string, number>();
    const uniqueRows = new Set<string>();
    const uniqueCols = new Set<string>();
    let maxVal = 0;

    rows.forEach((r: any) => {
      const rowVal = formatAxisLabel(String(r[keys.rk] ?? ''));
      const colVal = formatAxisLabel(String(r[keys.ck] ?? ''));
      const rawVal = Number(r[keys.vk]);
      const val = Number.isFinite(rawVal) ? rawVal : 0;

      // Drop empty/unknown buckets and zero-value cells to avoid blank matrix strips.
      if (!rowVal || !colVal) return;
      if (rowVal.toLowerCase() === 'unknown' || colVal.toLowerCase() === 'unknown') return;
      if (val <= 0) return;

      matrix.set(`${rowVal}::${colVal}`, val);
      uniqueRows.add(rowVal);
      uniqueCols.add(colVal);
      
      const currentTotal = rowTotals.get(rowVal) || 0;
      rowTotals.set(rowVal, currentTotal + val);
      colTotals.set(colVal, (colTotals.get(colVal) || 0) + val);
      colCoverage.set(colVal, (colCoverage.get(colVal) || 0) + 1);

      if (val > maxVal) maxVal = val;
    });

    // Sort rows by total descending
    const sortedRows = Array.from(uniqueRows).sort((a, b) => {
      const totalA = rowTotals.get(a) || 0;
      const totalB = rowTotals.get(b) || 0;
      return totalB - totalA;
    });

    return {
      rows: sortedRows,
      cols: Array.from(uniqueCols).sort((a, b) => (colTotals.get(b) || 0) - (colTotals.get(a) || 0)),
      matrix,
      maxVal,
      keys // Pass keys for use in click handler
    };
  }, [rows, keys]);

  const handleCellClick = (rowVal: string, colVal: string) => {
    const params = new URLSearchParams(window.location.search);
    // Assuming row is Branch and col is Area based on context
    const branch = rowVal;
    const area = colVal;
    
    params.set('branch', branch);
    params.set('area', area);
    window.location.href = `/dashboard/charts/area-report/detail?${params.toString()}`;
  };

  const rowLabelWidthPx = useMemo(() => {
    const maxLabelLength = pivotData.rows.reduce((max, row) => {
      return Math.max(max, formatAxisLabel(row).length);
    }, 0);
    // Keep sticky label column compact to avoid large white gaps while still readable for long names.
    return Math.max(64, Math.min(172, Math.round(maxLabelLength * 6.4 + 14)));
  }, [pivotData.rows]);

  // Complexity: Time O(rows * cols) | Space O(rows * cols)
  return (
    <div className="w-full flex flex-col overflow-hidden">
      {/* Scrollable container with both-axis scroll for long labels */}
      <div 
        className="overflow-auto pr-2 custom-scrollbar"
        style={{ height: '300px', maxHeight: '300px' }}
      >
        <span className="sr-only">FeedbackPivotTable Active</span>
        <table className="w-max min-w-full border-separate border-spacing-2">
          <thead>
            <tr className="sticky top-0 bg-white z-20">
              <th
                className="sticky left-0 bg-white z-30"
                style={{ minWidth: rowLabelWidthPx, width: rowLabelWidthPx, maxWidth: rowLabelWidthPx }}
              />
              {pivotData.cols.map(c => (
                <th
                  key={c}
                  className="p-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center min-w-[78px] max-w-[132px] whitespace-normal break-words leading-tight align-bottom"
                  title={formatAxisLabel(c)}
                >
                  {formatAxisLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="relative">
            {pivotData.rows.map(r => (
              <tr key={r}>
                <td
                  className="sticky left-0 bg-white z-10 p-2 text-[10px] font-bold text-gray-700 uppercase pr-2 whitespace-normal break-words leading-tight border-r border-gray-50"
                  style={{ minWidth: rowLabelWidthPx, width: rowLabelWidthPx, maxWidth: rowLabelWidthPx }}
                  title={formatAxisLabel(r)}
                >
                  {formatAxisLabel(r)}
                </td>
                {pivotData.cols.map(c => {
                  const val = pivotData.matrix.get(`${r}::${c}`) || 0;
                  const intensity = getIntensity(val, pivotData.maxVal);
                  return (
                    <td key={c} className="p-0.5 min-w-[78px]">
                      <div 
                        className="w-full h-8 flex items-center justify-center rounded-md text-[10px] font-black transition-all hover:scale-105 hover:shadow-md cursor-pointer active:scale-95"
                        style={{ backgroundColor: intensity.bg, color: intensity.text }}
                        title={`${formatAxisLabel(r)} • ${formatAxisLabel(c)}: ${val}`}
                        onClick={() => handleCellClick(r, c)}
                      >
                        {val || '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {pivotData.rows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(1, pivotData.cols.length + 1)}
                  className="p-4 text-center text-[11px] font-semibold text-gray-400"
                >
                  No non-zero data in this view
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-end gap-3">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mr-2">Intensity:</span>
        {HEATMAP_SCALE.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.bg }} />
          </div>
        ))}
      </div>
    </div>
  );
}
