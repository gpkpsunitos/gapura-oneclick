'use client';

import { TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface ResponsiveStatsGridProps {
  stats: {
    total: number;
    resolved: number;
    pending: number;
    highSeverity: number;
    resolutionRate: number;
  };
  onStatClick?: (type: 'total' | 'resolved' | 'pending' | 'high') => void;
  compact?: boolean;
}

export function ResponsiveStatsGrid({ stats, onStatClick, compact }: ResponsiveStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
      <StatsCard
        icon={TrendingUp}
        value={stats.total}
        label="Total Reports"
        onClick={() => onStatClick?.('total')}
      />
      <StatsCard
        icon={CheckCircle2}
        value={stats.resolved}
        label="Resolved"
        onClick={() => onStatClick?.('resolved')}
      />
      <StatsCard
        icon={Clock}
        value={stats.pending}
        label="Pending"
        onClick={() => onStatClick?.('pending')}
      />
      <StatsCard
        icon={AlertTriangle}
        value={stats.highSeverity}
        label="High Priority"
        onClick={() => onStatClick?.('high')}
      />
    </div>
  );
}
