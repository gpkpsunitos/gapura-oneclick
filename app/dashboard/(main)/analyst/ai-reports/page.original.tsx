'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Lightbulb,
  FileText,
  ArrowRight,
  Shield,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface AIReport {
  id: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  created_at: string;
  airlines?: string;
  hub?: string;
  description?: string;
  main_category?: string;
}

interface AIAnalysisResult {
  regression?: {
    predictions: Array<{
      reportId: string;
      predictedDays: number;
      confidenceInterval: [number, number];
      featureImportance: Record<string, number>;
    }>;
    modelMetrics?: {
      mae?: number;
      rmse?: number;
      r2?: number;
      model_loaded?: boolean;
    };
  };
  nlp?: {
    classifications: Array<{
      reportId: string;
      severity: string;
      severityConfidence: number;
      areaType: string;
      issueType: string;
    }>;
    summaries: Array<{
      reportId: string;
      executiveSummary: string;
      keyPoints: string[];
    }>;
    sentiment: Array<{
      reportId: string;
      urgencyScore: number;
      sentiment: string;
    }>;
  };
  trends?: {
    byCategory: Record<string, { count: number; trend: string }>;
    byHub: Record<string, { count: number; avgResolutionDays: number }>;
  };
  metadata: {
    totalRecords: number;
    processingTime: number;
  };
}

// --- Utility Functions ---
const translateSeverity = (severity: string): string => {
  const map: Record<string, string> = {
    'High': 'Tinggi',
    'Medium': 'Sedang', 
    'Low': 'Rendah',
    'Critical': 'Kritis',
    'Urgent': 'Mendesak'
  };
  return map[severity] || severity;
};

const translateCategory = (category: string): string => {
  const map: Record<string, string> = {
    'Cargo Problems': 'Masalah Kargo',
    'Pax Handling': 'Penanganan Penumpang',
    'GSE': 'Peralatan Pendukung',
    'Operation': 'Operasional',
    'Baggage Handling': 'Penanganan Bagasi',
    'Procedure Competencies': 'Kompetensi Prosedur',
    'Flight Document Handling': 'Penanganan Dokumen',
    'Irregularity': 'Ketidakberaturan',
    'Complaint': 'Keluhan',
    'Compliment': 'Pujian'
  };
  return map[category] || category;
};

const getSeverityColor = (severity: string): string => {
  const map: Record<string, string> = {
    'High': 'text-red-600 bg-red-50 border-red-200',
    'Critical': 'text-red-700 bg-red-100 border-red-300',
    'Urgent': 'text-red-700 bg-red-100 border-red-300',
    'Medium': 'text-amber-600 bg-amber-50 border-amber-200',
    'Low': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };
  return map[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
};

const getTrendIcon = (trend: string) => {
  if (trend === 'up' || trend === 'increasing') return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === 'down' || trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-gray-500" />;
};

// --- Components ---
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color,
  trend
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ElementType; 
  color: 'blue' | 'green' | 'purple' | 'red' | 'amber';
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  return (
    <div className={cn("card-solid p-5 border", colorMap[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === 'up' ? (
            <><TrendingUp size={14} /> <span>Meningkat</span></>
          ) : trend === 'down' ? (
            <><TrendingDown size={14} /> <span>Menurun</span></>
          ) : (
            <><Minus size={14} /> <span>Stabil</span></>
          )}
        </div>
      )}
    </div>
  );
};

