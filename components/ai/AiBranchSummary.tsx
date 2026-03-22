'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchBranchSummaryAi, 
  AiBranchSummaryResponse, 
  BranchCategorySummary 
} from '@/lib/services/gapura-ai';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Globe,
  Truck,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function AiBranchSummary({ source }: { source?: string }) {
  const [data, setData] = useState<AiBranchSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchBranchSummaryAi();
        if (result) {
          setData(result);
        } else {
          setError('Failed to fetch AI branch summary');
        }
      } catch (err) {
        setError('Error loading AI branch insights');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 bg-[var(--surface-3)] rounded-3xl border border-[var(--surface-4)]" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  // Implementation of context-aware filtering
  const showLandside = !source || source === 'NON CARGO';
  const showCGO = !source || source === 'CGO';
  const showComparison = !source;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <Zap size={20} className="fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
              AI Branch Risk Intelligence
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Automated branch-level risk profiling and trend distribution
            </p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-[var(--surface-3)] border border-[var(--surface-4)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
          AI Generated • {new Date(data.last_updated).toLocaleDateString()}
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        showComparison ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
        {showLandside && (
          <CategoryCard 
            title="Landside & Airside" 
            icon={<Globe size={20} />}
            summary={data.landside_airside}
            color="emerald"
          />
        )}
        {showCGO && (
          <CategoryCard 
            title="Cargo (CGO)" 
            icon={<Truck size={20} />}
            summary={data.cgo}
            color="blue"
          />
        )}
      </div>

      {/* Comparison Metrics - Only show when no specific source is filtered */}
      <AnimatePresence>
        {showComparison && (
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <MetricTile 
              label="LS Issues" 
              value={data.comparison.ls_total_issues} 
              subValue={`Avg Risk: ${data.comparison.ls_avg_risk}`}
            />
            <MetricTile 
              label="CGO Issues" 
              value={data.comparison.cgo_total_issues} 
              subValue={`Avg Risk: ${data.comparison.cgo_avg_risk}`}
            />
            <MetricTile 
              label="Risk Delta" 
              value={`${(data.comparison.cgo_avg_risk - data.comparison.ls_avg_risk).toFixed(2)}`} 
              subValue="CGO vs LS Intensity"
              highlight
            />
            <MetricTile 
              label="Active Branches" 
              value={data.landside_airside.total_branches + data.cgo.total_branches} 
              subValue="Cross-Network Coverage"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CategoryCard({ 
  title, 
  icon, 
  summary, 
  color 
}: { 
  title: string; 
  icon: React.ReactNode; 
  summary: BranchCategorySummary;
  color: 'emerald' | 'blue';
}) {
  const colorMap = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)] shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl border", colorMap[color])}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {summary.total_branches} Branches • {summary.total_issues} Total Issues
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {summary.avg_risk_score.toFixed(1)}
          </div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
            Avg Risk Score
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Risk Distribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <AlertTriangle size={12} />
            Risk Distribution
          </div>
          <div className="space-y-2">
            {['High', 'Medium', 'Low'].map((level) => {
              const count = summary.risk_level_distribution[level] || 0;
              const percent = (count / summary.total_branches) * 100;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className={cn(
                      level === 'High' ? 'text-red-500' : 
                      level === 'Medium' ? 'text-amber-500' : 
                      'text-emerald-500'
                    )}>{level}</span>
                    <span className="text-[var(--text-muted)]">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1 w-full bg-[var(--surface-4)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
                      className={cn(
                        "h-full rounded-full",
                        level === 'High' ? 'bg-red-500' : 
                        level === 'Medium' ? 'bg-amber-500' : 
                        'bg-emerald-500'
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend Insights */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <Activity size={12} />
            Trend Distribution
          </div>
          <div className="grid grid-rows-3 gap-2">
            <TrendItem 
              label="Increasing" 
              count={summary.trend_distribution.increasing || 0} 
              icon={<TrendingUp size={12} />} 
              color="red"
            />
            <TrendItem 
              label="Stable" 
              count={summary.trend_distribution.stable || 0} 
              icon={<Minus size={12} />} 
              color="blue"
            />
            <TrendItem 
              label="Decreasing" 
              count={summary.trend_distribution.decreasing || 0} 
              icon={<TrendingDown size={12} />} 
              color="emerald"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TrendItem({ label, count, icon, color }: { label: string; count: number; icon: React.ReactNode; color: 'red' | 'blue' | 'emerald' }) {
  const colorMap = {
    red: 'text-red-500 bg-red-500/5',
    blue: 'text-blue-500 bg-blue-500/5',
    emerald: 'text-emerald-500 bg-emerald-500/5',
  };

  return (
    <div className={cn("flex items-center justify-between px-3 py-1.5 rounded-xl border border-transparent hover:border-[var(--surface-4)] transition-colors", colorMap[color])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <span className="text-xs font-black">{count}</span>
    </div>
  );
}

function MetricTile({ label, value, subValue, highlight = false }: { label: string; value: string | number; subValue: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all",
      highlight ? "bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20 shadow-sm" : "bg-[var(--surface-2)]/50 border-[var(--surface-4)]"
    )}>
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className={cn(
        "text-xl font-black tracking-tight mb-0.5",
        highlight ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
      )}>
        {value}
      </div>
      <div className="text-[10px] font-medium text-[var(--text-muted)]">
        {subValue}
      </div>
    </div>
  );
}
