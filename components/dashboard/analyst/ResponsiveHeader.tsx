'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  Plus,
  LayoutDashboard,
  Shield,
  MoreVertical,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileActionMenu } from '@/components/ui/MobileActionMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ResponsiveHeaderProps {
  dateRange: 'all' | 'week' | 'month' | { from: string; to: string };
  onDateRangeChange: (range: 'all' | 'week' | 'month' | { from: string; to: string }) => void;
  onRefresh: () => void;
    refreshing: boolean;
    onCustomerFeedback?: () => void;
    cfLoading?: boolean;
    onFilterClick?: () => void;
    onExportExcel: () => void;
    onExportPDF: () => void;
    exporting: 'excel' | 'pdf' | null;
    divisionDashboardLabel?: string;
    onOpenDivisionDashboard?: () => void;
    onSwitchDivision?: () => void;
}

/**
 * Responsive Header Component for Analyst Dashboard
 * Mobile-first design with optimized touch targets
 */
export function ResponsiveHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onCustomerFeedback,
  cfLoading,
  onFilterClick,
  onExportExcel,
  onExportPDF,
  exporting,
  divisionDashboardLabel,
  onOpenDivisionDashboard,
  onSwitchDivision,
}: ResponsiveHeaderProps) {
  const router = useRouter();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(typeof dateRange === 'object');
  const [customRange, setCustomRange] = useState(
    typeof dateRange === 'object' 
      ? dateRange 
      : { from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
  );

  const dateRangeOptions = [
    { value: 'all' as const, label: 'Semua', shortLabel: 'Semua' },
    { value: 'month' as const, label: '30 Hari', shortLabel: '30d' },
    { value: 'week' as const, label: '7 Hari', shortLabel: '7d' },
    { value: 'custom' as const, label: 'Kustom', shortLabel: 'Kustom' },
  ];

  const currentDateLabel = typeof dateRange === 'string' 
    ? dateRangeOptions.find((o) => o.value === dateRange)
    : { label: 'Kustom', value: 'custom' };

  // Mobile menu actions for hidden buttons
  const mobileMenuActions: { label: string; icon?: ReactNode; onClick: () => void }[] = [];
  if (onCustomerFeedback) {
    mobileMenuActions.push({
      label: 'Customer Feedback',
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onCustomerFeedback,
    });
  }
  if (onFilterClick) {
    mobileMenuActions.push({
      label: 'Filter Dashboard',
      icon: <Shield className="w-4 h-4" />,
      onClick: onFilterClick,
    });
  }
  if (onOpenDivisionDashboard && divisionDashboardLabel) {
    mobileMenuActions.push({
      label: divisionDashboardLabel,
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onOpenDivisionDashboard,
    });
  }
  if (onSwitchDivision) {
    mobileMenuActions.push({
      label: 'Ganti Divisi',
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onSwitchDivision,
    });
  }
  mobileMenuActions.push(
    {
      label: 'Download Excel',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: onExportExcel,
    },
    {
      label: 'Download PDF',
      icon: <FileText className="w-4 h-4" />,
      onClick: onExportPDF,
    }
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-text-primary">
          Pusat Analytics
        </h1>
        <p className="text-sm sm:text-base font-body font-medium text-brand-emerald-700">
          Divisi Operational Services Center
        </p>
      </div>

      {/* Controls Section - Responsive Layout */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between flex-wrap">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          {/* Desktop: Segmented Control */}
          <div className="hidden sm:flex items-center p-1.5 rounded-2xl bg-[oklch(0.97_0.012_160_/_0.6)] backdrop-blur-xl border border-[oklch(0.65_0.18_160_/_0.15)] shadow-[inset_0_1px_2px_oklch(0.45_0.06_160_/_0.06)]">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value === 'custom') {
                    setShowCustomPicker(true);
                  } else {
                    setShowCustomPicker(false);
                    onDateRangeChange(option.value);
                  }
                }}
                className={cn(
                  'px-5 py-2.5 text-[11px] font-display font-black uppercase tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap min-h-[40px]',
                  (typeof dateRange === 'string' ? dateRange === option.value : option.value === 'custom')
                    ? 'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)] shadow-lg shadow-emerald-500/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-[oklch(0.95_0.015_160_/_0.5)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showCustomPicker && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center p-1 rounded-xl bg-[oklch(0.97_0.012_160_/_0.6)] border border-[oklch(0.65_0.18_160_/_0.15)]">
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => {
                    const newRange = { ...customRange, from: e.target.value };
                    setCustomRange(newRange);
                    onDateRangeChange(newRange);
                  }}
                  className="bg-transparent border-0 text-[11px] font-bold p-1 w-[120px] focus:ring-0"
                />
                <span className="text-[10px] px-1 text-text-muted">→</span>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => {
                    const newRange = { ...customRange, to: e.target.value };
                    setCustomRange(newRange);
                    onDateRangeChange(newRange);
                  }}
                  className="bg-transparent border-0 text-[11px] font-bold p-1 w-[120px] focus:ring-0"
                />
              </div>
            </div>
          )}

          {/* Mobile: Dropdown */}
          <div className="sm:hidden w-full">
            <DropdownMenu open={isDateOpen} onOpenChange={setIsDateOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {currentDateLabel?.label}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] bg-[var(--surface-1)] border border-[var(--surface-3)] shadow-xl rounded-xl p-1 backdrop-blur-0">
                {dateRangeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      if (option.value === 'custom') {
                        setShowCustomPicker(true);
                      } else {
                        setShowCustomPicker(false);
                        onDateRangeChange(option.value);
                      }
                      setIsDateOpen(false);
                    }}
                    className={cn(
                      'min-h-[44px] cursor-pointer focus:bg-gray-50',
                      (typeof dateRange === 'string' ? dateRange === option.value : option.value === 'custom') && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showCustomPicker && (
            <div className="sm:hidden w-full space-y-2 mt-2 p-3 rounded-2xl bg-[oklch(0.97_0.012_160_/_0.6)] border border-[oklch(0.65_0.18_160_/_0.15)] animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Mulai</span>
                  <input
                    type="date"
                    value={customRange.from}
                    onChange={(e) => {
                      const newRange = { ...customRange, from: e.target.value };
                      setCustomRange(newRange);
                      onDateRangeChange(newRange);
                    }}
                    className="bg-white/50 border border-surface-3 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Selesai</span>
                  <input
                    type="date"
                    value={customRange.to}
                    onChange={(e) => {
                      const newRange = { ...customRange, to: e.target.value };
                      setCustomRange(newRange);
                      onDateRangeChange(newRange);
                    }}
                    className="bg-white/50 border border-surface-3 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Desktop: Full buttons */}
          {onCustomerFeedback && (
            <Button
              onClick={onCustomerFeedback}
              disabled={cfLoading}
              className={cn(
                'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-6',
                'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)]',
                'rounded-2xl border-0 shadow-lg shadow-emerald-500/20 transition-all duration-300',
                'hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 font-display font-bold',
                cfLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {cfLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LayoutDashboard size={16} />
              )}
              <span className="hidden 2xl:inline tracking-tight">Feedback</span>
            </Button>
          )}

          {onFilterClick && (
            <Button
              onClick={onFilterClick}
              variant="ghost"
              className={cn(
                'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-5',
                'bg-[oklch(1_0_0_/_0.3)] backdrop-blur-xl border border-[oklch(1_0_0_/_0.1)] text-[var(--text-primary)] transition-all duration-300',
                'rounded-2xl hover:bg-[oklch(1_0_0_/_0.5)] hover:-translate-y-0.5 active:scale-95'
              )}
            >
              <Shield size={16} className="text-emerald-600" />
              <span className="hidden 2xl:inline font-bold tracking-tight">Filter</span>
            </Button>
          )}

          {onOpenDivisionDashboard && divisionDashboardLabel && (
            <Button
              onClick={onOpenDivisionDashboard}
              className={cn(
                'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-6',
                'bg-gradient-to-br from-teal-700 to-cyan-700 text-white',
                'rounded-2xl border-0 shadow-lg shadow-teal-600/20 transition-all duration-300',
                'hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 active:scale-95 font-display font-bold'
              )}
            >
              <LayoutDashboard size={16} />
              <span className="hidden 2xl:inline tracking-tight">{divisionDashboardLabel}</span>
            </Button>
          )}
          
          {onSwitchDivision && (
            <Button
              onClick={onSwitchDivision}
              variant="ghost"
              className={cn(
                'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-5',
                'bg-[oklch(1_0_0_/_0.3)] backdrop-blur-xl border border-[oklch(1_0_0_/_0.1)] text-[var(--text-primary)] transition-all duration-300',
                'rounded-2xl hover:bg-[oklch(1_0_0_/_0.5)] hover:-translate-y-0.5 active:scale-95'
              )}
            >
              <LayoutDashboard size={16} className="text-emerald-600" />
              <span className="hidden 2xl:inline font-bold tracking-tight">Ganti Divisi</span>
            </Button>
          )}

          <Button
            onClick={onExportExcel}
            disabled={exporting !== null}
            variant="ghost"
            className={cn(
              'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-5',
              'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold',
              'rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95',
              exporting === 'excel' && 'opacity-50'
            )}
          >
            {exporting === 'excel' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            <span className="hidden 2xl:inline">Excel</span>
          </Button>

          <Button
            onClick={onExportPDF}
            disabled={exporting !== null}
            variant="ghost"
            className={cn(
              'hidden xl:inline-flex items-center gap-2 min-h-[48px] px-5',
              'bg-red-500/5 hover:bg-red-500/10 text-red-600 border border-red-500/20 font-bold',
              'rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95',
              exporting === 'pdf' && 'opacity-50'
            )}
          >
            {exporting === 'pdf' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            <span className="hidden 2xl:inline">PDF</span>
          </Button>

          {/* Mobile: Action menu for hidden buttons */}
          <div className="xl:hidden w-full sm:w-auto">
            <MobileActionMenu
              actions={mobileMenuActions}
              triggerLabel="Menu"
              align="end"
            />
          </div>

          {/* Create Report Button */}
          <Button
            onClick={() => router.push('/dashboard/employee/new')}
            className={cn(
              'min-h-[48px] px-6 rounded-2xl font-display font-bold tracking-tight transition-all duration-300 w-full sm:w-auto',
              'bg-gradient-to-br from-[var(--brand-emerald-500)] to-[var(--brand-emerald-600)] text-[var(--text-on-brand)]',
              'hover:shadow-xl hover:-translate-y-0.5 active:scale-95'
            )}
          >
            <Plus size={18} className="sm:mr-2" />
            <span className="hidden sm:inline">Laporan</span>
          </Button>

          {/* Divider - hidden on smallest screens */}
          <div className="hidden sm:block h-8 w-px bg-[var(--surface-4)]" />

          {/* Refresh Button */}
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            className={cn(
              'min-h-[44px] min-w-[44px] sm:min-w-fit w-full sm:w-auto',
              'inline-flex items-center gap-2',
              refreshing && 'opacity-50'
            )}
          >
            <RefreshCw
              size={16}
              className={cn(refreshing && 'animate-spin')}
            />
            <span className="hidden sm:inline">
              {refreshing ? '...' : 'Refresh'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
