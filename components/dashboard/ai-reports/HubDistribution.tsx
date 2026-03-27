// components/dashboard/ai-reports/HubDistribution.tsx

'use client';

import { PieChart } from 'lucide-react';
import { EntityStats } from '@/types/entity-analytics';
import { getTopEntities } from '@/lib/utils/entity-analytics';
import { cn } from '@/lib/utils';

interface HubDistributionProps {
  entityStats: EntityStats;
  onHubClick?: (hub: string) => void;
}

export function HubDistribution({ entityStats, onHubClick }: HubDistributionProps) {
  const topHubs = getTopEntities(entityStats.hubs, 10);

  if (topHubs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Distribusi Hub
        </h3>
        <p className="text-gray-500 text-sm">Tidak ada data hub tersedia</p>
      </div>
    );
  }

  const totalReports = entityStats.summary.totalReports;
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500'
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Distribusi Hub
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Proporsi insiden per lokasi hub
        </p>
      </div>

      {/* Visual representation (simple bars instead of pie) */}
      <div className="space-y-3 mb-4">
        {topHubs.slice(0, 5).map((hub, idx) => (
          <div
            key={hub.name}
            className="cursor-pointer group"
            onClick={() => onHubClick?.(hub.name)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn('w-3 h-3 rounded-full', colors[idx])} />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {hub.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-sm font-bold text-gray-900">{hub.count}</span>
                <span className="text-xs text-gray-500">
                  {hub.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all group-hover:opacity-80', colors[idx])}
                style={{ width: `${hub.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Detailed stats */}
      <div className="space-y-2 pt-4 border-t border-gray-100">
        {topHubs.slice(0, 5).map((hub, idx) => (
          <div
            key={hub.name}
            className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 rounded cursor-pointer"
            onClick={() => onHubClick?.(hub.name)}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', colors[idx])} />
              <span className="font-medium text-gray-700">{hub.name}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <span>{hub.topIssueCategory}</span>
              <span className="font-mono">{hub.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
