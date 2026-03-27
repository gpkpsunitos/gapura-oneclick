'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  RefreshCw,
  Play,
  Download,
  Database,
  Cpu,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Gauge,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Box,
  Layout,
  Shield,
  Filter,
  Calendar,
  Plane,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
} from './AIVisualizations';

interface AIReportResult {
  rowId: string;
  sourceSheet: string;
  originalData: {
    date?: number;
    airline?: string;
    flightNumber?: string;
    branch?: string;
    hub?: string;
    route?: string;
    category?: string;
    issueType?: string;
    report?: string;
    status?: string;
  };
  prediction: {
    predictedDays: number;
    confidenceInterval: [number, number];
    hasUnknownCategories: boolean;
    shapExplanation: any;
    anomalyDetection: {
      isAnomaly: boolean;
      anomalyScore: number;
      anomalies: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        z_score?: number;
        category?: string;
        hub?: string;
        bounds?: [number, number];
        expected_range?: [number, number];
      }>;
    };
  };
  classification: {
    reportId: string;
    severity: string;
    severityConfidence: number;
    areaType: string;
    issueType: string;
    issueTypeConfidence: number;
  };
  entities?: {
    reportId: string;
    entities: Array<{
      text: string;
      label: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  };
  summary?: {
    reportId: string;
    executiveSummary: string;
    keyPoints: string[];
  };
  sentiment?: {
    reportId: string;
    urgencyScore: number;
    sentiment: string;
    keywords: string[];
  };
}

interface BatchAnalysisData {
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
  results: AIReportResult[];
}

