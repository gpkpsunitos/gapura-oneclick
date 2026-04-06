'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  AnalyticsSourceStrip,
  AnalyticsSection,
  AnalyticsSectionLoading,
} from '@/components/dashboard/analytics-source-strip';
import {
  OpAnalyticsFilterBar,
  useFilterOptions,
  type OpFilterState,
} from '@/components/dashboard/op-analytics-filter-bar';
import type {
  AnalyticsRuntimeStatus,
  AnalyticsSourceDescriptor,
} from '@/lib/op-shortcut-source-matrix';

export interface OpPageLayoutProps {
  title: string;
  description?: string;
  realSource: AnalyticsSourceDescriptor;
  realStatus?: AnalyticsRuntimeStatus;
  aiSource?: AnalyticsSourceDescriptor;
  aiStatus?: AnalyticsRuntimeStatus;
  /** Filter state + handlers */
  filters: OpFilterState;
  onFiltersChange: (filters: OpFilterState) => void;
  /** All reports — used to compute filter dropdown options */
  reports: Record<string, unknown>[];
  /** Show source sheet toggle in filter bar */
  showSourceSheetToggle?: boolean;
  /** Content */
  children: ReactNode;
  /** Loading state for AI section */
  aiLoading?: boolean;
  /** Error state for AI section */
  aiError?: string | null;
  /** Extra header content (e.g., export button) */
  headerExtra?: ReactNode;
}

export function OpPageLayout({
  title,
  description,
  realSource,
  realStatus,
  aiSource,
  aiStatus,
  filters,
  onFiltersChange,
  reports,
  showSourceSheetToggle = true,
  children,
  aiLoading,
  aiError,
  headerExtra,
}: OpPageLayoutProps) {
  const filterOptions = useFilterOptions(reports);

  return (
    <div className="min-h-screen space-y-5 px-3 py-4 sm:px-4 md:px-6">
      {/* Source strip header */}
      <AnalyticsSourceStrip
        title={title}
        description={description}
        realSource={realSource}
        realStatus={realStatus}
        aiSource={aiSource}
        aiStatus={aiStatus}
      />

      {/* Global filter bar */}
      <OpAnalyticsFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        hubOptions={filterOptions.hubOptions}
        branchOptions={filterOptions.branchOptions}
        airlineOptions={filterOptions.airlineOptions}
        showSourceSheetToggle={showSourceSheetToggle}
      />

      {/* Header extra (e.g. export actions) */}
      {headerExtra && (
        <div className="flex items-center justify-end gap-2">
          {headerExtra}
        </div>
      )}

      {/* Real data section */}
      <AnalyticsSection
        title="Data Aktual"
        description="Data real dihitung langsung dari dataset laporan utama yang mengikuti GOOGLE_SHEET_ID."
        variant="real"
      >
        {children}
      </AnalyticsSection>

      {/* AI section */}
      {aiSource ? (
        <AnalyticsSection
          title="Analitik AI"
          description="Layer AI menggunakan internal proxy. Metrik ini tidak dicampur dengan volume real."
          variant="ai"
        >
          {aiLoading ? (
            <AnalyticsSectionLoading
              variant="ai"
              title="Memuat analitik AI"
              description="Pipeline AI sedang menghitung distribusi severity, ranking, dan rekomendasi."
              cards={4}
              panels={3}
            />
          ) : aiError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {aiError}
            </div>
          ) : null}
        </AnalyticsSection>
      ) : null}
    </div>
  );
}
