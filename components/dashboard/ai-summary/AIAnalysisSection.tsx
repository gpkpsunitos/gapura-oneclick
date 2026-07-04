"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Clock,
  AlertTriangle,
  Tag,
  FileText,
  TrendingUp,
  Hash,
  Loader2,
  RefreshCw,
  ChevronDown,
  Zap,
  Target,
  MessageSquare,
  Plane,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Report } from "@/types";

interface AIAnalysisResult {
  regression?: {
    predictions?: Array<{
      reportId: string;
      predictedDays: number;
      confidenceInterval: [number, number];
      featureImportance?: Record<string, number>;
    }>;
    modelMetrics?: {
      mae?: number;
      rmse?: number;
      r2?: number;
    };
  };
  nlp?: {
    classifications?: Array<{
      reportId: string;
      severity: string;
      severityConfidence: number;
      areaType: string;
      issueType: string;
      issueTypeConfidence: number;
    }>;
    entities?: Array<{
      reportId: string;
      entities: Array<{
        text: string;
        label: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
    summaries?: Array<{
      reportId: string;
      executiveSummary: string;
      keyPoints: string[];
    }>;
    sentiment?: Array<{
      reportId: string;
      urgencyScore: number;
      sentiment: string;
      keywords: string[];
    }>;
  };
  trends?: {
    byAirline?: Record<
      string,
      {
        count: number;
        avgResolutionDays: number;
        topIssues: string[];
      }
    >;
    byHub?: Record<
      string,
      {
        count: number;
        avgResolutionDays: number;
        topIssues: string[];
      }
    >;
    byCategory?: Record<
      string,
      {
        count: number;
        trend: string;
      }
    >;
  };
  metadata?: {
    totalRecords: number;
    processingTime: number;
    modelVersions: {
      regression: string;
      nlp: string;
    };
  };
}

interface AIAnalysisSectionProps {
  report: Report;
  autoFetch?: boolean;
  className?: string;
}

type SingleIssueSignal = {
  id: string;
  status: "ok" | "error";
  data?: unknown;
  error?: string;
};

type SingleIssueRequest = {
  id: string;
  path: string;
  body: Record<string, unknown>;
};

type PredictiveInsight = {
  key: string;
  title: string;
  tone: "blue" | "emerald" | "amber" | "red" | "slate" | "indigo";
  rows: Array<{ label: string; value: string }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function compactValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(compactValue).filter(Boolean).slice(0, 4).join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const namedValue = record.title || record.name || record.label || record.category || record.root_cause || record.summary || record.description || record.report;
    if (namedValue) return compactValue(namedValue);
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 140 ? `${serialized.slice(0, 140)}...` : serialized;
    } catch {
      return "";
    }
  }
  return "";
}

function findValue(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValue(item, keys, depth + 1);
      if (found !== undefined && compactValue(found)) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const loweredKeys = keys.map((key) => key.toLowerCase());
  for (const [key, item] of Object.entries(record)) {
    if (loweredKeys.includes(key.toLowerCase()) && compactValue(item)) return item;
  }

  for (const item of Object.values(record)) {
    const found = findValue(item, keys, depth + 1);
    if (found !== undefined && compactValue(found)) return found;
  }

  return undefined;
}

function findList(value: unknown, keys: string[]): unknown[] {
  const direct = findValue(value, keys);
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") return Object.values(direct);
  return [];
}

