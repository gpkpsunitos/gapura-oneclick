"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  FolderOpen,
  Target,
  ChevronRight,
  Lightbulb,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActionSummaryResponse, GlobalRecommendation } from "./types";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ActionSummaryCardProps {
  data: ActionSummaryResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/50 p-3 animate-pulse">
      <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-12 bg-gray-200 rounded" />
    </div>
  );
}

function SeverityBar({
  distribution,
  total,
}: {
  distribution: Record<string, number>;
  total: number;
}) {
  const severities = [
    { key: "Critical", color: "bg-red-500", bg: "bg-red-100" },
    { key: "High", color: "bg-orange-500", bg: "bg-orange-100" },
    { key: "Medium", color: "bg-amber-500", bg: "bg-amber-100" },
    { key: "Low", color: "bg-emerald-500", bg: "bg-emerald-100" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
        {severities.map(({ key, color }) => {
          const count = distribution[key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return pct > 0 ? (
            <motion.div
              key={key}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn(
                color,
                "first:rounded-l-full last:rounded-r-full"
              )}
            />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {severities.map(({ key, color, bg }) => {
          const count = distribution[key] || 0;
          if (count === 0) return null;
          return (
            <span
              key={key}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                bg,
                color.replace("bg-", "text-")
              )}
            >
              {count} {key}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: GlobalRecommendation }) {
  if (rec.action === "#N/A") return null;

  return (
    <div className="p-3 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100">
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
            rec.priority === "HIGH"
              ? "bg-red-100"
              : rec.priority === "LOW"
                ? "bg-gray-100"
                : "bg-amber-100"
          )}
        >
          <Lightbulb
            className={cn(
              "w-3 h-3",
              rec.priority === "HIGH"
                ? "text-red-600"
                : rec.priority === "LOW"
                  ? "text-gray-500"
                  : "text-amber-600"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-tight">
            {rec.action}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">
              {rec.category}
            </span>
            <span className="text-[10px] text-gray-400 tabular-nums">
              {(rec.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionSummaryCard({
  data,
  loading,
  error,
  className,
}: ActionSummaryCardProps) {
  const [showRecommendations, setShowRecommendations] = useState(false);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 p-4 text-center",
          className
        )}
      >
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (
    !data ||
    (!data.overallSummary &&
      !(data as unknown as { summary?: unknown }).summary)
  ) {
    return null;
  }

  const globalRecommendations = (data.globalRecommendations || []).filter(
    (r) => r.action !== "#N/A" && r.category !== "Unknown"
  );

  type CompactSummary = {
    totalRecords: number;
    severityDistribution: {
      Low?: number;
      Medium?: number;
      High?: number;
      Critical?: number;
    };
    predictionStats?: { min: number; max: number; mean: number };
  };
  const hasCompactSummary = (
    obj: unknown
  ): obj is { summary: CompactSummary } =>
    typeof obj === "object" &&
    obj !== null &&
    "summary" in (obj as Record<string, unknown>);

  let overallSummary = data.overallSummary;
  if (!overallSummary && hasCompactSummary(data)) {
    const s = data.summary;
    const categories = data.categories || {};
    overallSummary = {
      totalRecords: s.totalRecords,
      openCount: 0,
      closedCount: 0,
      highPriorityCount: Math.round(
        (s.severityDistribution.High || 0) +
          (s.severityDistribution.Critical || 0)
      ),
      severityDistribution: {
        Low: s.severityDistribution.Low || 0,
        Medium: s.severityDistribution.Medium || 0,
        High: s.severityDistribution.High || 0,
        Critical: s.severityDistribution.Critical || 0,
      },
      avgResolutionDays: s.predictionStats?.mean || 0,
      categoriesCount: Object.keys(categories).length,
      avgDaysSource: "predictionStats.mean",
    };
  }

  const resolutionRate =
    overallSummary.totalRecords > 0
      ? (
          ((overallSummary.closedCount || 0) / overallSummary.totalRecords) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Action Intelligence
            </h3>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-gray-500">
                {overallSummary.categoriesCount} categories analyzed
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Action Intelligence explanation"
                      className="ml-1 inline-flex items-center justify-center rounded-full w-4 h-4 bg-gray-100 text-gray-500 hover:bg-gray-200"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs text-xs leading-relaxed"
                  >
                    <p>Hitung per laporan, bukan per entitas.</p>
                    <p className="mt-1">
                      Total/Open/Closed = jumlah laporan. Severity = banyaknya
                      laporan per tingkat keparahan.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-[10px] font-black uppercase tracking-wider">
            Per Laporan
          </span>
          <div className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
            <span className="text-sm font-black">
              {overallSummary?.totalRecords?.toLocaleString("id-ID")}
            </span>
            <span className="ml-1 text-[10px] font-medium">Laporan</span>
          </div>
        </div>
      </div>

      {/* ── Status Pills ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-500 uppercase">
          Ringkasan per laporan
        </p>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">
            Open {overallSummary?.openCount ?? 0}
          </span>
          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            Closed {overallSummary?.closedCount ?? 0}
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-5 gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <FolderOpen className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-bold text-blue-600 uppercase">
              Total
            </span>
          </div>
          <p className="text-lg font-black text-blue-700">
            {overallSummary.totalRecords?.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] font-bold text-amber-600 uppercase">
              Open
            </span>
          </div>
          <p className="text-lg font-black text-amber-700">
            {overallSummary?.openCount ?? 0}
          </p>
          <p className="text-[9px] text-amber-500">
            {overallSummary?.totalRecords
              ? (
                  ((overallSummary.openCount || 0) /
                    overallSummary.totalRecords) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-600 uppercase">
              Closed
            </span>
          </div>
          <p className="text-lg font-black text-emerald-700">
            {(overallSummary?.closedCount ?? 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-emerald-500">{resolutionRate}% rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-red-500" />
            <span className="text-[9px] font-bold text-red-600 uppercase">
              High
            </span>
          </div>
          <p className="text-lg font-black text-red-700">
            {overallSummary?.highPriorityCount ?? 0}
          </p>
          <p className="text-[9px] text-red-500">priority</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-violet-500" />
            <span className="text-[9px] font-bold text-violet-600 uppercase">
              Avg
            </span>
          </div>
          <p className="text-lg font-black text-violet-700">
            {(overallSummary?.avgResolutionDays ?? 0).toFixed(1)}
          </p>
          <p className="text-[9px] text-violet-500">days</p>
        </motion.div>
      </div>

      {/* ── Overall Severity Distribution ── */}
      <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
          Overall Severity Distribution
        </p>
        <SeverityBar
          distribution={
            overallSummary?.severityDistribution || {
              Low: 0,
              Medium: 0,
              High: 0,
              Critical: 0,
            }
          }
          total={overallSummary?.totalRecords || 0}
        />
      </div>

      {/* ── Global Recommendations ── */}
      {globalRecommendations.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <Target className="w-3 h-3" /> Global Recommendations
            </p>
            <ChevronRight
              className={cn(
                "w-3 h-3 text-gray-400 transition-transform",
                showRecommendations && "rotate-90"
              )}
            />
          </button>
          <AnimatePresence>
            {showRecommendations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  {globalRecommendations.slice(0, 5).map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
