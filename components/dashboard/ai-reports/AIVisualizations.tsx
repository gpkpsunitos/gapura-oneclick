'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Calendar,
  Plane,
  Building2,
  Gauge,
  Sparkles,
  MessageSquare,
  Tag,
  Clock,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Shield,
  AlertOctagon,
  ChevronRight,
  XCircle,
  Layers,
  MapPin,
  Hash,
  Frown,
  Meh,
  Smile,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
  }
};

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  z_score?: number;
  category?: string;
  hub?: string;
  bounds?: [number, number];
  expected_range?: [number, number];
}

interface AnomalyDetectionProps {
  anomalyDetection: {
    isAnomaly: boolean;
    anomalyScore: number;
    anomalies: Anomaly[];
  };
  predictedDays: number;
}

export function AnomalyDetectionVisualization({ anomalyDetection, predictedDays }: AnomalyDetectionProps) {
  if (!anomalyDetection) return null;

  const { isAnomaly, anomalyScore, anomalies } = anomalyDetection;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-700';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Tinggi';
      case 'medium': return 'Sedang';
      default: return 'Rendah';
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'global_outlier': 'Outlier Global',
      'iqr_outlier': 'Outlier IQR',
      'category_outlier': 'Outlier Kategori',
      'hub_outlier': 'Outlier Hub'
    };
    return labels[type] || type;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            isAnomaly ? "bg-amber-100" : "bg-emerald-100"
          )}>
            {isAnomaly ? (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Deteksi Anomali
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Sistem AI mendeteksi pola tidak normal dalam prediksi waktu penyelesaian
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn(
              "text-2xl font-bold",
              isAnomaly ? "text-amber-600" : "text-emerald-600"
            )}>
              {(anomalyScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Skor Anomali</div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Prediksi Waktu Penyelesaian:</span>
            <span className={cn(
              "font-bold",
              predictedDays > 3 ? "text-red-600" : "text-emerald-600"
            )}>
              {predictedDays.toFixed(1)} hari
            </span>
          </div>
        </div>

        {anomalies.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Anomali Terdeteksi ({anomalies.length})
            </p>
            <AnimatePresence>
              {anomalies.map((anomaly, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className={cn(
                    "p-4 rounded-lg border",
                    getSeverityColor(anomaly.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(anomaly.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {getAnomalyTypeLabel(anomaly.type)}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          anomaly.severity === 'high' ? "bg-red-200 text-red-800" :
                          anomaly.severity === 'medium' ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        )}>
                          {getSeverityLabel(anomaly.severity)}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{anomaly.message}</p>
                      {anomaly.z_score && (
                        <p className="text-xs mt-2 opacity-75">
                          Z-Score: {anomaly.z_score.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p className="font-medium">Tidak ada anomali terdeteksi</p>
            <p className="text-sm text-gray-400 mt-1">Prediksi berada dalam rentang normal</p>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <span className="font-bold">Penjelasan:</span> Deteksi anomali menggunakan metode statistik (Z-Score dan IQR) untuk mengidentifikasi prediksi yang menyimpang dari pola normal. Anomali dapat mengindikasikan kasus yang memerlukan perhatian khusus.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SentimentData {
  urgencyScore: number;
  sentiment: string;
  keywords: string[];
}

interface SentimentAnalysisChartProps {
  sentiment: SentimentData;
}

export function SentimentAnalysisChart({ sentiment }: SentimentAnalysisChartProps) {
  if (!sentiment) return null;

  const { urgencyScore, sentiment: sentimentLabel, keywords } = sentiment;

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment.includes('Negative')) return <Frown className="w-6 h-6 text-red-500" />;
    if (sentiment.includes('Positive')) return <Smile className="w-6 h-6 text-emerald-500" />;
    if (sentiment.includes('Somewhat')) return <Meh className="w-6 h-6 text-amber-500" />;
    return <Meh className="w-6 h-6 text-gray-500" />;
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment.includes('Negative')) return 'from-red-500 to-red-600';
    if (sentiment.includes('Positive')) return 'from-emerald-500 to-emerald-600';
    if (sentiment.includes('Somewhat')) return 'from-amber-500 to-amber-600';
    return 'from-gray-500 to-gray-600';
  };

  const getSentimentBg = (sentiment: string) => {
    if (sentiment.includes('Negative')) return 'bg-red-50 border-red-200';
    if (sentiment.includes('Positive')) return 'bg-emerald-50 border-emerald-200';
    if (sentiment.includes('Somewhat')) return 'bg-amber-50 border-amber-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getUrgencyLevel = (score: number) => {
    if (score >= 0.7) return { label: 'Sangat Urgent', color: 'text-red-600', bg: 'bg-red-100' };
    if (score >= 0.4) return { label: 'Cukup Urgent', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-100' };
  };

  const urgency = getUrgencyLevel(urgencyScore);

  const translateSentiment = (s: string): string => {
    const map: Record<string, string> = {
      'Negative': 'Negatif',
      'Somewhat Negative': 'Cukup Negatif',
      'Neutral': 'Netral',
      'Somewhat Positive': 'Cukup Positif',
      'Positive': 'Positif'
    };
    return map[s] || s;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Analisis Sentimen</h3>
            <p className="text-sm text-gray-500">Evaluasi nada dan urgensi laporan</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className={cn("p-4 rounded-xl border", getSentimentBg(sentimentLabel))}>
            <div className="flex items-center gap-2 mb-2">
              {getSentimentIcon(sentimentLabel)}
              <span className="text-sm font-medium text-gray-600">Sentimen</span>
            </div>
            <div className={cn(
              "text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
              getSentimentColor(sentimentLabel)
            )}>
              {translateSentiment(sentimentLabel)}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-600">Skor Urgensi</span>
            </div>
            <div className={cn("text-xl font-bold", urgency.color)}>
              {(urgencyScore * 100).toFixed(0)}%
            </div>
            <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1 inline-block", urgency.bg, urgency.color)}>
              {urgency.label}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-600">Tingkat Urgensi</span>
            <span className="text-sm font-bold text-gray-900">{(urgencyScore * 100).toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${urgencyScore * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                urgencyScore >= 0.7 ? "bg-gradient-to-r from-red-400 to-red-600" :
                urgencyScore >= 0.4 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                "bg-gradient-to-r from-emerald-400 to-emerald-600"
              )}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Normal</span>
            <span>Urgent</span>
          </div>
        </div>

        {keywords && keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-600">Kata Kunci Terdeteksi</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 border border-gray-200"
                >
                  {keyword}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-700">
              <span className="font-bold">Penjelasan:</span> Analisis sentimen menggunakan model NLP untuk mengukur nada emosional laporan. Skor urgensi menunjukkan tingkat prioritas berdasarkan bahasa yang digunakan.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface Entity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

interface EntityExtractionDisplayProps {
  entities: Entity[];
}

export function EntityExtractionDisplay({ entities }: EntityExtractionDisplayProps) {
  if (!entities || entities.length === 0) return null;

  const getEntityIcon = (label: string) => {
    switch (label) {
      case 'AIRLINE': return <Plane className="w-4 h-4" />;
      case 'FLIGHT_NUMBER': return <Hash className="w-4 h-4" />;
      case 'DATE': return <Calendar className="w-4 h-4" />;
      case 'LOCATION': return <MapPin className="w-4 h-4" />;
      case 'PERSON': return <Building2 className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const getEntityColor = (label: string) => {
    switch (label) {
      case 'AIRLINE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'FLIGHT_NUMBER': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'LOCATION': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEntityLabel = (label: string) => {
    const labels: Record<string, string> = {
      'AIRLINE': 'Maskapai',
      'FLIGHT_NUMBER': 'No. Penerbangan',
      'DATE': 'Tanggal',
      'LOCATION': 'Lokasi',
      'PERSON': 'Orang'
    };
    return labels[label] || label;
  };

  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.label]) acc[entity.label] = [];
    acc[entity.label].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Ekstraksi Entitas</h3>
            <p className="text-sm text-gray-500">Informasi penting yang dikenali dari laporan</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {Object.entries(groupedEntities).map(([label, items], groupIdx) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              {getEntityIcon(label)}
              <span>{getEntityLabel(label)}</span>
              <span className="text-gray-400">({items.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((entity, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "px-3 py-2 rounded-lg border flex items-center gap-2",
                    getEntityColor(label)
                  )}
                >
                  {getEntityIcon(label)}
                  <span className="font-medium">{entity.text}</span>
                  <span className="text-xs opacity-60">
                    {(entity.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <span className="font-bold">Penjelasan:</span> Model NLP secara otomatis mengenali entitas penting seperti nama maskapai, nomor penerbangan, dan tanggal. Persentase menunjukkan tingkat keyakinan model.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PredictionConfidenceChartProps {
  predictedDays: number;
  confidenceInterval: [number, number];
}

export function PredictionConfidenceChart({ predictedDays, confidenceInterval }: PredictionConfidenceChartProps) {
  const [min, max] = confidenceInterval;
  const range = max - min;
  const normalizedPredicted = ((predictedDays - min) / (range || 1)) * 100;

  const getPredictionLevel = (days: number) => {
    if (days <= 1) return { label: 'Sangat Cepat', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (days <= 3) return { label: 'Cepat', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (days <= 7) return { label: 'Normal', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { label: 'Lama', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const prediction = getPredictionLevel(predictedDays);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Gauge className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Prediksi Waktu Penyelesaian</h3>
            <p className="text-sm text-gray-500">Estimasi durasi penanganan kasus</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="text-center py-4">
          <div className={cn("text-5xl font-black", prediction.color)}>
            {predictedDays.toFixed(1)}
          </div>
          <div className="text-lg text-gray-600 mt-1">hari</div>
          <span className={cn(
            "inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold",
            prediction.bg,
            prediction.color
          )}>
            {prediction.label}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Interval Kepercayaan 95%</span>
            <span className="text-sm font-bold text-gray-900">
              {min.toFixed(1)} - {max.toFixed(1)} hari
            </span>
          </div>
          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-y-0 left-[10%] right-[10%] bg-emerald-200 rounded" />
            <motion.div
              initial={{ left: "50%" }}
              animate={{ left: `${Math.max(5, Math.min(95, normalizedPredicted))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 bottom-0 w-1 bg-emerald-600"
              style={{ transform: "translateX(-50%)" }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-gray-500">
              <span>{min.toFixed(1)}</span>
              <span>{max.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Minimum</div>
            <div className="text-lg font-bold text-gray-900">{min.toFixed(1)}</div>
            <div className="text-xs text-gray-400">hari</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-xs text-emerald-600 mb-1">Prediksi</div>
            <div className="text-lg font-bold text-emerald-700">{predictedDays.toFixed(1)}</div>
            <div className="text-xs text-emerald-500">hari</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Maksimum</div>
            <div className="text-lg font-bold text-gray-900">{max.toFixed(1)}</div>
            <div className="text-xs text-gray-400">hari</div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-700">
              <span className="font-bold">Penjelasan:</span> Model regresi memprediksi waktu penyelesaian berdasarkan pola historis. Interval kepercayaan menunjukkan rentang estimasi dengan akurasi 95%.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface HubRiskData {
  hub: string;
  count: number;
  avgPredictedDays: number;
  criticalCount: number;
  highCount: number;
}

interface HubRiskHeatmapProps {
  data: HubRiskData[];
}

export function HubRiskHeatmap({ data }: HubRiskHeatmapProps) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const maxDays = Math.max(...data.map(d => d.avgPredictedDays));

  const getRiskLevel = (critical: number, high: number, total: number) => {
    const riskRatio = (critical + high) / total;
    if (riskRatio >= 0.5) return 'high';
    if (riskRatio >= 0.25) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-amber-100 border-amber-300 text-amber-800';
      default: return 'bg-emerald-100 border-emerald-300 text-emerald-800';
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      default: return 'bg-emerald-500 text-white';
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Peta Risiko per Hub</h3>
            <p className="text-sm text-gray-500">Distribusi tingkat risiko berdasarkan lokasi</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.map((hub, idx) => {
            const riskLevel = getRiskLevel(hub.criticalCount, hub.highCount, hub.count);
            const intensity = hub.count / maxCount;
            
            return (
              <motion.div
                key={hub.hub}
                variants={itemVariants}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all hover:shadow-md",
                  getRiskColor(riskLevel)
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{hub.hub}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    getRiskBadge(riskLevel)
                  )}>
                    {riskLevel === 'high' ? 'Tinggi' : riskLevel === 'medium' ? 'Sedang' : 'Rendah'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Total Kasus</span>
                    <span className="font-bold">{hub.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current rounded-full"
                      style={{ width: `${intensity * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Rata-rata</span>
                    <span className="font-bold">{hub.avgPredictedDays.toFixed(1)} hari</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-red-200/50">
                      Critical: {hub.criticalCount}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50">
                      High: {hub.highCount}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <span className="font-bold">Penjelasan:</span> Peta risiko menampilkan tingkat konsentrasi kasus kritis per hub. Warna merah menunjukkan area dengan proporsi kasus Critical/High tinggi yang memerlukan perhatian lebih.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ExecutiveSummaryCardProps {
  summary: {
    executiveSummary: string;
    keyPoints: string[];
  };
}

export function ExecutiveSummaryCard({ summary }: ExecutiveSummaryCardProps) {
  if (!summary) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Ringkasan Eksekutif AI</h3>
            <p className="text-sm text-gray-500">Ringkasan otomatis dari isi laporan</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Ringkasan
          </p>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {summary.executiveSummary}
            </p>
          </div>
        </div>

        {summary.keyPoints && summary.keyPoints.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Poin Penting
            </p>
            <div className="space-y-2">
              {summary.keyPoints.map((point, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-emerald-800">{point}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-700">
              <span className="font-bold">Penjelasan:</span> Ringkasan dibuat oleh model NLP yang menganalisis isi laporan dan mengekstrak informasi penting. Poin-poin kunci menyoroti isu utama yang perlu diperhatikan.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ClassificationBadgeProps {
  classification: {
    severity: string;
    severityConfidence: number;
    areaType: string;
    issueType: string;
    issueTypeConfidence: number;
  };
}

export function ClassificationBadge({ classification }: ClassificationBadgeProps) {
  if (!classification) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Low': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const translateSeverity = (s: string) => {
    const map: Record<string, string> = {
      'Critical': 'Kritis',
      'High': 'Tinggi',
      'Medium': 'Sedang',
      'Low': 'Rendah'
    };
    return map[s] || s;
  };

  const translateArea = (a: string) => {
    const map: Record<string, string> = {
      'Terminal': 'Terminal',
      'Apron': 'Apron',
      'Cargo': 'Kargo',
      'Office': 'Kantor'
    };
    return map[a] || a;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100">
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Klasifikasi AI</h3>
            <p className="text-sm text-gray-500">Hasil klasifikasi otomatis laporan</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <AlertTriangle className="w-4 h-4" />
              Tingkat Keparahan
            </div>
            <div className={cn(
              "px-4 py-3 rounded-lg border-2 font-bold text-lg text-center",
              getSeverityColor(classification.severity)
            )}>
              {translateSeverity(classification.severity)}
            </div>
            <div className="text-center text-xs text-gray-500">
              Keyakinan: {(classification.severityConfidence * 100).toFixed(0)}%
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <MapPin className="w-4 h-4" />
              Area
            </div>
            <div className="px-4 py-3 rounded-lg border-2 border-blue-200 bg-blue-50 font-bold text-lg text-center text-blue-700">
              {translateArea(classification.areaType)}
            </div>
            <div className="text-center text-xs text-gray-500">
              Tipe: {classification.issueType}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <span className="font-bold">Penjelasan:</span> Model NLP mengklasifikasikan laporan berdasarkan tingkat keparahan dan area kejadian. Tingkat keyakinan menunjukkan seberapa yakin model dengan klasifikasi tersebut.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SeverityDistributionChartProps {
  distribution: Record<string, number>;
}

export function SeverityDistributionChart({ distribution }: SeverityDistributionChartProps) {
  if (!distribution) return null;

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const colors: Record<string, string> = {
    'Critical': 'bg-red-500',
    'High': 'bg-orange-500',
    'Medium': 'bg-amber-500',
    'Low': 'bg-emerald-500'
  };

  const translateSeverity = (s: string) => {
    const map: Record<string, string> = {
      'Critical': 'Kritis',
      'High': 'Tinggi',
      'Medium': 'Sedang',
      'Low': 'Rendah'
    };
    return map[s] || s;
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-gray-500" />
        Distribusi Tingkat Keparahan
      </h3>

      <div className="space-y-4">
        {Object.entries(distribution).map(([severity, count], idx) => {
          const percentage = (count / total) * 100;
          return (
            <motion.div
              key={severity}
              variants={itemVariants}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", colors[severity] || 'bg-gray-400')} />
                  <span className="text-sm font-medium text-gray-700">
                    {translateSeverity(severity)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                  <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className={cn("h-full rounded-full", colors[severity] || 'bg-gray-400')}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Laporan</span>
          <span className="font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </motion.div>
  );
}

import { FileText } from 'lucide-react';

interface BatchAnalysisSummaryProps {
  metadata: {
    totalRecords: number;
    processingTimeSeconds: number;
    recordsPerSecond?: number;
    modelVersions?: {
      regression: string;
      nlp: string;
    };
  };
  summary: {
    predictionStats: {
      min: number;
      max: number;
      mean: number;
    };
    severityDistribution: Record<string, number>;
  };
  sheets?: Record<string, { rows_fetched: number; status: string }>;
}

export function BatchAnalysisSummary({ metadata, summary, sheets }: BatchAnalysisSummaryProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Laporan</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metadata.totalRecords}</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Waktu Proses</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metadata.processingTimeSeconds.toFixed(1)}s</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Rata-rata Prediksi</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.predictionStats.mean.toFixed(1)} hari</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Model Versi</span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {metadata.modelVersions?.regression || 'N/A'}
          </div>
        </motion.div>
      </div>

      {sheets && (
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Sumber Data
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(sheets).map(([sheet, info]) => (
              <div key={sheet} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{sheet}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{info.rows_fetched} baris</div>
                  <div className={cn(
                    "text-xs",
                    info.status === 'success' ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {info.status === 'success' ? 'Berhasil' : info.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <SeverityDistributionChart distribution={summary.severityDistribution} />
    </motion.div>
  );
}