function valueLabel(value: unknown): string {
  if (typeof value === "number") {
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return compactValue(value);
}

function rowsFromList(items: unknown[], labelPrefix: string, limit = 3): Array<{ label: string; value: string }> {
  return items
    .slice(0, limit)
    .map((item, index) => {
      const record = asRecord(item);
      const text =
        compactValue(record.recommendation || record.action || record.title || record.description || record.name || record.report || record.root_cause || record.label || item);
      return text ? { label: `${labelPrefix} ${index + 1}`, value: text } : null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function firstRow(value: unknown, label: string, keys: string[]): { label: string; value: string } | null {
  const found = findValue(value, keys);
  const text = valueLabel(found);
  return text ? { label, value: text } : null;
}

function buildPredictiveInsights(signals: SingleIssueSignal[]): PredictiveInsight[] {
  return signals
    .filter((signal) => signal.id !== "analyze")
    .map((signal) => {
      const fallbackRows = signal.status === "error"
        ? [{ label: "Status", value: signal.error || "Belum tersedia" }]
        : [{ label: "Hasil", value: compactValue(signal.data) || "Belum ada detail" }];

      if (signal.status === "error") {
        const titles: Record<string, string> = {
          "action-recommend": "Rekomendasi Aksi",
          subcategory: "Prediksi Sub-Kategori",
          "risk-calculate": "Skor Risiko Case",
          similar: "Case Serupa",
          "root-classify": "Klasifikasi Root Cause",
          "root-intelligence": "Insight Root Cause",
        };
        return {
          key: signal.id,
          title: titles[signal.id] || "Insight Tambahan",
          tone: "amber" as const,
          rows: fallbackRows,
        };
      }

      const data = signal.data;
      switch (signal.id) {
        case "action-recommend": {
          const recommendations = rowsFromList(
            findList(data, ["recommendations", "recommended_actions", "actions", "items"]),
            "Aksi"
          );
          const rows = [
            ...recommendations,
            firstRow(data, "Issue type", ["issue_type", "issueType"]),
            firstRow(data, "Severity", ["severity"]),
            firstRow(data, "Effectiveness", ["effectiveness_score", "effectivenessScore", "score"]),
          ].filter((item): item is { label: string; value: string } => Boolean(item));
          return { key: signal.id, title: "Rekomendasi Aksi", tone: "emerald", rows: rows.length ? rows : fallbackRows };
        }
        case "subcategory": {
          const rows = [
            firstRow(data, "Sub-kategori", ["subcategory", "sub_category", "subCategory", "prediction", "label"]),
            firstRow(data, "Kategori", ["category", "classification"]),
            firstRow(data, "Confidence", ["confidence", "score", "probability"]),
          ].filter((item): item is { label: string; value: string } => Boolean(item));
          return { key: signal.id, title: "Prediksi Sub-Kategori", tone: "indigo", rows: rows.length ? rows : fallbackRows };
        }
        case "risk-calculate": {
          const rows = [
            firstRow(data, "Status risiko", ["status", "risk_status", "riskStatus"]),
            firstRow(data, "Skor risiko", ["risk_score", "riskScore", "score"]),
            firstRow(data, "Ringkasan", ["risk_summary", "riskSummary", "summary"]),
            firstRow(data, "Record diproses", ["records_processed", "recordsProcessed", "totalRecords"]),
          ].filter((item): item is { label: string; value: string } => Boolean(item));
          return { key: signal.id, title: "Skor Risiko Case", tone: "red", rows: rows.length ? rows : fallbackRows };
        }
        case "similar": {
          const similarCases = findList(data, ["results", "similar_cases", "similarCases", "matches", "reports"]);
          const rows = [
            { label: "Jumlah temuan", value: String(similarCases.length || findValue(data, ["count", "total", "total_results"]) || 0) },
            ...rowsFromList(similarCases, "Case", 3),
          ];
          return { key: signal.id, title: "Case Serupa", tone: "blue", rows: rows.length ? rows : fallbackRows };
        }
        case "root-classify": {
          const rows = [
            firstRow(data, "Root cause", ["root_cause", "rootCause", "predicted_root_cause", "label", "category"]),
            firstRow(data, "Klasifikasi", ["classification", "prediction"]),
            firstRow(data, "Confidence", ["confidence", "score", "probability"]),
          ].filter((item): item is { label: string; value: string } => Boolean(item));
          return { key: signal.id, title: "Klasifikasi Root Cause", tone: "amber", rows: rows.length ? rows : fallbackRows };
        }
        case "root-intelligence": {
          const recommendations = rowsFromList(findList(data, ["recommendations", "insights", "actions"]), "Insight");
          const rootCauseRows = rowsFromList(findList(data, ["rootCauses", "root_causes", "sheetRootCauses"]), "Root cause", 3);
          const rows = [
            firstRow(data, "Root cause fokus", ["selectedRootCause", "selected_root_cause"]),
            ...recommendations,
            ...rootCauseRows,
          ].filter((item): item is { label: string; value: string } => Boolean(item));
          return { key: signal.id, title: "Insight Root Cause", tone: "slate", rows: rows.length ? rows : fallbackRows };
        }
        default:
          return { key: signal.id, title: "Insight Tambahan", tone: "slate", rows: fallbackRows };
      }
    });
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50/30 hover:bg-slate-50 transition-colors border-b border-transparent data-[state=open]:border-slate-50"
        data-state={isOpen ? "open" : "closed"}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-bold text-slate-700 tracking-tight">{title}</span>
        </div>
        <div className={cn("transition-transform duration-500 ease-out", isOpen ? "rotate-180" : "rotate-0")}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EntityTag({ text, label, confidence }: { text: string; label: string; confidence: number }) {
  const labelColors: Record<string, string> = {
    AIRLINE: "bg-blue-100 text-blue-700 border-blue-200",
    FLIGHT_NUMBER: "bg-purple-100 text-purple-700 border-purple-200",
    DATE: "bg-green-100 text-green-700 border-green-200",
    LOCATION: "bg-amber-100 text-amber-700 border-amber-200",
    PERSON: "bg-pink-100 text-pink-700 border-pink-200",
    ORG: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
        labelColors[label] || "bg-white text-indigo-600 border-indigo-100"
      )}
    >
      <Hash className="w-3 h-3 text-indigo-400" />
      {text}
      <span className="text-slate-400 opacity-60">[{Math.round(confidence * 100)}%]</span>
    </span>
  );
}

function SeverityBadge({ severity, confidence }: { severity: string; confidence: number }) {
  const severityConfig: Record<string, { bg: string; text: string; icon: React.ElementType, border: string }> = {
    Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertTriangle },
    High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: Zap },
    Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Target },
    Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: Target },
  };

  const config = severityConfig[severity] || severityConfig.Medium;
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-4 px-5 py-4 rounded-2xl border bg-white shadow-sm", config.border)}>
      <div className={cn("p-2 rounded-xl bg-slate-50", config.text)}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex flex-col">
        <span className={cn("font-bold tracking-tight text-[15px] uppercase", config.text)}>{severity}</span>
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Conf: {(confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function PredictiveInsightCard({ insight }: { insight: PredictiveInsight }) {
  const toneClass: Record<PredictiveInsight["tone"], string> = {
    blue: "border-blue-100 bg-blue-50/50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/50 text-amber-700",
    red: "border-red-100 bg-red-50/50 text-red-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
    indigo: "border-indigo-100 bg-indigo-50/50 text-indigo-700",
  };

  return (
    <div className={cn("rounded-2xl border p-4", toneClass[insight.tone])}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em]">{insight.title}</p>
      <div className="mt-3 space-y-2">
        {insight.rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl bg-white/75 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{row.label}</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAnalysisSection({
  report,
  autoFetch = true,
  className,
}: AIAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [singleIssueSignals, setSingleIssueSignals] = useState<SingleIssueSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!report) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setSingleIssueSignals([]);

    try {

      const reportData = {
        Date_of_Event: report.date_of_event || report.event_date || report.created_at,
        Airlines: report.airlines || report.airline || "Unknown",
        Flight_Number: report.flight_number || "N/A",
        Branch: report.branch || report.stations?.code || "Unknown",
        HUB: report.hub || "Unknown",
        Report_Category: report.category || "Irregularity",
        Irregularity_Complain_Category: report.main_category || report.irregularity_complain_category || "Unknown",
        Report: report.report || report.description || report.title || "",
        Root_Caused: report.root_cause || report.root_caused || "",
        Action_Taken: report.action_taken || report.immediate_action || "",
        Area: report.area || "Unknown",
        Status: report.status || "Open",
      };

      const reportText = report.report || report.description || report.title || "";
      const issueType = report.main_category || report.irregularity_complain_category || report.category || "Unknown";
      const severity = report.severity_level || report.severity || "MEDIUM";
      const area = report.area || report.specific_location || report.location || "";
      const airline = report.airlines || report.airline || "";
      const rootCause = report.root_cause || report.root_caused || report.identification_of_root || report.issue_caused || "";
      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const requestBody = {
        report: reportText,
        text: reportText,
        issue_type: issueType,
        issueType,
        severity,
        area,
        airline,
        airlines: airline,
        branch: report.branch || report.stations?.code || "",
        hub: report.hub || "",
        root_cause: rootCause,
        rootCause,
        category: report.category || issueType,
        route: report.route || "",
        flight_number: report.flight_number || "",
      };

      const singleIssueRequests: SingleIssueRequest[] = [
        {
          id: "analyze",
          path: `/api/ai/analyze?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
          body: {
            data: [reportData],
            options: {
              predictResolutionTime: true,
              classifySeverity: true,
              extractEntities: true,
              generateSummary: true,
              analyzeTrends: true,
            },
          },
        },
        {
          id: "action-recommend",
          path: "/api/ai/action/recommend",
          body: { ...requestBody, top_n: 5, topN: 5 },
        },
        {
          id: "subcategory",
          path: "/api/ai/subcategory",
          body: requestBody,
        },
        {
          id: "risk-calculate",
          path: `/api/ai/risk/calculate?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
          body: { ...requestBody, report: reportData, data: [reportData], records: [reportData] },
        },
        {
          id: "similar",
          path: `/api/ai/similar?top_k=5&threshold=0.3&esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
          body: requestBody,
        },
        {
          id: "root-classify",
          path: `/api/ai/root-cause/classify?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
          body: requestBody,
        },
        {
          id: "root-intelligence",
          path: "/api/ai/root-cause/intelligence",
          body: {
            esklasiRegex,
            selectedRootCause: rootCause,
            records: [{
              id: report.id,
              report: reportText,
              root_cause: rootCause,
              area,
              issueCategory: issueType,
              category: report.category || issueType,
              branch: report.branch || report.stations?.code || "",
              airline,
              status: report.status,
            }],
          },
        },
      ];

      const runSignal = async (item: SingleIssueRequest): Promise<SingleIssueSignal> => {
        try {
          const response = await fetch(item.path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.body),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            const message = compactValue(asRecord(payload).error || asRecord(payload).details) || `HTTP ${response.status}`;
            return { id: item.id, status: "error", error: message };
          }
          return { id: item.id, status: "ok", data: payload };
        } catch (signalError) {
          return {
            id: item.id,
            status: "error",
            error: signalError instanceof Error ? signalError.message : "Request failed",
          };
        }
      };

      const signalResults = await Promise.all(singleIssueRequests.map(runSignal));
      const analyzeResult = signalResults.find((item) => item.id === "analyze");
      if (analyzeResult?.status !== "ok") {
        throw new Error(analyzeResult?.error || "Failed to analyze report");
      }

      setAnalysis(analyzeResult.data as AIAnalysisResult);
      setSingleIssueSignals(signalResults);
    } catch (err) {
      console.error("AI Analysis error:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze report");
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    if (autoFetch && report) {
      fetchAnalysis();
    }
  }, [autoFetch, report, fetchAnalysis]);

  const prediction = analysis?.regression?.predictions?.[0];
  const classification = analysis?.nlp?.classifications?.[0];
  const entities = analysis?.nlp?.entities?.[0]?.entities || [];
  const summary = analysis?.nlp?.summaries?.[0];
  const sentiment = analysis?.nlp?.sentiment?.[0];
  const predictiveInsights = buildPredictiveInsights(singleIssueSignals);

  return (
    <div className={cn("space-y-5", className)}>
      {}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 w-1/2 h-full skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
              GAPURA.AI INSIGHTS
            </h3>
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-2 mt-1 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {analysis?.metadata?.processingTime
                ? `Processed in ${analysis.metadata.processingTime.toFixed(0)}ms`
                : "Awaiting analysis..."}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all uppercase tracking-widest",
            "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 text-indigo-600",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{loading ? "Analyzing..." : "Re-analyze"}</span>
        </button>
      </div>

      {}
      {loading && !analysis && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
          <p className="text-sm font-medium">Analyzing report with AI...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Analysis Failed</p>
            <p className="text-xs opacity-70">{error}</p>
          </div>
        </div>
      )}

      {}
      {analysis && !loading && (
        <div className="space-y-3">
          {}
          {prediction && (
            <CollapsibleSection title="Predicted Resolution Time" icon={Clock}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Estimasi", value: prediction.predictedDays, tone: "text-blue-600" },
                    { label: "Minimum", value: prediction.confidenceInterval[0], tone: "text-slate-700" },
                    { label: "Maksimum", value: prediction.confidenceInterval[1], tone: "text-slate-700" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className={cn("mt-1 text-2xl font-black", item.tone)}>{item.value.toFixed(1)}d</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Rentang prediksi</p>
                    <p className="text-xs font-semibold text-blue-700">
                      {prediction.confidenceInterval[0].toFixed(1)}d - {prediction.confidenceInterval[1].toFixed(1)}d
                    </p>
                  </div>
                  <div className="relative h-8">
                    <div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-white" />
                    <div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
                    <div
                      className="absolute top-0 h-8 w-1.5 rounded-full bg-slate-950 shadow-sm"
                      style={{
                        left: `${Math.min(100, Math.max(0, ((prediction.predictedDays - prediction.confidenceInterval[0]) / Math.max(0.1, prediction.confidenceInterval[1] - prediction.confidenceInterval[0])) * 100))}%`,
                      }}
                      aria-label="Estimated resolution marker"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Lebih cepat</span>
                    <span>Target estimasi: {prediction.predictedDays.toFixed(1)} hari</span>
                    <span>Lebih lama</span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {}
          {classification && (
            <CollapsibleSection title="Severity Classification" icon={AlertTriangle}>
              <div className="space-y-3">
                <SeverityBadge
                  severity={classification.severity}
                  confidence={classification.severityConfidence}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Issue Type</p>
                    <p className="text-sm font-medium">{classification.issueType}</p>
                    <p className="text-xs text-gray-400">
                      {(classification.issueTypeConfidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Area Type</p>
                    <p className="text-sm font-medium">{classification.areaType}</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {}
          {entities.length > 0 && (
            <CollapsibleSection title="Extracted Entities" icon={Tag}>
              <div className="flex flex-wrap gap-2">
                {entities.map((entity, idx) => (
                  <EntityTag
                    key={idx}
                    text={entity.text}
                    label={entity.label}
                    confidence={entity.confidence}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {}
          {summary && (
            <CollapsibleSection title="Executive Summary" icon={FileText}>
              <div className="space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {summary.executiveSummary}
                </p>
                {summary.keyPoints.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2">Key Points</p>
                    <ul className="space-y-1">
                      {summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {}
          {sentiment && (
            <CollapsibleSection title="Sentiment Analysis" icon={MessageSquare}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{sentiment.sentiment}</p>
                    <p className="text-xs text-gray-500">
                      Urgency Score: {(sentiment.urgencyScore * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke={sentiment.urgencyScore > 0.6 ? "#ef4444" : sentiment.urgencyScore > 0.3 ? "#f59e0b" : "#22c55e"}
                        strokeWidth="4"
                        strokeDasharray={`${sentiment.urgencyScore * 175.9} 175.9`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {(sentiment.urgencyScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {sentiment.keywords.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sentiment.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {predictiveInsights.length > 0 && (
            <CollapsibleSection title="Predictive Case Insights" icon={Target}>
              <div className="grid gap-3 md:grid-cols-2">
                {predictiveInsights.map((insight) => (
                  <PredictiveInsightCard key={insight.key} insight={insight} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {}
          {analysis?.trends && (
            <CollapsibleSection title="Trend Analysis" icon={TrendingUp} defaultOpen={false}>
              <div className="space-y-4">
                {}
                {analysis.trends.byAirline && Object.keys(analysis.trends.byAirline).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                      <Plane className="w-3 h-3" /> By Airline
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(analysis.trends.byAirline).slice(0, 3).map(([airline, data]) => (
                        <div key={airline} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{airline}</span>
                          <div className="text-right">
                            <span className="text-xs text-gray-500">{data.count} cases</span>
                            <span className="mx-1.5 text-gray-300">•</span>
                            <span className="text-xs text-gray-500">{data.avgResolutionDays.toFixed(1)}d avg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {}
                {analysis.trends.byHub && Object.keys(analysis.trends.byHub).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> By Hub
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(analysis.trends.byHub).slice(0, 3).map(([hub, data]) => (
                        <div key={hub} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{hub}</span>
                          <div className="text-right">
                            <span className="text-xs text-gray-500">{data.count} cases</span>
                            <span className="mx-1.5 text-gray-300">•</span>
                            <span className="text-xs text-gray-500">{data.avgResolutionDays.toFixed(1)}d avg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {}
                {analysis.trends.byCategory && Object.keys(analysis.trends.byCategory).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> By Category
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysis.trends.byCategory).slice(0, 5).map(([category, data]) => (
                        <span
                          key={category}
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            data.trend === "increasing" && "bg-red-50 text-red-700",
                            data.trend === "decreasing" && "bg-green-50 text-green-700",
                            data.trend === "stable" && "bg-gray-50 text-gray-700"
                          )}
                        >
                          {category} ({data.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {}
          {analysis?.metadata?.modelVersions && (
            <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 pt-2">
              <span>Model v{analysis.metadata.modelVersions.nlp}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
