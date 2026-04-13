'use client';

import { SummaryMatrixData } from './types';
import { heatColor } from './summary-utils';

interface SummaryMatrixTableProps {
  data: SummaryMatrixData;
  columnLabel: string;
}

export function SummaryMatrixTable({ data, columnLabel }: SummaryMatrixTableProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="max-h-[380px] sm:max-h-[560px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-30 min-w-[260px] border-b border-r border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-left text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Case Classification
              </th>
              {data.columns.map((column) => (
                <th
                  key={column}
                  className="min-w-[88px] border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-3 py-3 text-center text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                >
                  {column}
                </th>
              ))}
              <th className="sticky right-0 z-30 min-w-[92px] border-b border-l border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)] px-4 py-3 text-right text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length + 2}
                  className="px-4 py-10 text-center text-sm font-medium text-[var(--text-muted)]"
                >
                  No matrix data available.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-2)]/60">
                  <td
                    className="sticky left-0 z-[5] border-b border-r border-[oklch(0.9_0.01_90_/_0.55)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
                    title={row.label}
                  >
                    <span className="block max-w-[240px] break-words">{row.label}</span>
                  </td>
                  {data.columns.map((column) => {
                    const value = row.values[column] || 0;
                    const background = value > 0 ? heatColor(value, data.maxValue) : 'oklch(0.98 0.005 90)';

                    return (
                      <td
                        key={`${row.id}-${column}`}
                        className="border-b border-[oklch(0.9_0.01_90_/_0.5)] px-3 py-3 text-center font-mono text-[0.82rem] font-semibold text-[var(--text-primary)]"
                        style={{ background }}
                      >
                        {value > 0 ? value : '–'}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-[5] border-b border-l border-[oklch(0.9_0.01_90_/_0.55)] bg-white px-4 py-3 text-right font-mono text-[0.82rem] font-black text-[var(--brand-emerald-700)]">
                    {row.total}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/90 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Columns sorted by {columnLabel} volume. Darker cells indicate higher counts inside this matrix.
      </div>
    </div>
  );
}
