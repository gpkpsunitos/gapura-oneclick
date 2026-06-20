'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { cn } from '@/lib/utils';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

interface DetailFilterHeaderProps {
  title: string;
  subtitle: string;
  filters: any;
  setFilters: (update: (prev: any) => any) => void;
  sourcePage?: string;
  hideFilters?: boolean;
  extraHeaderInfo?: React.ReactNode;
  extraFilters?: React.ReactNode;
}

export default function DetailFilterHeader({
  title,
  subtitle,
  filters,
  setFilters,
  sourcePage = 'customer-feedback-main',
  hideFilters = false,
  extraHeaderInfo,
  extraFilters
}: DetailFilterHeaderProps) {
  const router = useRouter();
  const { hubs, branches, airlines, areas, isLoading } = useFilterOptions(filters.sourceSheet);

  const getBackUrl = () => {
    if (sourcePage && sourcePage !== 'main') {
      return `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`;
    }
    return '/embed/custom/customer-feedback-main';
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-[1400px]"
    >
      <div className="relative group">
        {/* Dynamic Island Capsule */}
        <div className="absolute inset-0 bg-[var(--surface-0)]/80 backdrop-blur-2xl rounded-[2.5rem] border border-[var(--glass-rim)] shadow-spatial-lg" />
        
        <div className="relative px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(getBackUrl())}
              className="p-4 bg-[var(--surface-2)] rounded-3xl border border-[var(--surface-4)] shadow-inner group transition-all"
            >
              <ArrowLeft size={20} className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]" />
            </motion.button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter text-[var(--text-primary)]">
                  {title}
                </h1>
                <span className="px-3 py-1 rounded-full bg-[var(--brand-emerald-500)] text-[9px] font-black text-[var(--text-on-brand)] uppercase tracking-widest">
                  {filters.sourceSheet}
                </span>
              </div>
              <p className="text-xs font-bold text-[var(--text-muted)] tracking-tight">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hideFilters && (
              <div className="flex items-center gap-2 bg-[var(--surface-2)]/50 p-1.5 rounded-[2rem] border border-[var(--surface-4)]">
                <div className="hidden xl:flex items-center gap-2 px-4 border-r border-[var(--surface-4)] mr-2">
                  <Filter size={14} className="text-[var(--brand-emerald-500)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Matrix</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterSelect
                    label="Hub"
                    value={filters.hub}
                    options={['all', ...hubs]}
                    onChange={(val) => setFilters(f => ({ ...f, hub: val }))}
                    isLoading={isLoading}
                  />
                  <FilterSelect
                    label="Branch"
                    value={filters.branch}
                    options={['all', ...branches]}
                    onChange={(val) => setFilters(f => ({ ...f, branch: val }))}
                    isLoading={isLoading}
                  />
                  <FilterSelect
                    label="Carrier"
                    value={filters.airlines}
                    options={['all', ...airlines]}
                    onChange={(val) => setFilters(f => ({ ...f, airlines: val }))}
                    isLoading={isLoading}
                  />
                </div>

                <motion.button
                  whileHover={{ rotate: 180, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFilters(f => ({ ...f, hub: 'all', branch: 'all', airlines: 'all', area: 'all' }))}
                  className="p-3 bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] rounded-full border border-[var(--surface-4)] shadow-sm transition-colors"
                >
                  <RefreshCcw size={14} />
                </motion.button>
              </div>
            )}
            
            {extraFilters}
          </div>
        </div>
      </div>
      
      {extraHeaderInfo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 ml-20"
        >
          {extraHeaderInfo}
        </motion.div>
      )}
    </motion.header>
  );
}

function FilterSelect({ 
  label, 
  value, 
  options, 
  onChange,
  isLoading 
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange: (val: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className={cn(
          "appearance-none pl-4 pr-10 py-2.5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-2xl",
          "text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[var(--brand-emerald-500)]/20 focus:border-[var(--brand-emerald-500)]",
          "min-w-[140px] shadow-inner cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <option value="all">All {label}s</option>
        {options.filter(opt => opt !== 'all').map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
