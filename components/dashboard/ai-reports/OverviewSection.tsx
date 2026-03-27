'use client';

import { 
  Zap, 
  Play, 
  Search, 
  Sparkles, 
  BarChart3, 
  FileText, 
  Database,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  Loader2
} from 'lucide-react';
import { useViewport } from '@/hooks/useViewport';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

interface OverviewSectionProps {
  // Quick Actions
  quickActions: QuickAction[];
  
  // Model Stats
  modelInfo?: {
    regression?: {
      version?: string;
      metrics?: {
        test_mae?: number;
        test_r2?: number;
        n_samples?: number;
        feature_importance?: Record<string, number>;
      };
    };
  } | null;
  
  // Health Status
  healthStatus?: {
    status?: string;
    models?: {
      regression?: { loaded?: boolean; version?: string };
      nlp?: { status?: string; version?: string };
    };
    cache?: { status?: string; used_memory?: string };
  } | null;
  
  // Summaries
  summaries?: {
    nonCargo?: {
      summary?: {
        total_records?: number;
        critical_high_percentage?: number;
        top_categories?: Record<string, number>;
        top_airlines?: Record<string, number>;
      };
    } | null;
    cgo?: {
      summary?: {
        total_records?: number;
        critical_high_percentage?: number;
        top_categories?: Record<string, number>;
        top_airlines?: Record<string, number>;
      };
    } | null;
  };
  
  className?: string;
}

/**
 * Overview Section Component
 * Model stats cards (grid responsive), health status indicators, quick action buttons
 * All touch-friendly with min 44px touch targets
 */
export function OverviewSection({
  quickActions,
  modelInfo,
  healthStatus,
  summaries,
  className,
}: OverviewSectionProps) {
  const { isMobile, isTablet } = useViewport();

  const modelLoaded = healthStatus?.models?.regression?.loaded || false;
  const testMae = modelInfo?.regression?.metrics?.test_mae || 0;
  const testR2 = modelInfo?.regression?.metrics?.test_r2 || 0;
  const nSamples = modelInfo?.regression?.metrics?.n_samples || 0;

  // Sort features by importance
  const sortedFeatures = modelInfo?.regression?.metrics?.feature_importance
    ? Object.entries(modelInfo.regression.metrics.feature_importance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={cn(
                'flex items-center gap-2 sm:gap-3',
                'px-3 sm:px-4 py-3 sm:py-4',
                'text-sm font-medium rounded-lg',
                'transition-all duration-200',
                'min-h-[48px] sm:min-h-[56px]',
                'text-left',
                action.variant === 'primary' && 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
                action.variant === 'secondary' && 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
                (action.variant === 'outline' || !action.variant) && 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
                (action.disabled || action.loading) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {action.loading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
              ) : (
                <span className="shrink-0">{action.icon}</span>
              )}
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <StatCard
          title="Model Status"
          value={modelLoaded ? 'Active' : 'Inactive'}
          icon={CheckCircle2}
          color={modelLoaded ? 'bg-emerald-500' : 'bg-red-500'}
          subtitle={healthStatus?.models?.regression?.version}
        />
        <StatCard
          title="Test MAE"
          value={testMae.toFixed(3)}
          icon={Activity}
          color="bg-blue-500"
          subtitle="Mean Absolute Error"
        />
        <StatCard
          title="R² Score"
          value={testR2.toFixed(3)}
          icon={TrendingUp}
          color="bg-purple-500"
          subtitle="Coefficient of Determination"
        />
        <StatCard
          title="Training Samples"
          value={nSamples.toLocaleString()}
          icon={Database}
          color="bg-amber-500"
          subtitle="Total records used"
        />
      </div>

      {/* Feature Importance */}
      {sortedFeatures.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
          <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            Fitur Paling Penting
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
            Fitur-fitur ini memiliki pengaruh terbesar terhadap prediksi waktu penyelesaian.
          </p>
          <div className="space-y-2 sm:space-y-3">
            {sortedFeatures.map(([feature, importance], idx) => (
              <div key={feature} className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-mono w-5 sm:w-6 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium truncate" title={feature}>
                      {feature.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-500 shrink-0 ml-2">
                      {(importance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${importance * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Category Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Non-Cargo Summary */}
        {summaries?.nonCargo && (
          <SummaryCard
            title="Landside & Airside"
            icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />}
            color="emerald"
            summary={summaries.nonCargo.summary}
          />
        )}

        {/* CGO Summary */}
        {summaries?.cgo && (
          <SummaryCard
            title="Cargo (CGO)"
            icon={<Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
            color="blue"
            summary={summaries.cgo.summary}
          />
        )}
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 lg:p-5 border-l-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5 sm:mb-1 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          'p-2 sm:p-2.5 rounded-lg shrink-0',
          color
        )}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue';
  summary?: {
    total_records?: number;
    critical_high_percentage?: number;
    top_categories?: Record<string, number>;
    top_airlines?: Record<string, number>;
  };
}

function SummaryCard({ title, icon, color, summary }: SummaryCardProps) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50/10',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    blue: {
      bg: 'bg-blue-50/10',
      border: 'border-blue-100',
      text: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-100',
    },
  };

  const c = colorClasses[color];

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm p-3 sm:p-4 lg:p-6',
      c.bg,
      c.border
    )}>
      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
        {icon}
        <span>Ringkasan {title}</span>
      </h3>
      
      <div className="space-y-3 sm:space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn('p-2 sm:p-3 bg-white/50 rounded border', c.border)}>
            <p className={cn('text-[10px] font-bold uppercase', c.text)}>Total Laporan</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {summary?.total_records || 0}
            </p>
          </div>
          <div className={cn('p-2 sm:p-3 bg-white/50 rounded border', c.border)}>
            <p className={cn('text-[10px] font-bold uppercase', c.text)}>Critical/High</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {summary?.critical_high_percentage || 0}%
            </p>
          </div>
        </div>

        {/* Top Categories */}
        <div>
          <p className={cn('text-[10px] font-bold uppercase mb-1.5 sm:mb-2', c.text)}>
            Top Kategori
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Object.entries(summary?.top_categories || {})
              .filter(([key]) => key !== '')
              .slice(0, 3)
              .map(([category, count], i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-1 rounded-full text-[10px] sm:text-xs border',
                    c.badge
                  )}
                >
                  {category}: {count as number}
                </span>
              ))}
          </div>
        </div>

        {/* Top Airlines */}
        <div>
          <p className={cn('text-[10px] font-bold uppercase mb-1.5 sm:mb-2', c.text)}>
            Top Maskapai
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Object.entries(summary?.top_airlines || {})
              .slice(0, 3)
              .map(([airline, count], i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-1 rounded-full text-[10px] sm:text-xs border',
                    c.badge
                  )}
                >
                  {airline}: {count as number}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewSection;
