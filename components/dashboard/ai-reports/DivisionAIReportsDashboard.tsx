'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, AlertTriangle, RefreshCw, CheckCircle2, Target, Lightbulb,
  Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Calendar, MapPin, Plane,
  Activity, Clock, Gauge, Zap, Shield, BarChart3, Building2,
  Download, Sparkles, Search, MessageSquare, Tag, Hash, Frown, Meh, Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type AnalysisItem = {
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
    Airlines?: string;
    Flight_Number?: string;
    Route?: string;
    Report?: string;
    Date_of_Event?: string;
    Root_Caused?: string;
    Action_Taken?: string;
    HUB?: string;
    Irregularity_Complain_Category?: string;
    Branch?: string;
    Status?: string;
    STATUS?: string;
  };
  prediction?: {
    predictedDays?: number;
    confidenceInterval?: [number, number];
    anomalyDetection?: {
      isAnomaly: boolean;
      anomalyScore: number;
      anomalies: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        z_score?: number;
        category?: string;
        hub?: string;
      }>;
    };
  };
  classification?: {
    severity?: string;
    severityConfidence?: number;
    category?: string;
    areaType?: string;
    issueType?: string;
  };
  sentiment?: {
    urgencyScore?: number;
    sentiment?: string;
    keywords?: string[];
  };
  summary?: {
    executiveSummary?: string;
    keyPoints?: string[];
  };
  entities?: {
    entities?: Array<{
      text: string;
      label: string;
      confidence: number;
    }>;
  };
};

type AnalyzeAllResponse = {
  status: string;
  metadata: {
    totalRecords: number;
    processingTimeSeconds: number;
    recordsPerSecond?: number;
    modelVersions?: { regression: string; nlp: string };
  };
  sheets?: Record<string, { rows_fetched: number; status: string }>;
  summary?: {
    severityDistribution?: Record<string, number>;
    predictionStats?: { min: number; max: number; mean: number };
    totalRecords?: number;
  };
  results: AnalysisItem[];
};

type RootCauseStats = {
  total_records?: number;
  classified?: number;
  classification_rate?: number;
  by_category?: Record<string, { count: number; percentage: number; description?: string }>;
};

const severityWeight: Record<string, number> = { Critical: 100, High: 75, Medium: 50, Low: 25 };
const sevStyle: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};
const sevBarColor: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-green-500',
};

const sentimentStyle: Record<string, { bg: string; text: string; icon: typeof Smile }> = {
  'Negative': { bg: 'bg-red-100', text: 'text-red-700', icon: Frown },
  'Somewhat Negative': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Frown },
  'Neutral': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Meh },
  'Somewhat Positive': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Smile },
  'Positive': { bg: 'bg-green-100', text: 'text-green-700', icon: Smile },
};

// Convert Excel serial date number to readable date string
function formatExcelDate(value: unknown): string {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '-';
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return s;
  }

  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return String(value);
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  const lower = s.toLowerCase();
  if (lower === 'unknown' || lower === 'n/a' || lower === 'na' || lower === '-') return fallback;
  return s;
}

function effectiveIssueType(item: AnalysisItem): string {
  const cls = item.classification?.issueType;
  if (cls && String(cls).trim().toLowerCase() !== 'unknown') return String(cls).trim();
  const fallback = item.originalData?.issueType || item.originalData?.Irregularity_Complain_Category;
  return normalizeLabel(fallback, 'Umum');
}

interface DivisionConfig {
  id: string;
  name: string;
  color: string;
  focusAreas: string[];
  recommendationCategories: Record<string, string[]>;
}

const divisionConfigs: Record<string, DivisionConfig> = {
  OS: {
    id: 'OS',
    name: 'Operation Support',
    color: 'emerald',
    focusAreas: ['Pax Handling', 'Baggage Handling', 'Document'],
    recommendationCategories: {
      baggage: ['Audit proses baggage handling', 'Tambahkan pengecekan double-tag dan rute bagasi'],
      document: ['Perkuat verifikasi dokumen', 'Sosialisasi ulang SOP ke frontliner'],
      pax: ['Tingkatkan service recovery', 'Evaluasi antrian dan waktu tunggu'],
    },
  },
  OT: {
    id: 'OT',
    name: 'Operation Terminal',
    color: 'blue',
    focusAreas: ['GSE', 'Operation', 'Safety'],
    recommendationCategories: {
      gse: ['Periksa readiness & maintenance GSE', 'Siapkan unit cadangan saat peak time'],
      operation: ['Optimalkan workflow operasional', 'Review beban kerja dan alokasi SDM'],
      safety: ['Audit keselamatan peralatan', 'Tindak lanjut temuan safety secara prioritas'],
    },
  },
  OP: {
    id: 'OP',
    name: 'Operation',
    color: 'purple',
    focusAreas: ['Operation', 'GSE', 'Ramp'],
    recommendationCategories: {
      operation: ['Optimalkan koordinasi operasional', 'Review prosedur standar'],
      gse: ['Audit kondisi GSE', 'Siapkan backup equipment'],
      ramp: ['Koordinasi loading/unloading', 'Perketat waktu turnaround'],
    },
  },
  UQ: {
    id: 'UQ',
    name: 'Quality',
    color: 'cyan',
    focusAreas: ['Quality', 'Audit', 'Compliance'],
    recommendationCategories: {
      quality: ['Review standar kualitas', 'Audit prosedur yang ada'],
      compliance: ['Periksa kepatuhan SOP', 'Update dokumentasi'],
    },
  },
  HC: {
    id: 'HC',
    name: 'Hub Control',
    color: 'rose',
    focusAreas: ['Hub Management', 'Coordination', 'Resource'],
    recommendationCategories: {
      hub: ['Evaluasi resource allocation', 'Koordinasi antar terminal'],
      coordination: ['Perkuat komunikasi antar unit', 'Setup escalation path'],
    },
  },
  HT: {
    id: 'HT',
    name: 'Hub Terminal',
    color: 'indigo',
    focusAreas: ['Terminal Operation', 'Pax Flow', 'Facility'],
    recommendationCategories: {
      terminal: ['Optimalkan alur penumpang', 'Monitoring kapasitas terminal'],
      facility: ['Inspeksi fasilitas', 'Maintenance preventif'],
    },
  },
  EMPLOYEE: {
    id: 'EMPLOYEE',
    name: 'Employee',
    color: 'slate',
    focusAreas: ['HR', 'Training', 'Performance'],
    recommendationCategories: {
      hr: ['Review kebijakan SDM', 'Training dan development'],
      performance: ['Evaluasi kinerja tim', 'Feedback session'],
    },
  },
};

