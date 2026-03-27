'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Activity, TrendingUp, AlertTriangle, Clock, RefreshCw,
  Play, Download, Database, Cpu, BarChart3, PieChart,
  AlertCircle, CheckCircle2, XCircle, Zap, Target, FileText,
  Loader2, Search, Sparkles, Gauge, Lightbulb,
  ChevronDown, ChevronUp, ArrowRight, Box, Layout, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { AIBatchAnalysisView, AIResultDetailModal } from '@/components/dashboard/ai-reports/AIBatchAnalysisView';
import {
  AnomalyDetectionVisualization,
  SentimentAnalysisChart,
  EntityExtractionDisplay,
  PredictionConfidenceChart,
  HubRiskHeatmap,
  ExecutiveSummaryCard,
  ClassificationBadge,
  SeverityDistributionChart,
  BatchAnalysisSummary
} from '@/components/dashboard/ai-reports/AIVisualizations';

interface BatchAnalysisResult {
  status: string;
  metadata: {
    totalRecords: number;
    processingTimeSeconds: number;
    recordsPerSecond?: number;
    modelVersions?: {
      regression: string;
      nlp: string;
    };
  };
  sheets?: Record<string, { rows_fetched: number; status: string }>;
  summary: {
    totalRecords?: number;
    sheetsProcessed?: number;
    regressionEnabled?: boolean;
    nlpEnabled?: boolean;
    severityDistribution: Record<string, number>;
    predictionStats: {
      min: number;
      max: number;
      mean: number;
    };
  };
  results: Array<{
    rowId: string;
    sourceSheet: string;
    originalData: any;
    prediction: any;
    classification: any;
    sentiment?: any;
    summary?: any;
    entities?: any;
  }>;
}

interface AIReportsPageProps {
  userRole?: string;
  branchFilter?: string | null;
}

export function AIReportsPage({ userRole, branchFilter }: AIReportsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [batchResults, setBatchResults] = useState<BatchAnalysisResult | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const analyzeAllReports = async () => {
    setLoading(prev => ({ ...prev, batch: true }));
    setProgress(0);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const res = await fetch('/api/ai/analyze-all?max_rows_per_sheet=10000&bypass_cache=true');
      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        const data = await res.json();
        setBatchResults(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Error ${res.status}: AI service tidak tersedia`);
      }
    } catch (err) {
      setError('Gagal menganalisis laporan. Pastikan AI service tersedia.');
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const exportResults = () => {
    if (!batchResults) return;

    const data = {
      summary: batchResults.summary,
      results: batchResults.results,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Laporan AI</h1>
                <p className="text-sm text-gray-500">Analisis Cerdas dengan Kecerdasan Buatan</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={analyzeAllReports}
                disabled={loading.batch}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading.batch ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Mulai Analisis</span>
                  </>
                )}
              </button>
              {batchResults && (
                <button
                  onClick={exportResults}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                <XCircle size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading.batch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-bold text-blue-900">Sedang Menganalisis...</p>
                <p className="text-sm text-blue-700">Proses ini mungkin memerlukan waktu beberapa saat</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {batchResults ? (
          <AIBatchAnalysisView
            data={batchResults as any}
            loading={loading.batch}
            onRefresh={analyzeAllReports}
            onExport={exportResults}
          />
        ) : (
          <div className="text-center py-24">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block"
            >
              <div className="p-6 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl mb-6">
                <Brain className="w-16 h-16 text-emerald-600" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analisis AI Laporan</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Sistem AI akan menganalisis seluruh laporan untuk memberikan prediksi waktu penyelesaian,
              klasifikasi keparahan, analisis sentimen, dan deteksi anomali.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              {[
                { icon: Gauge, title: 'Prediksi Waktu', desc: 'Estimasi durasi penyelesaian' },
                { icon: AlertTriangle, title: 'Deteksi Anomali', desc: 'Identifikasi pola tidak normal' },
                { icon: Activity, title: 'Analisis Sentimen', desc: 'Evaluasi nada dan urgensi' },
                { icon: Target, title: 'Klasifikasi Otomatis', desc: 'Kategorisasi tingkat keparahan' }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <feature.icon className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="font-bold text-gray-900 text-sm">{feature.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            <button
              onClick={analyzeAllReports}
              disabled={loading.batch}
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-3 mx-auto"
            >
              {loading.batch ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <Play size={20} />
                  <span>Mulai Analisis AI</span>
                </>
              )}
            </button>
          </div>
        )}

        {selectedResult && (
          <AIResultDetailModal
            result={selectedResult}
            onClose={() => setSelectedResult(null)}
          />
        )}
      </div>
    </div>
  );
}

export default AIReportsPage;
