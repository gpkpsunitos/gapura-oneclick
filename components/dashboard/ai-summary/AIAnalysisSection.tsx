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
  Brain,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  MessageSquare,
  Calendar,
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressBar({ value, max = 1, color = "blue" }: { value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full transition-all duration-500", colorClasses[color] || colorClasses.blue)}
        style={{ width: `${percentage}%` }}
      />
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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
        labelColors[label] || "bg-gray-100 text-gray-700 border-gray-200"
      )}
    >
      <Hash className="w-3 h-3" />
      {text}
      <span className="opacity-60">({Math.round(confidence * 100)}%)</span>
    </span>
  );
}

function SeverityBadge({ severity, confidence }: { severity: string; confidence: number }) {
  const severityConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    Critical: { bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
    High: { bg: "bg-orange-100", text: "text-orange-700", icon: Zap },
    Medium: { bg: "bg-amber-100", text: "text-amber-700", icon: Target },
    Low: { bg: "bg-green-100", text: "text-green-700", icon: Target },
  };

  const config = severityConfig[severity] || severityConfig.Medium;
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", config.bg, config.text)}>
      <Icon className="w-4 h-4" />
      <span className="font-bold text-sm">{severity}</span>
      <span className="text-xs opacity-70">({Math.round(confidence * 100)}% confidence)</span>
    </div>
  );
}

export function AIAnalysisSection({
  report,
  autoFetch = true,
  className,
}: AIAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!report) return;

    setLoading(true);
    setError(null);

    try {
      // Convert report to AI service format
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

      const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "https://gapura-dev-gapura-ai.hf.space";
      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const res = await fetch(`${baseUrl}/api/ai/analyze?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [reportData],
          options: {
            predictResolutionTime: true,
            classifySeverity: true,
            extractEntities: true,
            generateSummary: true,
            analyzeTrends: true,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze report");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
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

  // Extract first prediction data
  const prediction = analysis?.regression?.predictions?.[0];
  const classification = analysis?.nlp?.classifications?.[0];
  const entities = analysis?.nlp?.entities?.[0]?.entities || [];
  const summary = analysis?.nlp?.summaries?.[0];
  const sentiment = analysis?.nlp?.sentiment?.[0];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">AI Analysis</h3>
            <p className="text-[10px] text-gray-500">
              {analysis?.metadata?.processingTime
                ? `Processed in ${analysis.metadata.processingTime.toFixed(0)}ms`
                : "Analyzing report..."}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-gray-100 hover:bg-gray-200 text-gray-600",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{loading ? "Analyzing..." : "Re-analyze"}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && !analysis && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
          <p className="text-sm font-medium">Analyzing report with AI...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Analysis Failed</p>
            <p className="text-xs opacity-70">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <div className="space-y-3">
          {/* Predicted Resolution Time */}
          {prediction && (
            <CollapsibleSection title="Predicted Resolution Time" icon={Clock}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estimated Days:</span>
                  <span className="text-2xl font-black text-blue-600">
                    {prediction.predictedDays.toFixed(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Confidence Interval</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {prediction.confidenceInterval[0].toFixed(1)}d
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full relative">
                      <div
                        className="absolute h-full bg-blue-400 rounded-full"
                        style={{
                          left: `${(prediction.confidenceInterval[0] / prediction.predictedDays) * 50}%`,
                          right: `${50 - (prediction.confidenceInterval[1] / prediction.predictedDays / 2) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {prediction.confidenceInterval[1].toFixed(1)}d
                    </span>
                  </div>
                </div>
                {prediction.featureImportance && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Feature Importance</p>
                    <div className="space-y-1.5">
                      {Object.entries(prediction.featureImportance).map(([feature, importance]) => (
                        <div key={feature} className="flex items-center gap-2">
                          <span className="text-xs w-24 truncate">{feature}</span>
                          <ProgressBar value={importance} color="blue" />
                          <span className="text-xs text-gray-500 w-10">
                            {(importance * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Severity Classification */}
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

          {/* Extracted Entities */}
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

          {/* Executive Summary */}
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

          {/* Sentiment Analysis */}
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

          {/* Trend Analysis */}
          {analysis?.trends && (
            <CollapsibleSection title="Trend Analysis" icon={TrendingUp} defaultOpen={false}>
              <div className="space-y-4">
                {/* By Airline */}
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

                {/* By Hub */}
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

                {/* By Category */}
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

          {/* Model Info */}
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
