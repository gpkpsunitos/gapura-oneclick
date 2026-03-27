'use client';

import { useState } from 'react';
import type { QueryResult } from '@/types/builder';
import { ViewMode, Normalization } from '@/components/chart-detail/GlobalControlBar';
import { usePivotData } from './pivot/usePivotData';
import { PivotHeader } from './pivot/PivotHeader';
import { PivotGrid } from './pivot/PivotGrid';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface CustomPivotTableProps {
  result: QueryResult;
  title?: string;
  subtitle?: string;
  viewMode?: ViewMode; // Kept for backward compatibility
  normalization?: Normalization;
  compact?: boolean;
}

export function CustomPivotTable({ 
  result, 
  title, 
  viewMode = 'values', 
  normalization = 'none',
  compact = false 
}: CustomPivotTableProps) {
  
  // State
  // Initialize normalization from prop, but allow internal toggle
  // If viewMode is 'percentage', default to 'row' normalization if not specific
  // But let's stick to the explicit prop for now.
  const [activeNormalization, setActiveNormalization] = useState<Normalization>(normalization);
  const [sortCol, setSortCol] = useState<string>('total');
  const [sortDesc, setSortDesc] = useState(true);

  // Data Processing Hook
  const processedData = usePivotData({
      result,
      title,
      sortCol,
      sortDesc
  });

  if (!processedData || !processedData.hasData) {
      return (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 font-medium">No data available for Pivot Table</p>
          </div>
      );
  }

  const handleSort = (col: string) => {
      if (sortCol === col) {
          setSortDesc(!sortDesc);
      } else {
          setSortCol(col);
          setSortDesc(true); // Default to desc for new col
      }
  };

  return (
    <div className={cn(
        "flex flex-col h-full bg-white font-sans rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all",
        compact ? "shadow-none border-0" : "shadow-sm"
    )}>
      
      {/* 1. HEADER & CONTROLS */}
      <PivotHeader 
          title={title}
          totalRecords={processedData.grandTotal}
          normalization={activeNormalization}
          onNormalizationChange={setActiveNormalization}
          compact={compact}
      />

      {/* 2. TABLE GRID */}
      <PivotGrid 
          data={processedData}
          sortCol={sortCol}
          sortDesc={sortDesc}
          onSort={handleSort}
          normalization={activeNormalization}
          compact={compact}
      />
      
    </div>
  );
}