const getRecommendations = (category?: string, severity?: string, division?: string): string[] => {
  const sev = (severity || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const common = ['Koordinasi lintas unit untuk service recovery', 'Buat ticket dan pantau progres penyelesaian'];
  
  const config = division ? divisionConfigs[division] : null;
  const divisionRecs = config?.recommendationCategories || {};
  
  const matched = Object.entries(divisionRecs).find(([k]) => cat.includes(k))?.[1] || ['Lakukan RCA cepat dan tindakan korektif'];
  const sevExtra = (sev.includes('critical') || sev.includes('high')) 
    ? ['Eskalasi ke supervisor/manager', 'Prioritaskan service recovery'] 
    : ['Monitoring dampak dan dokumentasi pembelajaran'];
  
  // Deduplicate recommendations to avoid repeated lines
  return Array.from(new Set([...matched, ...sevExtra, ...common]));
};

type DivisionTheme = {
  textStrong: string;
  barBg: string;
  gradientFrom: string;
  gradientTo: string;
  dotActive: string;
  dotPast: string;
  spinner: string;
};

function themeForColor(color: string): DivisionTheme {
  switch (color) {
    case 'blue':
      return {
        textStrong: 'text-blue-600',
        barBg: 'bg-blue-500',
        gradientFrom: 'from-blue-400',
        gradientTo: 'to-blue-600',
        dotActive: 'bg-blue-500',
        dotPast: 'bg-blue-300',
        spinner: 'text-blue-500',
      };
    case 'purple':
      return {
        textStrong: 'text-purple-600',
        barBg: 'bg-purple-500',
        gradientFrom: 'from-purple-400',
        gradientTo: 'to-purple-600',
        dotActive: 'bg-purple-500',
        dotPast: 'bg-purple-300',
        spinner: 'text-purple-500',
      };
    case 'cyan':
      return {
        textStrong: 'text-cyan-600',
        barBg: 'bg-cyan-500',
        gradientFrom: 'from-cyan-400',
        gradientTo: 'to-cyan-600',
        dotActive: 'bg-cyan-500',
        dotPast: 'bg-cyan-300',
        spinner: 'text-cyan-500',
      };
    case 'rose':
      return {
        textStrong: 'text-rose-600',
        barBg: 'bg-rose-500',
        gradientFrom: 'from-rose-400',
        gradientTo: 'to-rose-600',
        dotActive: 'bg-rose-500',
        dotPast: 'bg-rose-300',
        spinner: 'text-rose-500',
      };
    case 'indigo':
      return {
        textStrong: 'text-indigo-600',
        barBg: 'bg-indigo-500',
        gradientFrom: 'from-indigo-400',
        gradientTo: 'to-indigo-600',
        dotActive: 'bg-indigo-500',
        dotPast: 'bg-indigo-300',
        spinner: 'text-indigo-500',
      };
    case 'slate':
      return {
        textStrong: 'text-slate-600',
        barBg: 'bg-slate-500',
        gradientFrom: 'from-slate-400',
        gradientTo: 'to-slate-600',
        dotActive: 'bg-slate-500',
        dotPast: 'bg-slate-300',
        spinner: 'text-slate-500',
      };
    case 'emerald':
    default:
      return {
        textStrong: 'text-emerald-600',
        barBg: 'bg-emerald-500',
        gradientFrom: 'from-emerald-400',
        gradientTo: 'to-emerald-600',
        dotActive: 'bg-emerald-500',
        dotPast: 'bg-emerald-300',
        spinner: 'text-emerald-500',
      };
  }
}

function AILoadingProgress({ theme }: { theme: DivisionTheme }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { label: 'Mengambil data dari Google Sheets...', icon: Activity },
    { label: 'Menjalankan model regresi...', icon: Gauge },
    { label: 'Menganalisis dengan NLP...', icon: Brain },
    { label: 'Mendeteksi anomali...', icon: Zap },
    { label: 'Menghitung sentimen...', icon: MessageSquare },
    { label: 'Menyiapkan visualisasi...', icon: BarChart3 },
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className={cn("font-bold", theme.textStrong)}>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full bg-gradient-to-r rounded-full", theme.gradientFrom, theme.gradientTo)}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 text-sm text-gray-600"
        >
          <Loader2 className={cn("w-4 h-4 animate-spin", theme.spinner)} />
          <span>{steps[currentStep].label}</span>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-1.5 pt-2">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx === currentStep 
                ? cn(theme.dotActive, "w-6") 
                : idx < currentStep 
                  ? theme.dotPast
                  : "bg-gray-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface DivisionAIReportsDashboardProps {
  division?: string;
  branchFilter?: string | null;
}

export function DivisionAIReportsDashboard({ division = 'OS', branchFilter }: DivisionAIReportsDashboardProps) {
  const config = divisionConfigs[division] || divisionConfigs.OS;
  const theme = themeForColor(config.color);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyzeAllResponse | null>(null);
  const [rootStats, setRootStats] = useState<RootCauseStats | null>(null);
  const [detail, setDetail] = useState<{ index: number; open: boolean } | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'anomalies' | 'sentiment' | 'airlines' | 'hubs'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        division: division,
        ...(branchFilter && { branch: branchFilter })
      });

      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const res = await fetch(`/api/ai/analyze-all?${params.toString()}&bypass_cache=true&esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Gagal mengambil data analisis (${res.status})`);
      }

      const data = await res.json();

      const metadataIn = data?.metadata || {};
      const summaryIn = data?.summary || {};
      const sdIn = summaryIn.severityDistribution || summaryIn.severity_distribution || {};
      const normalizedSD: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      Object.entries(sdIn || {}).forEach(([k, v]) => {
        const key = String(k).toLowerCase();
        const val = Number(v) || 0;
        if (key.includes('crit') || key === '3') normalizedSD.Critical += val;
        else if (key.includes('high') || key === '2') normalizedSD.High += val;
        else if (key.includes('med') || key === '1') normalizedSD.Medium += val;
        else if (key.includes('low') || key === '0') normalizedSD.Low += val;
      });
      const predStatsIn = summaryIn.predictionStats || summaryIn.prediction_stats || {};
      const finalPredictionStats = {
        min: Number(predStatsIn.min) || 0,
        max: Number(predStatsIn.max) || 0,
        mean: Number(predStatsIn.mean) || 0,
      };
      // When summary had no severity data, compute from results
      const resultsArr: AnalysisItem[] = Array.isArray(data?.results) ? data.results : [];
      const sumFromSD = Object.values(normalizedSD).reduce((a, b) => a + b, 0);
      if (sumFromSD === 0 && resultsArr.length > 0) {
        for (const r of resultsArr) {
          const sev = String(r?.classification?.severity || 'Low');
          const key = /crit/i.test(sev) ? 'Critical' : /high/i.test(sev) ? 'High' : /med/i.test(sev) ? 'Medium' : 'Low';
          normalizedSD[key] = (normalizedSD[key] || 0) + 1;
        }
      }

      // Compute prediction stats from results when API summary lacks them
      if (finalPredictionStats.min === 0 && finalPredictionStats.max === 0 && resultsArr.length > 0) {
        let pMin = Infinity;
        let pMax = -Infinity;
        let pSum = 0;
        let pCount = 0;
        for (const r of resultsArr) {
          const d = r?.prediction?.predictedDays;
          if (typeof d === 'number' && Number.isFinite(d)) {
            if (d < pMin) pMin = d;
            if (d > pMax) pMax = d;
            pSum += d;
            pCount++;
          }
        }
        if (pCount > 0) {
          finalPredictionStats.min = pMin;
          finalPredictionStats.max = pMax;
          finalPredictionStats.mean = pSum / pCount;
        }
      }

      const recomputedSumFromSD = Object.values(normalizedSD).reduce((a, b) => a + b, 0);
      const totalFromSummary = Number(summaryIn.totalRecords) || 0;
      const totalRecordsCalc = Math.max(
        totalFromSummary,
        recomputedSumFromSD,
        resultsArr.length
      );

      const finalData: AnalyzeAllResponse = {
        status: 'success',
        metadata: {
          totalRecords: totalRecordsCalc,
          processingTimeSeconds:
            Number(metadataIn.processingTimeSeconds || metadataIn.processing_time_seconds) || 0,
          recordsPerSecond:
            Number(metadataIn.recordsPerSecond || metadataIn.records_per_second) || 0,
          modelVersions: metadataIn.modelVersions || metadataIn.model_versions || { regression: '1.0.0', nlp: '3.0.0' }
        },
        summary: {
          severityDistribution: normalizedSD,
          predictionStats: finalPredictionStats,
          totalRecords: totalRecordsCalc
        },
        results: resultsArr
      };

      setData(finalData);

      const rootCauseRes = await fetch(`/api/ai/root-cause/stats?division=${division}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
      if (rootCauseRes.ok) {
        const rootCauseData = await rootCauseRes.json();
        setRootStats(rootCauseData);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data AI');
    } finally {
      setLoading(false);
    }
  }, [division, branchFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const distribution = useMemo(() => data?.summary?.severityDistribution || {}, [data]);
  
  const totalRecords = useMemo(() => {
    const fromSummary = data?.summary?.totalRecords || 0;
    if (fromSummary) return fromSummary;
    return Object.values(distribution).reduce((a, b) => a + b, 0);
  }, [data, distribution]);
  
  const criticalHighCount = useMemo(() => 
    (distribution.Critical || 0) + (distribution.High || 0), [distribution]);

  const predictionStats = useMemo(() => data?.summary?.predictionStats || { min: 0, max: 0, mean: 0 }, [data]);

  const prioritized = useMemo(() => {
    const rows = data?.results || [];
    return rows
      .map((r) => {
        const sev = r.classification?.severity || 'Low';
        const days = r.prediction?.predictedDays ?? 0;
        const score = (severityWeight[sev] || 25) + Math.min(50, days * 5);
        return { item: r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [data]);

  const anomalyItems = useMemo(() => {
    return (data?.results || []).filter(r => r.prediction?.anomalyDetection?.isAnomaly);
  }, [data]);

  const airlineStats = useMemo(() => {
    const stats: Record<string, { count: number; critical: number; avgDays: number; totalDays: number }> = {};
    (data?.results || []).forEach(r => {
      const airline = r.originalData?.airline || r.originalData?.Airlines || 'Unknown';
      if (!stats[airline]) {
        stats[airline] = { count: 0, critical: 0, avgDays: 0, totalDays: 0 };
      }
      stats[airline].count++;
      stats[airline].totalDays += r.prediction?.predictedDays || 0;
      if (r.classification?.severity === 'Critical' || r.classification?.severity === 'High') {
        stats[airline].critical++;
      }
    });
    Object.keys(stats).forEach(k => {
      stats[k].avgDays = stats[k].totalDays / stats[k].count;
    });
    return Object.entries(stats)
      .map(([airline, data]) => ({ airline, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const hubStats = useMemo(() => {
    const stats: Record<string, { count: number; critical: number; high: number; avgDays: number; totalDays: number }> = {};
    (data?.results || []).forEach(r => {
      const hub = r.originalData?.hub || r.originalData?.HUB || 'Unknown';
      if (!stats[hub]) {
        stats[hub] = { count: 0, critical: 0, high: 0, avgDays: 0, totalDays: 0 };
      }
      stats[hub].count++;
      stats[hub].totalDays += r.prediction?.predictedDays || 0;
      if (r.classification?.severity === 'Critical') stats[hub].critical++;
      if (r.classification?.severity === 'High') stats[hub].high++;
    });
    Object.keys(stats).forEach(k => {
      stats[k].avgDays = stats[k].totalDays / stats[k].count;
    });
    return Object.entries(stats)
      .map(([hub, data]) => ({ hub, ...data, riskRatio: (data.critical + data.high) / data.count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const sentimentOverview = useMemo(() => {
    const sentimentCounts: Record<string, number> = {};
    let totalUrgency = 0;
    let urgencyCount = 0;
    const allKeywords: Record<string, number> = {};
    
    (data?.results || []).forEach(r => {
      if (r.sentiment?.sentiment) {
        sentimentCounts[r.sentiment.sentiment] = (sentimentCounts[r.sentiment.sentiment] || 0) + 1;
      }
      if (r.sentiment?.urgencyScore !== undefined) {
        totalUrgency += r.sentiment.urgencyScore;
        urgencyCount++;
      }
      (r.sentiment?.keywords || []).forEach(kw => {
        allKeywords[kw] = (allKeywords[kw] || 0) + 1;
      });
    });
    
    const topKeywords = Object.entries(allKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      distribution: sentimentCounts,
      avgUrgency: urgencyCount > 0 ? totalUrgency / urgencyCount : 0,
      topKeywords
    };
  }, [data]);

  // Create unique recommendation groups to avoid duplicated cards (group by effective issueType + severity)
  const recommendationGroups = useMemo(() => {
    const map: Record<string, { sev: string; issueType: string; count: number }> = {};
    prioritized.forEach(({ item }) => {
      const sev = item.classification?.severity || 'Low';
      const issueType = effectiveIssueType(item);
      const key = `${issueType.toLowerCase()}::${sev}`;
      if (!map[key]) {
        map[key] = { sev, issueType, count: 0 };
      }
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [prioritized]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return prioritized;
    const q = searchQuery.toLowerCase();
    return prioritized.filter(({ item }) => {
      const report = item.originalData?.report || item.originalData?.Report || '';
      const airline = item.originalData?.airline || item.originalData?.Airlines || '';
      const route = item.originalData?.route || item.originalData?.Route || '';
      return report.toLowerCase().includes(q) || 
             airline.toLowerCase().includes(q) || 
             route.toLowerCase().includes(q);
    });
  }, [prioritized, searchQuery]);

  const topPatterns = useMemo(() => {
    // First try to use rootStats from API
    const bc = rootStats?.by_category || {};
    if (Object.keys(bc).length > 0) {
      return Object.entries(bc).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
    }

    // Fallback: compute from results data
    const issueTypeStats: Record<string, { count: number; percentage: number }> = {};
    const results = data?.results || [];
    results.forEach(r => {
      const issueType = effectiveIssueType(r);
      if (!issueTypeStats[issueType]) {
        issueTypeStats[issueType] = { count: 0, percentage: 0 };
      }
      issueTypeStats[issueType].count++;
    });

    // Calculate percentages
    const total = results.length || 1;
    Object.keys(issueTypeStats).forEach(k => {
      issueTypeStats[k].percentage = Math.round((issueTypeStats[k].count / total) * 100);
    });

    return Object.entries(issueTypeStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);
  }, [rootStats, data]);

  const current = (() => {
    if (!detail || !detail.open) return null;
    return filteredResults[detail.index]?.item || null;
  })();

  const nav = useCallback((dir: -1 | 1) => {
    if (!detail) return;
    const next = detail.index + dir;
    if (next < 0 || next >= filteredResults.length) return;
    setDetail({ index: next, open: true });
    setShowFullDesc(false);
  }, [detail, filteredResults.length]);

  useEffect(() => {
    if (!detail?.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detail?.open, nav]);

  const exportData = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${division}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colorClass = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-500',
  }[config.color] || 'bg-emerald-500';

  const colorBgLight = {
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    cyan: 'bg-cyan-50 border-cyan-200',
    rose: 'bg-rose-50 border-rose-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    slate: 'bg-slate-50 border-slate-200',
  }[config.color] || 'bg-emerald-50 border-emerald-200';

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 bg-gray-50">
      <section className="relative overflow-hidden bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", colorBgLight)}>
              <Brain className={cn("w-6 h-6", `text-${config.color}-600`)} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">AI Reports · Divisi {config.name}</h1>
              <p className="text-sm text-gray-500">Analisis cerdas: prioritas, anomali, sentimen, dan rekomendasi tindakan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportData}
              disabled={!data || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Muat Ulang
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-8"
            >
              <div className="w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center">
                <Brain className="w-12 h-12 text-emerald-600 animate-pulse" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            <div className="text-center max-w-md mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Memuat Analisis AI</h3>
              <p className="text-gray-500 text-sm mb-4">
                Sedang memproses data dari model Machine Learning dan NLP...
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Analisis AI membutuhkan waktu sekitar 2-3 menit</span>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
              <AILoadingProgress theme={theme} />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Gauge, label: 'Prediksi Waktu', delay: 0 },
                { icon: AlertTriangle, label: 'Deteksi Anomali', delay: 0.1 },
                { icon: MessageSquare, label: 'Analisis Sentimen', delay: 0.2 },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay + 0.5 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <item.icon className="w-5 h-5 text-gray-400 animate-pulse" />
                  <span className="text-xs text-gray-500 text-center">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Total Kasus</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{totalRecords}</div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-4 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white"
              >
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Critical/High</span>
                </div>
                <div className="text-2xl font-bold text-red-700">{criticalHighCount}</div>
                <div className="text-xs text-red-500">{totalRecords > 0 ? ((criticalHighCount / totalRecords) * 100).toFixed(1) : 0}%</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white"
              >
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Anomali</span>
                </div>
                <div className="text-2xl font-bold text-orange-700">{anomalyItems.length}</div>
                <div className="text-xs text-orange-500">{totalRecords > 0 ? ((anomalyItems.length / totalRecords) * 100).toFixed(1) : 0}%</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white"
              >
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Rata-rata Hari</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{predictionStats.mean.toFixed(1)}</div>
                <div className="text-xs text-blue-500">{predictionStats.min.toFixed(1)} - {predictionStats.max.toFixed(1)}</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white"
              >
                <div className="flex items-center gap-2 text-purple-500 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Avg Urgency</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{(sentimentOverview.avgUrgency * 100).toFixed(0)}%</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
              >
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Proses</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">{data?.metadata?.processingTimeSeconds?.toFixed(1) || 0}s</div>
              </motion.div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'anomalies', label: 'Anomali', icon: AlertTriangle, count: anomalyItems.length },
                { id: 'sentiment', label: 'Sentimen', icon: MessageSquare },
                { id: 'airlines', label: 'Maskapai', icon: Plane },
                { id: 'hubs', label: 'Hub', icon: Building2 },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as typeof activeView)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    activeView === tab.id
                      ? cn("text-white", colorClass)
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs font-bold",
                      activeView === tab.id ? "bg-white/20" : "bg-gray-100"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeView === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="lg:col-span-1 space-y-6">
                    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h2 className="text-base font-bold text-gray-800">Distribusi Severity</h2>
                      </div>
                      <div className="space-y-3">
                        {['Critical', 'High', 'Medium', 'Low'].map((sev) => {
                          const count = distribution[sev] || 0;
                          const pctRaw = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
                          const pct = Math.max(0, Math.min(100, pctRaw));
                          return (
                            <div key={sev} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold">{sev}</span>
                                <span className="text-gray-500">{count} · {pct}%</span>
                              </div>
                              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.5 }}
                                  className={cn("h-full rounded-full", sevBarColor[sev] || 'bg-gray-400')}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <h2 className="text-base font-bold text-gray-800">Kategori Issue</h2>
                      </div>
                      <div className="space-y-3">
                        {topPatterns.length > 0 ? topPatterns.map(([cat, info], idx) => (
                          <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-gray-800">{String(cat || '').trim().toLowerCase() === 'unknown' || !cat ? 'Tidak terklasifikasi' : cat}</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                info.count > 50 ? "bg-red-100 text-red-700" :
                                info.count > 20 ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-700"
                              )}>
                                {info.count}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{ width: `${Math.min(100, info.percentage)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{info.percentage}%</span>
                            </div>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            Data kategori belum tersedia
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-emerald-600" />
                          <h2 className="text-base font-bold text-gray-800">Prioritas Kasus</h2>
                        </div>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Cari laporan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {filteredResults.map(({ item }, idx) => {
                          const sev = item.classification?.severity || 'Low';
                          const days = item.prediction?.predictedDays ?? 0;
                          const isAnomaly = item.prediction?.anomalyDetection?.isAnomaly;
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-all hover:shadow-sm"
                              onClick={() => setDetail({ index: idx, open: true })}
                            >
                              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-sm shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', sevStyle[sev] || sevStyle.Low)}>
                                    {sev}
                                  </span>
                                  {isAnomaly && (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                      Anomali
                                    </span>
                                  )}
                                  {days > 0 && (
                                    <span className="text-xs text-gray-600">~{days.toFixed(1)} hari</span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-gray-800 truncate" title={item.originalData?.report || item.originalData?.Report || ''}>
                                  {item.originalData?.report || item.originalData?.Report || item.classification?.issueType || 'Deskripsi tidak tersedia'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {normalizeLabel(item.originalData?.airline || item.originalData?.Airlines, '-')} · {normalizeLabel(item.originalData?.route || item.originalData?.Route, '-')}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {getRecommendations(effectiveIssueType(item), sev, division).slice(0, 2).map((rec, i) => (
                                    <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600">
                                      {rec}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                            </motion.div>
                          );
                        })}
                        {filteredResults.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>Tidak ada hasil yang ditemukan</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-amber-600" />
                        <h2 className="text-base font-bold text-gray-800">Rekomendasi Tindakan</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendationGroups.map((group, idx) => {
                          const sev = group.sev || 'Low';
                          const displayCategory = (group.issueType || 'Umum').toLowerCase() === 'unknown' ? 'Umum' : group.issueType;
                          const recs = getRecommendations(displayCategory === 'Umum' ? '' : displayCategory, sev, division).slice(0, 3);
                          return (
                            <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', sevStyle[sev])}>
                                  {sev}
                                </span>
                                <span className="text-xs font-semibold text-gray-700 truncate">
                                  {displayCategory}
                                </span>
                              </div>
                              <ul className="space-y-1.5">
                                {recs.map((r, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'anomalies' && (
                <motion.div
                  key="anomalies"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-800">Deteksi Anomali</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Ditemukan {anomalyItems.length} laporan dengan pola tidak normal dari total {totalRecords} laporan.
                          Anomali dapat mengindikasikan kasus yang memerlukan investigasi lebih lanjut.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {anomalyItems.slice(0, 10).map((item, idx) => {
                      const sev = item.classification?.severity || 'Low';
                      const anomaly = item.prediction?.anomalyDetection;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', sevStyle[sev])}>
                                {sev}
                              </span>
                              <span className="text-xs text-gray-600">
                                Skor: {((anomaly?.anomalyScore || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Zap className="w-4 h-4 text-amber-500" />
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2">
                            {item.originalData?.report || item.originalData?.Report || 'Deskripsi tidak tersedia'}
                          </p>
                          <div className="space-y-2">
                            {anomaly?.anomalies?.slice(0, 2).map((a, i) => (
                              <div key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>{a.message}</span>
                              </div>
                            ))}
                          </div>
                          {anomaly?.anomalies?.some(a => a.z_score) && (
                            <div className="mt-3 p-2 rounded-lg bg-white border border-amber-100">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Z-Score Distribution</p>
                              <div className="flex items-center gap-2">
                                {anomaly.anomalies.filter(a => a.z_score).map((a, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      (a.z_score || 0) > 3 ? "bg-red-500" : (a.z_score || 0) > 2 ? "bg-amber-500" : "bg-green-500"
                                    )} />
                                    <span className="text-[10px] text-gray-500">{a.z_score?.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeView === 'sentiment' && (
                <motion.div
                  key="sentiment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      <h2 className="text-base font-bold text-gray-800">Distribusi Sentimen</h2>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(sentimentOverview.distribution).map(([sentiment, count]) => {
                        const style = sentimentStyle[sentiment] || sentimentStyle.Neutral;
                        const Icon = style.icon;
                        const total = Object.values(sentimentOverview.distribution).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={sentiment} className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{sentiment}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{count}</span>
                              <span className="text-xs text-gray-500">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Gauge className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-gray-800">Tingkat Urgensi Rata-rata</h2>
                    </div>
                    <div className="text-center py-6">
                      <div className={cn(
                        "text-5xl font-black mb-2",
                        sentimentOverview.avgUrgency >= 0.7 ? "text-red-600" :
                        sentimentOverview.avgUrgency >= 0.4 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {(sentimentOverview.avgUrgency * 100).toFixed(0)}%
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sentimentOverview.avgUrgency * 100}%` }}
                          transition={{ duration: 0.8 }}
                          className={cn(
                            "h-full rounded-full",
                            sentimentOverview.avgUrgency >= 0.7 ? "bg-red-500" :
                            sentimentOverview.avgUrgency >= 0.4 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {sentimentOverview.avgUrgency >= 0.7 ? 'Sangat Urgent' :
                         sentimentOverview.avgUrgency >= 0.4 ? 'Cukup Urgent' : 'Normal'}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-base font-bold text-gray-800">Kata Kunci Teratas</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sentimentOverview.topKeywords.map(([keyword, count], idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 border border-gray-200"
                        >
                          {keyword} <span className="text-gray-400 text-xs">({count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'airlines' && (
                <motion.div
                  key="airlines"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Plane className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-gray-800">Performa Maskapai</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
                            <th className="text-left py-3 px-4 font-semibold">Maskapai</th>
                            <th className="text-center py-3 px-4 font-semibold">Total Kasus</th>
                            <th className="text-center py-3 px-4 font-semibold">Critical/High</th>
                            <th className="text-center py-3 px-4 font-semibold">Rata-rata Hari</th>
                            <th className="text-center py-3 px-4 font-semibold">Risk Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {airlineStats.map((airline, idx) => {
                            const riskRatio = airline.count > 0 ? airline.critical / airline.count : 0;
                            return (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-800">{normalizeLabel(airline.airline, '-')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-1 bg-gray-100 rounded-lg font-semibold">{airline.count}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded-lg font-semibold",
                                    airline.critical > 0 ? "bg-red-100 text-red-700" : "bg-gray-100"
                                  )}>
                                    {airline.critical}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "font-medium",
                                    airline.avgDays > 5 ? "text-red-600" : airline.avgDays > 3 ? "text-amber-600" : "text-emerald-600"
                                  )}>
                                    {airline.avgDays.toFixed(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          riskRatio > 0.5 ? "bg-red-500" : riskRatio > 0.25 ? "bg-amber-500" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${riskRatio * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500">{(riskRatio * 100).toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'hubs' && (
                <motion.div
                  key="hubs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <h2 className="text-base font-bold text-gray-800">Peta Risiko per Hub</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {hubStats.map((hub, idx) => {
                        const riskLevel = hub.riskRatio >= 0.5 ? 'high' : hub.riskRatio >= 0.25 ? 'medium' : 'low';
                        const riskColors = {
                          high: 'bg-red-100 border-red-300 text-red-800',
                          medium: 'bg-amber-100 border-amber-300 text-amber-800',
                          low: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                        };
                        const riskBadgeColors = {
                          high: 'bg-red-500 text-white',
                          medium: 'bg-amber-500 text-white',
                          low: 'bg-emerald-500 text-white',
                        };
                        return (
                          <motion.div
                            key={hub.hub}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn("p-4 rounded-xl border-2 transition-all hover:shadow-md", riskColors[riskLevel])}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm">{normalizeLabel(hub.hub, '-')}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                riskBadgeColors[riskLevel]
                              )}>
                                {riskLevel === 'high' ? 'Tinggi' : riskLevel === 'medium' ? 'Sedang' : 'Rendah'}
                              </span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span>Total Kasus</span>
                                <span className="font-bold">{hub.count}</span>
                              </div>
                              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-current rounded-full"
                                  style={{ width: `${Math.min(100, (hub.count / Math.max(...hubStats.map(h => h.count))) * 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between">
                                <span>Rata-rata</span>
                                <span className="font-bold">{hub.avgDays.toFixed(1)} hari</span>
                              </div>
                              <div className="flex gap-2 text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-red-200/50">
                                  Critical: {hub.critical}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-200/50">
                                  High: {hub.high}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <Sheet open={Boolean(detail?.open)} onOpenChange={(open) => setDetail(detail ? { index: detail.index, open } : null)}>
          <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl p-0 bg-white overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="sr-only">Detail Laporan</SheetTitle>
            </SheetHeader>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white">
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', sevStyle[current?.classification?.severity || 'Low'])}>
                  {current?.classification?.severity || 'Low'}
                </span>
                {typeof current?.prediction?.predictedDays === 'number' && (
                  <span className="text-xs text-gray-600">Prediksi ~ {current?.prediction?.predictedDays?.toFixed(1)} hari</span>
                )}
                {current?.prediction?.anomalyDetection?.isAnomaly && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                    Anomali
                  </span>
                )}
                <span className="ml-3 text-sm font-semibold text-gray-800">Detail Laporan</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => nav(-1)} disabled={(detail?.index || 0) <= 0}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => nav(1)} disabled={(detail?.index || 0) >= filteredResults.length - 1}>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button className="ml-1 p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => setDetail(null)} aria-label="Tutup">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {current ? (
              <div className="p-4 md:p-6 space-y-5">
                <div>
                  <p className={cn('text-sm font-semibold text-gray-800', showFullDesc ? '' : 'line-clamp-4')}>
                    {current.originalData?.report || current.originalData?.Report || 'Deskripsi tidak tersedia'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {current.classification?.issueType
                        ? `Kategori: ${String(current.classification.issueType).toLowerCase() === 'unknown' ? 'Tidak terklasifikasi' : current.classification.issueType}`
                        : null}
                    </p>
                    {(current.originalData?.report || current.originalData?.Report) && (
                      <button onClick={() => setShowFullDesc((s) => !s)} className="text-xs text-emerald-700 hover:underline">
                        {showFullDesc ? 'Tampilkan ringkas' : 'Lihat selengkapnya'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Tanggal', value: formatExcelDate(current.originalData?.date || current.originalData?.Date_of_Event), icon: Calendar },
                      { label: 'Maskapai', value: normalizeLabel(current.originalData?.airline || current.originalData?.Airlines, '-'), icon: Plane },
                      { label: 'No. Penerbangan', value: current.originalData?.flightNumber || current.originalData?.Flight_Number, icon: Hash },
                      { label: 'Rute', value: normalizeLabel(current.originalData?.route || current.originalData?.Route, '-'), icon: MapPin },
                      { label: 'Hub', value: normalizeLabel(current.originalData?.hub || current.originalData?.HUB, '-'), icon: Building2 },
                      { label: 'Status', value: normalizeLabel(current.originalData?.status || current.originalData?.Status || current.originalData?.STATUS, '-'), icon: CheckCircle2 },
                      { label: 'Branch', value: normalizeLabel(current.originalData?.branch || current.originalData?.Branch, '-'), icon: Building2 },
                      { label: 'Kategori', value: normalizeLabel(effectiveIssueType(current), 'Tidak terklasifikasi'), icon: Tag },
                    ].map((it, i) => it.value ? (
                    <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <it.icon className="w-3.5 h-3.5 text-gray-500" /> {it.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{it.value}</div>
                    </div>
                  ) : null)}
                </div>

                {current.summary?.executiveSummary && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 uppercase">Ringkasan AI</span>
                    </div>
                    <p className="text-sm text-gray-700">{current.summary.executiveSummary}</p>
                    {current.summary.keyPoints && current.summary.keyPoints.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {current.summary.keyPoints.map((point, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {current.sentiment && (
                  <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-700 uppercase">Analisis Sentimen</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sentimen</p>
                        <p className="text-sm font-bold text-gray-800">{current.sentiment.sentiment || 'Netral'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Urgency Score</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                (current.sentiment.urgencyScore || 0) >= 0.7 ? "bg-red-500" :
                                (current.sentiment.urgencyScore || 0) >= 0.4 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${(current.sentiment.urgencyScore || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{((current.sentiment.urgencyScore || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    {current.sentiment.keywords && current.sentiment.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {current.sentiment.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-100 rounded-full text-xs text-purple-700">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {current.prediction?.anomalyDetection?.isAnomaly && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase">Deteksi Anomali</span>
                    </div>
                    <div className="space-y-2">
                      {current.prediction.anomalyDetection.anomalies.map((a, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white border border-amber-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800">{a.type.replace(/_/g, ' ')}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              a.severity === 'high' ? "bg-red-100 text-red-700" :
                              a.severity === 'medium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {a.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{a.message}</p>
                          {a.z_score && (
                            <p className="text-xs text-gray-500 mt-1">Z-Score: {a.z_score.toFixed(2)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(current.originalData?.Root_Caused || current.originalData?.Action_Taken) && (
                  <div className="grid grid-cols-1 gap-3">
                    {current.originalData?.Root_Caused && (
                      <div className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Root Cause</div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">{current.originalData.Root_Caused}</div>
                      </div>
                    )}
                    {current.originalData?.Action_Taken && (
                      <div className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Tindakan</div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">{current.originalData.Action_Taken}</div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">Rekomendasi</div>
                  <div className="flex flex-wrap gap-2">
                    {getRecommendations(effectiveIssueType(current), current.classification?.severity, division).map((r, i) => (
                      <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700">{r}</span>
                    ))}
                  </div>
                </div>

                {current.entities?.entities && current.entities.entities.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 uppercase">Entitas Terdeteksi</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {current.entities.entities.map((entity, i) => (
                        <span
                          key={i}
                          className={cn(
                            "px-2 py-1 rounded-lg text-xs font-medium border",
                            entity.label === 'AIRLINE' ? "bg-blue-100 text-blue-700 border-blue-200" :
                            entity.label === 'FLIGHT_NUMBER' ? "bg-purple-100 text-purple-700 border-purple-200" :
                            entity.label === 'DATE' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          )}
                        >
                          {entity.text} <span className="opacity-60">({(entity.confidence * 100).toFixed(0)}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-500">Pilih laporan untuk melihat detail.</div>
            )}
          </SheetContent>
        </Sheet>
      </section>
    </div>
  );
}

export default DivisionAIReportsDashboard;
