'use client';

import { useRouter } from 'next/navigation';
import { FileText, Eye, Send } from 'lucide-react';
import { ResponsiveTable } from '@/components/tables/ResponsiveTable';
import { TableColumn, TableAction } from '@/components/tables/CardViewTable';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { STATUS_CONFIG } from '@/lib/constants/report-status';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';

interface ReportsTableSectionProps {
  reports: Report[];
  dateRange: 'all' | 'week' | 'month' | { from: string; to: string };
  onViewReport: (report: Report) => void;
  onTriageReport: (report: Report) => void;
  drilldownUrl: (type: string, value: string) => string;
}

/**
 * Reports Table Section Component
 * Uses ResponsiveTable for mobile-first design
 * Card view on mobile, traditional table on desktop
 */
export function ReportsTableSection({
  reports,
  dateRange,
  onViewReport,
  onTriageReport,
  drilldownUrl,
}: ReportsTableSectionProps) {
  const router = useRouter();

  // Filter today's cases
  const todayCases = reports.filter(
    (r) => new Date(r.created_at).toDateString() === new Date().toDateString()
  );

  // Define columns with priorities for mobile visibility
  const columns: TableColumn<Report>[] = [
    {
      key: 'title',
      header: 'Judul',
      priority: 'high',
      accessor: (report) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {report.primary_tag === 'CGO' ? (
              <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
                CGO
              </span>
            ) : (
              <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">
                L&A
              </span>
            )}
            <span className="text-[9px] text-[var(--text-muted)] font-mono">
              {report.id.slice(0, 8)}
            </span>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[250px]">
            {report.report || report.title || '(Tanpa Judul)'}
          </p>
        </div>
      ),
      width: '35%',
    },
    {
      key: 'status',
      header: 'Status',
      priority: 'medium',
      accessor: (report) => (
        <span
          className="px-2 py-1 rounded-full text-[10px] font-bold uppercase inline-block"
          style={{
            color: STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.color,
            backgroundColor:
              STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.bgColor,
          }}
        >
          {STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.label ||
            report.status}
        </span>
      ),
      width: '15%',
    },
    {
      key: 'severity',
      header: 'Severity',
      priority: 'medium',
      accessor: (report) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-[10px] font-bold uppercase',
            report.severity === 'high' || report.severity === 'urgent'
              ? 'bg-red-100 text-red-700'
              : report.severity === 'medium'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
          )}
        >
          {report.severity || 'low'}
        </span>
      ),
      width: '12%',
    },
    {
      key: 'station',
      header: 'Stasiun',
      priority: 'low',
      accessor: (report) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {report.stations?.code || report.branch || '-'}
        </span>
      ),
      width: '12%',
    },
    {
      key: 'date',
      header: 'Tanggal',
      priority: 'low',
      accessor: (report) => (
        <span className="text-sm text-[var(--text-muted)]">
          {new Date(report.created_at).toLocaleDateString('id-ID')}
        </span>
      ),
      width: '15%',
    },
  ];

  // Define row actions
  const actions: TableAction<Report>[] = [
    {
      label: 'Lihat',
      icon: <Eye size={16} />,
      onClick: onViewReport,
      variant: 'ghost',
    },
  ];

  // Add triage action for unassigned reports
  const getActions = (report: Report): TableAction<Report>[] => {
    const baseActions = [...actions];

    if (
      !report.target_division &&
      report.status === 'OPEN'
    ) {
      baseActions.unshift({
        label: 'Triage',
        icon: <Send size={16} />,
        onClick: onTriageReport,
        variant: 'primary',
      });
    }

    return baseActions;
  };

  return (
    <PresentationSlide
      title="Laporan Hari Ini"
      subtitle={`${todayCases.length} laporan hari ini`}
      icon={FileText}
      className="animate-fade-in-up"
      style={{ animationDelay: '200ms' }}
    >
      <div className="card-solid p-0 overflow-hidden">
        <ResponsiveTable
          data={todayCases.slice(0, 10)}
          columns={columns}
          actions={actions}
          keyExtractor={(report) => report.id}
          onRowClick={onViewReport}
          emptyMessage="Tidak ada laporan hari ini"
          cardBreakpoint={768}
          className="border-0 rounded-none"
        />

        {/* View All Link */}
        {todayCases.length > 10 && (
          <div className="p-4 border-t border-[var(--surface-4)] bg-[var(--surface-1)]">
            <button
              onClick={() => router.push('/dashboard/analyst/reports')}
              className="text-sm text-[var(--brand-primary)] font-medium hover:underline w-full text-center"
            >
              Lihat semua {todayCases.length} laporan →
            </button>
          </div>
        )}
      </div>
    </PresentationSlide>
  );
}