interface AIBatchAnalysisViewProps {
  data: BatchAnalysisData | null;
  loading: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function AIBatchAnalysisView({ data, loading, onRefresh, onExport }: AIBatchAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'anomalies' | 'sentiment' | 'predictions' | 'hub'>('summary');
  const [selectedResult, setSelectedResult] = useState<AIReportResult | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 size={48} className="animate-spin mb-4 opacity-30" />
        <p className="text-lg font-medium">Menganalisis data...</p>
        <p className="text-sm text-gray-400 mt-1">Proses ini mungkin memerlukan waktu beberapa saat</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24 text-gray-500">
        <Database size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Belum ada data analisis</p>
        <p className="text-sm text-gray-400 mt-1">Klik "Mulai Analisis" untuk menganalisis laporan</p>
      </div>
    );
  }

  const anomalyResults = data.results.filter(r => r.prediction?.anomalyDetection?.isAnomaly);
  const criticalResults = data.results.filter(r => 
    r.classification?.severity === 'Critical' || r.classification?.severity === 'High'
  );

  const hubData = data.results.reduce((acc, r) => {
    const hub = r.originalData?.hub || 'Unknown';
    if (!acc[hub]) {
      acc[hub] = {
        hub,
        count: 0,
        totalDays: 0,
        criticalCount: 0,
        highCount: 0
      };
    }
    acc[hub].count++;
    acc[hub].totalDays += r.prediction?.predictedDays || 0;
    if (r.classification?.severity === 'Critical') acc[hub].criticalCount++;
    if (r.classification?.severity === 'High') acc[hub].highCount++;
    return acc;
  }, {} as Record<string, any>);

  const hubRiskData = Object.values(hubData).map((h: any) => ({
    hub: h.hub,
    count: h.count,
    avgPredictedDays: h.totalDays / h.count,
    criticalCount: h.criticalCount,
    highCount: h.highCount
  }));

  const tabs = [
    { id: 'summary', label: 'Ringkasan', icon: BarChart3 },
    { id: 'anomalies', label: 'Anomali', icon: AlertTriangle, count: anomalyResults.length },
    { id: 'sentiment', label: 'Sentimen', icon: Activity },
    { id: 'predictions', label: 'Prediksi', icon: Gauge },
    { id: 'hub', label: 'Per Hub', icon: Building2 }
  ];

  return (
    <div className="space-y-6">
      <BatchAnalysisSummary
        metadata={data.metadata}
        summary={data.summary}
        sheets={data.sheets}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    tab.count > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SeverityDistributionChart distribution={data.summary.severityDistribution} />
                  
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Laporan Prioritas Tinggi
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Laporan dengan tingkat keparahan Critical atau High yang memerlukan perhatian segera
                    </p>
                    
                    {criticalResults.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {criticalResults.slice(0, 10).map((result, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => setSelectedResult(result)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {result.originalData?.airline}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {result.originalData?.issueType}
                                </p>
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-bold ml-2 shrink-0",
                                result.classification?.severity === 'Critical' 
                                  ? "bg-red-200 text-red-800" 
                                  : "bg-orange-200 text-orange-800"
                              )}>
                                {result.classification?.severity}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {result.prediction?.predictedDays?.toFixed(1)} hari
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {result.originalData?.hub}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                        <p className="font-medium">Tidak ada laporan prioritas tinggi</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'anomalies' && (
              <motion.div
                key="anomalies"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800">Deteksi Anomali</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Ditemukan {anomalyResults.length} laporan dengan pola tidak normal dari total {data.results.length} laporan.
                        Anomali dapat mengindikasikan kasus yang memerlukan investigasi lebih lanjut.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {anomalyResults.slice(0, 10).map((result, idx) => (
                    <AnomalyDetectionVisualization
                      key={idx}
                      anomalyDetection={result.prediction.anomalyDetection}
                      predictedDays={result.prediction.predictedDays}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'sentiment' && (
              <motion.div
                key="sentiment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-purple-800">Analisis Sentimen Batch</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Analisis sentimen dilakukan pada seluruh laporan untuk mengidentifikasi nada dan urgensi.
                        Klik pada laporan untuk melihat detail analisis sentimen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data.results.filter(r => r.sentiment).slice(0, 6).map((result, idx) => (
                    <SentimentAnalysisChart
                      key={idx}
                      sentiment={result.sentiment}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'predictions' && (
              <motion.div
                key="predictions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <Gauge className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800">Prediksi Waktu Penyelesaian</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Model regresi memprediksi waktu penyelesaian berdasarkan pola historis.
                        Rata-rata: {data.summary.predictionStats.mean.toFixed(1)} hari | 
                        Rentang: {data.summary.predictionStats.min.toFixed(1)} - {data.summary.predictionStats.max.toFixed(1)} hari
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {data.results.slice(0, 9).map((result, idx) => (
                    <PredictionConfidenceChart
                      key={idx}
                      predictedDays={result.prediction.predictedDays}
                      confidenceInterval={result.prediction.confidenceInterval}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'hub' && (
              <motion.div
                key="hub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <HubRiskHeatmap data={hubRiskData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Detail Laporan: {selectedResult.rowId}</h3>
            <button
              onClick={() => setSelectedResult(null)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ExecutiveSummaryCard summary={selectedResult.summary} />
              <ClassificationBadge classification={selectedResult.classification} />
            </div>
            <div className="space-y-6">
              <AnomalyDetectionVisualization
                anomalyDetection={selectedResult.prediction.anomalyDetection}
                predictedDays={selectedResult.prediction.predictedDays}
              />
              <SentimentAnalysisChart sentiment={selectedResult.sentiment} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface AIResultDetailModalProps {
  result: AIReportResult;
  onClose: () => void;
}

export function AIResultDetailModal({ result, onClose }: AIResultDetailModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Detail Analisis AI - {result.rowId}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Data Asli</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Maskapai:</span> <span className="font-medium">{result.originalData?.airline}</span></div>
              <div><span className="text-gray-500">Penerbangan:</span> <span className="font-medium">{result.originalData?.flightNumber}</span></div>
              <div><span className="text-gray-500">Rute:</span> <span className="font-medium">{result.originalData?.route}</span></div>
              <div><span className="text-gray-500">Hub:</span> <span className="font-medium">{result.originalData?.hub}</span></div>
              <div><span className="text-gray-500">Kategori:</span> <span className="font-medium">{result.originalData?.category}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{result.originalData?.status}</span></div>
            </div>
            {result.originalData?.report && (
              <div className="mt-4">
                <span className="text-gray-500 text-sm">Laporan:</span>
                <p className="text-sm text-gray-700 mt-1">{result.originalData.report}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictionConfidenceChart
              predictedDays={result.prediction.predictedDays}
              confidenceInterval={result.prediction.confidenceInterval}
            />
            <ClassificationBadge classification={result.classification} />
          </div>

          <ExecutiveSummaryCard summary={result.summary} />
          
          <AnomalyDetectionVisualization
            anomalyDetection={result.prediction.anomalyDetection}
            predictedDays={result.prediction.predictedDays}
          />

          <SentimentAnalysisChart sentiment={result.sentiment} />

          <EntityExtractionDisplay entities={result.entities?.entities} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AIBatchAnalysisView;
