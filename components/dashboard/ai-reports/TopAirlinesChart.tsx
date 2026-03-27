// components/dashboard/ai-reports/TopAirlinesChart.tsx

'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { EntityStats, AirlineStats } from '@/types/entity-analytics';
import { getTopEntities, translateSeverity, getSeverityColor } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface TopAirlinesChartProps {
  entityStats: EntityStats;
  onAirlineClick?: (airline: string) => void;
}

export function TopAirlinesChart({ entityStats, onAirlineClick }: TopAirlinesChartProps) {
  const topAirlines = getTopEntities(entityStats.airlines, 10);

  if (topAirlines.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Top Maskapai
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data maskapai tersedia</p>
      </div>
    );
  }

  const maxCount = useMemo(() => {
    if (topAirlines.length === 0) return 0;
    return Math.max(...topAirlines.map(a => a.count));
  }, [topAirlines]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Top 10 Maskapai
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Maskapai dengan insiden terbanyak, di-breakdown berdasarkan tingkat keparahan
        </p>
      </div>

      <div className="space-y-3">
        {topAirlines.map((airline, idx) => {
          const { Critical, High, Medium, Low } = airline.severityBreakdown;
          const total = airline.count;
          const widthPercent = (total / maxCount) * 100;

          return (
            <div
              key={airline.name}
              className={cn(
                "group cursor-pointer transition-all hover:bg-gray-50 rounded-lg p-2 -mx-2",
                onAirlineClick && "hover:shadow-sm"
              )}
              onClick={() => onAirlineClick?.(airline.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono text-gray-400 w-6">{idx + 1}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {airline.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-sm font-bold text-gray-900">{total}</span>
                  <span className="text-xs text-gray-500">
                    {airline.avgPredictionDays.toFixed(1)} hari
                  </span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                {Critical > 0 && (
                  <div
                    className="bg-red-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Critical / total) * widthPercent}%` }}
                    title={`Critical: ${Critical}`}
                  />
                )}
                {High > 0 && (
                  <div
                    className="bg-orange-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(High / total) * widthPercent}%` }}
                    title={`High: ${High}`}
                  />
                )}
                {Medium > 0 && (
                  <div
                    className="bg-amber-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Medium / total) * widthPercent}%` }}
                    title={`Medium: ${Medium}`}
                  />
                )}
                {Low > 0 && (
                  <div
                    className="bg-green-500 transition-all group-hover:opacity-80"
                    style={{ width: `${(Low / total) * widthPercent}%` }}
                    title={`Low: ${Low}`}
                  />
                )}
              </div>

              {/* Legend on hover */}
              <div className="mt-1 flex gap-3 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                {Critical > 0 && (
                  <span className="text-red-600 font-medium">Kritis: {Critical}</span>
                )}
                {High > 0 && (
                  <span className="text-orange-600 font-medium">Tinggi: {High}</span>
                )}
                {Medium > 0 && (
                  <span className="text-amber-600 font-medium">Sedang: {Medium}</span>
                )}
                {Low > 0 && (
                  <span className="text-green-600 font-medium">Rendah: {Low}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Severity Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-600">Kritis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-gray-600">Tinggi</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span className="text-gray-600">Sedang</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-600">Rendah</span>
          </div>
        </div>
      </div>
    </div>
  );
}
