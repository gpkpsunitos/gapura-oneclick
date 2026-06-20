'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchRootCauseStatsAi, 
  fetchRootCauseCategories,
  RootCauseStatsAi
} from '@/lib/services/gapura-ai';
import { 
  Zap, 
  Search, 
  AlertCircle, 
  Activity, 
  ShieldCheck
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
} from 'recharts';

const COLORS = [
  'oklch(0.65 0.22 260)',
  'oklch(0.7 0.25 30)',
  'oklch(0.6 0.2 160)',
  'oklch(0.65 0.2 60)',
  'oklch(0.55 0.2 320)',
  'oklch(0.6 0.25 5)',
];

interface RootCauseCategory {
  name: string;
  description: string;
  keyword_count: number;
  severity_multiplier: number;
}

export function AiRootCauseInvestigation({ 
  title = "AI Root Cause Investigation",
  source
}: { 
  title?: string;
  source?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RootCauseStatsAi | null>(null);
  const [categories, setCategories] = useState<Record<string, RootCauseCategory> | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [statsData, categoriesData] = await Promise.all([
          fetchRootCauseStatsAi(source),
          fetchRootCauseCategories()
        ]);
        setStats(statsData);
        setCategories(categoriesData);
        if (statsData && statsData.top_categories && statsData.top_categories.length > 0) {
          setActiveCategory(statsData.top_categories[0][0]);
        }
      } catch (err) {
        console.error('AI Root Cause Fetch Error:', err);
        setError('Failed to load AI intelligence data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [source]);

  const chartData = useMemo(() => {
    if (!stats?.top_categories) return [];
    return stats.top_categories.map(([name, data]) => ({ 
      name, 
      value: typeof data === 'object' ? (data as any).count : data 
    }));
  }, [stats]);

  const activeCategoryData = useMemo(() => {
    if (!activeCategory || !stats?.by_category) return null;
    return stats.by_category[activeCategory];
  }, [activeCategory, stats]);

  const activeColor = useMemo(() => {
    if (!activeCategory || chartData.length === 0) return COLORS[0];
    const index = chartData.findIndex(d => d.name === activeCategory);
    return index !== -1 ? COLORS[index % COLORS.length] : COLORS[0];
  }, [activeCategory, chartData]);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4 bg-[var(--surface-1)]/50 backdrop-blur-xl rounded-3xl border border-[var(--surface-border)] shadow-spatial-md">
        <div className="relative">
          <div className="absolute inset-0 bg-[var(--brand-primary)]/20 blur-2xl rounded-full animate-pulse" />
          <Activity className="relative animate-pulse text-[var(--brand-primary)]" size={32} />
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] text-[var(--text-secondary)] uppercase">Decrypting AI Intelligence...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-[200px] flex items-center justify-center gap-3 bg-red-500/5 backdrop-blur-xl rounded-3xl border border-red-500/10 text-red-500/80 shadow-spatial-md">
        <AlertCircle size={18} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-widest">Intelligence service temporarily offline.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header Stat Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.total_records, highlight: false },
          { label: 'Classified', value: stats.classified, highlight: true, color: 'text-[var(--brand-primary)]' },
          { label: 'Unknown', value: stats.unknown, highlight: false },
          { label: 'Classification Rate', value: `${stats.classification_rate}%`, highlight: true, color: 'text-[var(--brand-emerald-500)]' }
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, ease: [0.19, 1, 0.22, 1] }}
            className="bg-[var(--surface-1)] backdrop-blur-3xl p-5 rounded-3xl border border-[var(--surface-border)] shadow-spatial-sm relative overflow-hidden group/stat"
          >
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
            {stat.highlight && <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--brand-primary)]/10 blur-[40px] rounded-full group-hover/stat:bg-[var(--brand-primary)]/20 transition-colors" />}
            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className={`text-2xl font-black font-display tracking-tight ${stat.highlight ? stat.color : 'text-[var(--text-primary)]'}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Left Panel: Distribution ─── */}
        <div className="lg:col-span-5 bg-[var(--surface-1)] backdrop-blur-3xl rounded-3xl border border-[var(--surface-border)] p-8 shadow-spatial-md overflow-hidden relative isolate">
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-sm font-black text-[var(--text-primary)] tracking-[0.1em] uppercase flex items-center gap-2">
              <Zap size={16} className="text-amber-500 fill-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              Root Cause Matrix
            </h3>
          </div>

          <div className="h-[280px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(data) => setActiveCategory(data.name)}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="cursor-pointer transition-all duration-300 hover:opacity-100 outline-none"
                      style={{ 
                        filter: activeCategory === entry.name ? 'drop-shadow(0 0 16px currentColor) brightness(1.2)' : 'opacity(0.6) grayscale(20%)' 
                      }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid var(--surface-border)', 
                    boxShadow: '0 20px 40px -4px rgba(0,0,0,0.2)',
                    fontSize: '11px',
                    fontWeight: '900',
                    fontFamily: 'var(--font-display)',
                    backgroundColor: 'var(--surface-0)',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(20px)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-1">Taxonomy</span>
                <span className="text-3xl font-black text-[var(--text-primary)] font-display">{chartData.length}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 relative z-10">
            {chartData.map((cat, idx) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border shadow-sm ${
                    isActive 
                      ? 'bg-[var(--text-primary)] text-[var(--surface-1)] border-[var(--text-primary)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] scale-105' 
                      : 'bg-[var(--surface-2)]/50 text-[var(--text-secondary)] border-[var(--surface-border)] hover:border-[var(--text-tertiary)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Right Panel: Deep Dive ─── */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, scale: 0.98, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98, x: -20 }}
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="bg-[#0a0f16] rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl isolate h-full border border-white/5"
            >
              <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
              
              {/* Dynamic flares */}
              <div 
                className="absolute -top-32 -right-32 w-[600px] h-[600px] blur-[140px] rounded-full opacity-20 pointer-events-none transition-colors duration-1000 mix-blend-screen"
                style={{ backgroundColor: activeColor }}
              />
              <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none mix-blend-screen">
                <Search size={280} strokeWidth={0.5} />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner"
                    style={{ backgroundColor: `${activeColor}15`, border: `1px solid ${activeColor}30` }}
                  >
                    <ShieldCheck style={{ color: activeColor }} size={24} className="drop-shadow-[0_0_12px_currentColor]" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Isolation Matrix</h4>
                    <h4 className="text-2xl lg:text-3xl font-black tracking-tight text-white font-display">{activeCategory}</h4>
                  </div>
                </div>

                <p className="text-white/60 text-sm leading-relaxed mb-10 max-w-2xl font-medium border-l-2 pl-4" style={{ borderColor: `${activeColor}50` }}>
                  {activeCategoryData?.description || categories?.[activeCategory || '']?.description || "Analyzing behavioral patterns and operational friction points identified by AI logic engine."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top Areas */}
                  <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-inner">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                       <Activity size={12} style={{ color: activeColor }} />
                       Critical Hotspots (Area)
                    </h5>
                    <div className="space-y-5">
                      {activeCategoryData && Object.entries(activeCategoryData.top_areas || {}).slice(0, 3).map(([area, val], idx) => (
                        <div key={area} className="group cursor-default">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-white/90">{area}</span>
                            <span className="text-[10px] font-mono font-bold text-white/40">{String(val)}</span>
                          </div>
                          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Number(val) / activeCategoryData.count) * 100}%` }}
                              transition={{ duration: 1.2, delay: idx * 0.1, ease: [0.19, 1, 0.22, 1] }}
                              className="h-full relative overflow-hidden"
                              style={{ backgroundColor: activeColor, boxShadow: `0 0 10px ${activeColor}50` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Airlines */}
                  <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-inner">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                       <Activity size={12} style={{ color: activeColor }} />
                       Impact Distribution (Airline)
                    </h5>
                    <div className="space-y-5">
                      {activeCategoryData && Object.entries(activeCategoryData.top_airlines || {}).slice(0, 3).map(([airline, val], idx) => (
                         <div key={airline} className="group cursor-default">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-white/90">{airline}</span>
                            <span className="text-[10px] font-mono font-bold text-white/40">{String(val)}</span>
                          </div>
                          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Number(val) / activeCategoryData.count) * 100}%` }}
                              transition={{ duration: 1.2, delay: idx * 0.1, ease: [0.19, 1, 0.22, 1] }}
                              className="h-full relative overflow-hidden"
                              style={{ backgroundColor: activeColor, boxShadow: `0 0 10px ${activeColor}50` }}
                            >
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Issue Categories */}
                {activeCategoryData && Object.keys(activeCategoryData.top_issue_categories || {}).length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">
                      Micro-Symptoms & Variations
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(activeCategoryData.top_issue_categories || {}).slice(0, 5).map(([issue, count], i) => (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + (i * 0.05) }}
                          key={issue}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black text-white/80 uppercase tracking-widest transition-colors cursor-default shadow-sm"
                        >
                          {issue || '(UNCLASSIFIED)'} <span className="opacity-40 ml-1.5 font-mono">[{count}]</span>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
