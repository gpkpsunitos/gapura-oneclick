// components/dashboard/ai-reports/RouteHeatmap.tsx

'use client';

import { Map, TrendingUp, TrendingDown } from 'lucide-react';
import { EntityStats, RouteStats } from '@/types/entity-analytics';
import { getTopEntities } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface RouteHeatmapProps {
  entityStats: EntityStats;
  onRouteClick?: (route: string) => void;
}

export function RouteHeatmap({ entityStats, onRouteClick }: RouteHeatmapProps) {
  const topRoutes = getTopEntities(entityStats.routes, 20);

  if (topRoutes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-500" />
          Peta Panas Rute
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data rute tersedia</p>
      </div>
    );
  }

  const maxCount = Math.max(...topRoutes.map(r => r.count));

  const getHeatColor = (count: number, criticalRate: number) => {
    // Combine count and critical rate for heat intensity
    const intensity = (count / maxCount) * 0.6 + (criticalRate / 100) * 0.4;

    if (intensity > 0.7) return 'bg-red-100 border-red-300 text-red-900';
    if (intensity > 0.5) return 'bg-orange-100 border-orange-300 text-orange-900';
    if (intensity > 0.3) return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-green-100 border-green-300 text-green-900';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-500" />
          Peta Panas Rute
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Rute dengan insiden tertinggi - semakin merah berarti semakin bermasalah
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {topRoutes.slice(0, 10).map((route, idx) => (
          <div
            key={route.route}
            className={cn(
              'flex items-center justify-between p-3 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md',
              getHeatColor(route.count, route.criticalRate)
            )}
            onClick={() => onRouteClick?.(route.route)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{route.route}</div>
                <div className="text-[10px] opacity-75">
                  {route.primaryIssueType}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 ml-2">
              <div className="text-right">
                <div className="text-sm font-bold">{route.count}</div>
                <div className="text-[10px] opacity-75">insiden</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{route.criticalRate.toFixed(0)}%</div>
                <div className="text-[10px] opacity-75">critical</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heat Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 border-2 border-green-300 rounded" />
            <span>Rendah</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-amber-200 border-2 border-amber-300 rounded" />
            <span>Sedang</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-200 border-2 border-orange-300 rounded" />
            <span>Tinggi</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-200 border-2 border-red-300 rounded" />
            <span>Kritis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
