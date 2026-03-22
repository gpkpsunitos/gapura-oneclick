import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryResult } from '@/types/builder';
import { ArrowRight, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import { ViewMode, Normalization } from '@/components/chart-detail/GlobalControlBar';

interface BranchAreaGridProps {
  data: QueryResult;
  config: {
    xAxis?: string; // e.g. 'Area'
    yAxis: string[]; // e.g. ['Branch']
    colors?: string[];
  };
  viewMode?: ViewMode;
  normalization?: Normalization;
}

interface AreaStat {
  area: string;
  count: number;
  percentage: number;
}

interface BranchData {
  branch: string;
  total: number;
  percentageOfTotal: number;
  areas: AreaStat[];
}

const AREA_COLORS: Record<string, string> = {
  'Terminal Area': 'bg-emerald-500',
  'Apron Area': 'bg-emerald-400',
  'General': 'bg-emerald-300',
};

const AREA_COLORS_HEX: Record<string, string> = {
  'Terminal Area': '#10b981', // emerald-500
  'Apron Area': '#34d399',    // emerald-400
  'General': '#6ee7b7',       // emerald-300
};

export function BranchAreaGrid({ data, config, viewMode = 'values', normalization = 'none' }: BranchAreaGridProps) {
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);

  // 1. Process Data
  const processedData = useMemo(() => {
    if (!data || !data.rows) return { branches: [], grandTotal: 0 };

    const branchField = config.yAxis[0] || 'Branch';
    const areaField = config.xAxis || 'Area';

    // Group by Branch
    const branchMap = new Map<string, { total: number; areas: Map<string, number> }>();
    let grandTotal = 0;

    data.rows.forEach(row => {
      const branch = String(row[branchField] || 'Unknown');
      const area = String(row[areaField] || 'Other');
      // "Total", "count", "Grand total" - handle variations
      const count = Number(row['Total'] || row['count'] || row['Grand total'] || 0);

      if (!branchMap.has(branch)) {
        branchMap.set(branch, { total: 0, areas: new Map() });
      }

      const branchEntry = branchMap.get(branch)!;
      branchEntry.total += count;
      grandTotal += count;
      
      const currentAreaCount = branchEntry.areas.get(area) || 0;
      branchEntry.areas.set(area, currentAreaCount + count);
    });

    // Convert to Array & Sort
    const result: BranchData[] = Array.from(branchMap.entries()).map(([branch, stats]) => {
      const areas: AreaStat[] = Array.from(stats.areas.entries()).map(([area, count]) => ({
        area,
        count,
        percentage: stats.total > 0 ? count / stats.total : 0
      })).sort((a, b) => b.count - a.count); // Sort areas by count descending

      return {
        branch,
        total: stats.total,
        percentageOfTotal: grandTotal > 0 ? stats.total / grandTotal : 0,
        areas
      };
    }).sort((a, b) => b.total - a.total); // Sort branches by total descending

    return { branches: result, grandTotal };
  }, [data, config]);

  const { branches, grandTotal } = processedData;

  // 2. Render
  return (
    <div className="w-full space-y-4">
      {/* Controls / Header (Minimal as requested) */}
      <div className="flex justify-between items-center mb-2 px-2">
         <div className="text-sm text-gray-500">
            Total Cases: <span className="font-semibold text-gray-900">{grandTotal}</span>
         </div>
         <div className="flex items-center space-x-2 text-xs">
            <span className={viewMode === 'values' ? 'font-bold text-gray-900' : 'text-gray-500'}>Count</span>
            <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${viewMode === 'values' ? 'bg-gray-300' : 'bg-emerald-500'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${viewMode === 'values' ? 'translate-x-0' : 'translate-x-4'}`} />
            </div>
            <span className={viewMode === 'percentage' ? 'font-bold text-gray-900' : 'text-gray-500'}>%</span>
         </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {branches.map((item) => (
          <motion.div
            key={item.branch}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative overflow-hidden group"
            onMouseEnter={() => setHoveredBranch(item.branch)}
            onMouseLeave={() => setHoveredBranch(null)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 leading-tight">{item.branch}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  {/* % Contribution Badge */}
                  <span className="inline-block bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-100">
                    {(item.percentageOfTotal * 100).toFixed(1)}% of Total
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{item.total}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Cases</div>
              </div>
            </div>

            {/* Content: Stat Rows (replacing the mini-bar with explicit rows as per "mini stacked bar" might be too small for text, but user asked for "mini stacked horizontal bar (100% width)" AND "Category percentage labels") */}
            {/* Wait, user asked for: 
                - Mini stacked horizontal bar (100% width)
                - Category percentage labels 
            */}
            
            {/* Stacked Bar */}
            <div className="h-2 w-full flex rounded-full overflow-hidden bg-gray-100 mb-4">
              {item.areas.map((areaStat) => (
                <div
                  key={areaStat.area}
                  style={{ width: `${areaStat.percentage * 100}%`, backgroundColor: AREA_COLORS_HEX[areaStat.area] || '#cbd5e1' }}
                  className="h-full relative group/bar"
                  title={`${areaStat.area}: ${areaStat.count} (${(areaStat.percentage * 100).toFixed(1)}%)`}
                />
              ))}
            </div>

            {/* Detailed Rows */}
            <div className="space-y-2">
              {item.areas.map((areaStat) => (
                <div key={areaStat.area} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                     <div className={`w-2 h-2 rounded-full ${AREA_COLORS[areaStat.area] || 'bg-gray-400'}`} />
                     <span className="text-gray-600 truncate max-w-[100px]" title={areaStat.area}>{areaStat.area}</span>
                  </div>
                  <div className="font-medium text-gray-700">
                     {viewMode === 'values' ? areaStat.count : `${(areaStat.percentage * 100).toFixed(0)}%`}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Hover Effect - Subtle green Glow */}
            <div className="absolute inset-0 border-2 border-emerald-500 opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-300" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