export default function AIReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AIReport[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week'>('month');

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, []);

  // Run AI Analysis
  const runAIAnalysis = useCallback(async () => {
    if (reports.length === 0) return;
    
    setAnalyzing(true);
    try {
      // Filter reports by date range
      const now = new Date();
      let filteredReports = reports;
      
      if (dateRange !== 'all') {
        const days = dateRange === 'week' ? 7 : 30;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filteredReports = reports.filter(r => new Date(r.created_at) >= cutoff);
      }

      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const res = await fetch(`/api/ai/analyze?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: filteredReports.slice(0, 100), // Analyze up to 100 reports
          options: {
            predictResolutionTime: true,
            classifySeverity: true,
            extractEntities: true,
            generateSummary: true,
            analyzeTrends: true,
          }
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAnalysis(result);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  }, [reports, dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (reports.length > 0 && !analysis) {
      runAIAnalysis();
    }
  }, [reports, analysis, runAIAnalysis]);

  // Calculate summary stats
  const stats = {
    totalAnalyzed: analysis?.metadata?.totalRecords || 0,
    avgResolutionTime: analysis?.regression?.predictions?.length
      ? (analysis.regression.predictions.reduce((acc, p) => acc + p.predictedDays, 0) / analysis.regression.predictions.length).toFixed(1)
      : '0',
    highSeverityCount: analysis?.nlp?.classifications?.filter(c => c.severity === 'High' || c.severity === 'Critical').length || 0,
    modelConfidence: analysis?.regression?.modelMetrics?.mae
      ? `${(100 - (analysis.regression.modelMetrics.mae / 5 * 100)).toFixed(0)}%`
      : 'N/A',
  };

  // Get top categories
  const categoryStats = analysis?.trends?.byCategory 
    ? Object.entries(analysis.trends.byCategory)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
    : [];

  // Get predictions with high resolution time
  const highResolutionPredictions = analysis?.regression?.predictions
    ?.map((p, idx) => ({ ...p, report: reports[idx] }))
    ?.filter(p => p.predictedDays > 2.5)
    ?.sort((a, b) => b.predictedDays - a.predictedDays)
    ?.slice(0, 5) || [];

  if (loading && !analysis) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 animate-spin border-emerald-200 border-t-emerald-600" />
        <p className="text-sm text-gray-500 mt-4">Memuat Analisis AI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
              <Brain size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Laporan AI
              </h1>
              <p className="text-sm text-gray-500">
                Analisis Cerdas dengan Kecerdasan Buatan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['all', 'month', 'week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  runAIAnalysis();
                }}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                  dateRange === range
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {range === 'all' ? 'Semua' : range === 'month' ? '30 Hari' : '7 Hari'}
              </button>
            ))}
          </div>
          
          <button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Analisis Ulang
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Dianalisis" 
          value={stats.totalAnalyzed} 
          subtitle="Laporan diproses AI"
          icon={FileText} 
          color="blue" 
        />
        <StatCard 
          title="Rata-rata Penyelesaian" 
          value={`${stats.avgResolutionTime} hari`}
          subtitle="Estimasi waktu AI"
          icon={Clock} 
          color="green" 
        />
        <StatCard 
          title="Prioritas Tinggi" 
          value={stats.highSeverityCount}
          subtitle="Memerlukan perhatian"
          icon={AlertTriangle} 
          color="red" 
        />
        <StatCard 
          title="Tingkat Akurasi" 
          value={stats.modelConfidence}
          subtitle="Tingkat kepercayaan model"
          icon={Target} 
          color="purple" 
        />
      </div>

      {/* AI Insights */}
      <div className="card-solid p-6 border-l-4 border-l-emerald-500">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Lightbulb className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Insight AI</h3>
            <p className="text-gray-600 leading-relaxed">
              Berdasarkan analisis {stats.totalAnalyzed} laporan, AI memprediksi rata-rata waktu penyelesaian 
              adalah <span className="font-bold text-emerald-600">{stats.avgResolutionTime} hari</span>. 
              Terdapat <span className="font-bold text-red-600">{stats.highSeverityCount} laporan</span> dengan 
              tingkat prioritas tinggi yang memerlukan perhatian segera. 
              Masalah Kargo mendominasi volume laporan dengan waktu penyelesaian lebih lama.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="card-solid p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold">Distribusi Kategori</h3>
          </div>
          
          <div className="space-y-3">
            {categoryStats.map(([category, data], idx) => (
              <div key={category} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {translateCategory(category)}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{data.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(data.count / (analysis?.metadata?.totalRecords || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 w-16 text-right">
                  {((data.count / (analysis?.metadata?.totalRecords || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Resolution Predictions */}
        <div className="card-solid p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold">Prediksi Lama Penyelesaian</h3>
          </div>
          
          <div className="space-y-3">
            {highResolutionPredictions.length > 0 ? (
              highResolutionPredictions.map((pred, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-600">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {pred.report?.airlines || 'Unknown'} - {pred.report?.title?.substring(0, 30)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {translateCategory(pred.report?.main_category || 'Unknown')}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-amber-600">
                        {pred.predictedDays.toFixed(1)} hari
                      </span>
                      <span className="text-xs text-gray-400">
                        [{pred.confidenceInterval[0].toFixed(1)} - {pred.confidenceInterval[1].toFixed(1)}]
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                <p>Tidak ada laporan dengan waktu penyelesaian yang lama</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Performance */}
      {analysis?.regression?.modelMetrics && (
        <div className="card-solid p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">Performa Model AI</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">
                {analysis.regression.modelMetrics.mae?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rata-rata Selisih (hari)</p>
              <p className="text-xs text-gray-400 mt-0.5">Semakin kecil semakin baik</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-emerald-600">
                {analysis.regression.modelMetrics.r2 ? (analysis.regression.modelMetrics.r2 * 100).toFixed(0) + '%' : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Tingkat Akurasi Model</p>
              <p className="text-xs text-gray-400 mt-0.5">Persentase kecocokan data</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">
                {analysis.regression.modelMetrics.rmse?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Akar Kuadrat Selisih</p>
              <p className="text-xs text-gray-400 mt-0.5">Metrik statistik model</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">Penjelasan Metrik</p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• <strong>Rata-rata Selisih (MAE):</strong> Selisih rata-rata antara prediksi AI dan nilai aktual. Nilai {analysis.regression.modelMetrics.mae?.toFixed(2)} berarti AI meleset rata-rata {analysis.regression.modelMetrics.mae?.toFixed(2)} hari.</li>
                  <li>• <strong>Tingkat Akurasi (R²):</strong> Persentase variasi data yang dapat dijelaskan oleh model. Nilai {analysis.regression.modelMetrics.r2 ? (analysis.regression.modelMetrics.r2 * 100).toFixed(0) : 'N/A'}% menunjukkan model cukup akurat.</li>
                  <li>• <strong>Akar Kuadrat (RMSE):</strong> Ukuran sebaran kesalahan prediksi. Nilai lebih kecil menunjukkan prediksi lebih konsisten.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Severity Distribution */}
      {analysis?.nlp?.classifications && (
        <div className="card-solid p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold">Distribusi Tingkat Keparahan</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {['High', 'Medium', 'Low'].map((severity) => {
              const count = analysis.nlp?.classifications?.filter(c => c.severity === severity).length || 0;
              const percentage = analysis.nlp?.classifications?.length 
                ? ((count / analysis.nlp.classifications.length) * 100).toFixed(1) 
                : '0';
              
              return (
                <div key={severity} className={cn("p-4 rounded-xl border text-center", getSeverityColor(severity))}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-bold uppercase mt-1">{translateSeverity(severity)}</p>
                  <p className="text-xs opacity-70 mt-0.5">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="card-solid p-6 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold">Rekomendasi Tindakan</h3>
        </div>
        
        <div className="space-y-3">
          {stats.highSeverityCount > 0 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-900">Prioritaskan Laporan Kritis</p>
                <p className="text-xs text-red-700 mt-1">
                  Terdapat {stats.highSeverityCount} laporan dengan tingkat prioritas tinggi. 
                  Sebaiknya ditangani dalam 24 jam untuk mencegah eskalasi.
                </p>
              </div>
            </div>
          )}
          
          {parseFloat(stats.avgResolutionTime) > 2 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">Optimasi Waktu Penyelesaian</p>
                <p className="text-xs text-amber-700 mt-1">
                  Rata-rata waktu penyelesaian ({stats.avgResolutionTime} hari) di atas target ideal (2 hari). 
                  Pertimbangkan untuk menambah sumber daya di HUB 1 yang menangani 77% laporan.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <Brain className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900">Pelatihan Model</p>
              <p className="text-xs text-blue-700 mt-1">
                Model AI saat ini memiliki akurasi {stats.modelConfidence}. 
                Untuk meningkatkan akurasi, disarankan melakukan pelatihan ulang setiap bulan 
                dengan data laporan terbaru.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
