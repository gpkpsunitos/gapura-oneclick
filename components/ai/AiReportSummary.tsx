'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchReportSummaryAi, 
  AiReportSummaryResponse 
} from '@/lib/services/gapura-ai';
import { 
  Lightbulb, 
  ShieldAlert, 
  Target, 
  ChevronRight,
  Info,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as any
    }
  }
};

export function AiReportSummary({ source }: { source?: 'NON CARGO' | 'CGO' }) {
  const [data, setData] = useState<AiReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!source) return;
      try {
        setLoading(true);
        const normalizedSource = source === 'CGO' ? 'cgo' : 'non-cargo';
        const result = await fetchReportSummaryAi(normalizedSource);
        if (result) {
          setData(result);
        } else {
          setError('Failed to fetch AI report summary');
        }
      } catch (err) {
        setError('Error loading AI summary');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [source]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-[var(--surface-3)] rounded-3xl border border-[var(--surface-4)]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-[var(--surface-3)] rounded-2xl border border-[var(--surface-4)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const { summary } = data;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header & Strategic Insight Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Insights - The "Soul" of the summary */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 p-8 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)] shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Lightbulb size={120} />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Lightbulb size={24} className="fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                Key Strategic Insights
              </h2>
              <p className="text-sm text-[var(--text-muted)] font-medium">
                Automated synthesis of {summary.total_records} {source === 'CGO' ? 'Cargo' : 'Landside/Airside'} records
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {summary.key_insights.map((insight, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-transparent hover:border-[var(--surface-4)] hover:bg-[var(--surface-3)] transition-all"
              >
                <div className="mt-1 p-1 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed">
                  {insight}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Stats & Severity */}
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)]">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              <ShieldAlert size={14} />
              Risk Intensity
            </div>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black text-red-500">
                    {summary.critical_high_percentage.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Critical & High Issues</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    {summary.severity_distribution.Critical || 0}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Critical Events</div>
                </div>
              </div>
              <div className="h-2 w-full bg-[var(--surface-4)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${summary.critical_high_percentage}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                />
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)]">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              <PieChartIcon size={14} />
              Severity Distribution
            </div>
            <div className="space-y-3">
              {['Critical', 'High', 'Medium', 'Low'].map(level => {
                const count = summary.severity_distribution[level] || 0;
                const pct = (count / summary.total_records) * 100;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      level === 'Critical' ? 'bg-red-600' :
                      level === 'High' ? 'bg-red-500' :
                      level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <span className="text-xs font-bold text-[var(--text-secondary)] min-w-[60px]">{level}</span>
                    <div className="flex-1 h-1.5 bg-[var(--surface-4)] rounded-full overflow-hidden">
                      <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${pct}%` }}
                         className={cn(
                           "h-full",
                           level === 'Critical' ? 'bg-red-600' :
                           level === 'High' ? 'bg-red-500' :
                           level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                         )}
                      />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)]">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Common Issues & Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)]">
           <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
              <BarChart2 size={14} />
              Common Reported Issues
            </div>
            <div className="space-y-4">
              {summary.common_issues.slice(0, 5).map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold px-1">
                    <span className="text-[var(--text-secondary)]">{item.issue}</span>
                    <span className="text-[var(--brand-primary)]">{item.count} cases</span>
                  </div>
                  <div className="h-1 w-full bg-[var(--surface-4)] rounded-full">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / summary.common_issues[0].count) * 100}%` }}
                      className="h-full bg-[var(--brand-primary)]/40 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)]">
           <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
              <Layout size={14} />
              Area Distribution
            </div>
            <div className="space-y-6">
              {Object.entries(summary.area_distribution).map(([area, count]) => (
                <div key={area} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{area}</span>
                    <span className="text-xs font-black text-[var(--text-primary)]">{count}</span>
                  </div>
                  <div className="h-4 w-full bg-[var(--surface-4)] rounded-lg overflow-hidden relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / summary.total_records) * 100}%` }}
                      className="h-full bg-emerald-500/20"
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                       <span className="text-[8px] font-black text-emerald-600">
                         {((count / summary.total_records) * 100).toFixed(0)}%
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-3xl border border-[var(--surface-4)]">
           <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-6">
              <Target size={14} />
              Actionable Recommendations
            </div>
            <div className="space-y-4">
              {summary.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-amber-500">
                      <ChevronRight size={14} />
                    </div>
                    <p className="text-[10px] font-bold text-amber-700 leading-tight">
                      {rec}
                    </p>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 mt-2">
                <div className="flex gap-2 text-blue-500">
                   <Info size={14} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Strategy Pulse</span>
                </div>
                <p className="text-[10px] font-medium text-blue-700 mt-1">
                  AI recommends prioritising {Object.keys(summary.top_categories)[0]} due to high volume.
                </p>
              </div>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
