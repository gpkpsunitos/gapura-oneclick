"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RiskSummaryCard } from "./RiskSummaryCard";
import { ActionSummaryCard } from "./ActionSummaryCard";
import type { ActionSummaryResponse, RiskSummaryData } from "./types";

interface AISummaryKPICardsProps {
  refreshInterval?: number;
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
  hideActionIntelligence?: boolean;
}

export function AISummaryKPICards({
  refreshInterval = 300000,
  className,
  showHeader = true,
  compact = false,
  hideActionIntelligence = false,
}: AISummaryKPICardsProps) {
  const [riskData, setRiskData] = useState<RiskSummaryData | null>(null);
  const [actionData, setActionData] = useState<ActionSummaryResponse | null>(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(true);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const mountRef = useRef(true);

  const fetchRiskSummary = useCallback(async () => {
    try {
      setRiskError(null);
      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const res = await fetch(`/api/ai/risk/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
      if (!res.ok) throw new Error("Failed to fetch risk summary");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (mountRef.current) setRiskData(data);
    } catch (err) {
      console.error("Risk summary error:", err);
      if (mountRef.current) {
        setRiskError(err instanceof Error ? err.message : "Failed to load risk summary");
      }
    } finally {
      if (mountRef.current) setRiskLoading(false);
    }
  }, []);

  const fetchActionSummary = useCallback(async () => {
    try {
      setActionError(null);
      const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
      const res = await fetch(`/api/ai/action-summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
      if (!res.ok) throw new Error("Failed to fetch action summary");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (mountRef.current) setActionData(data);
    } catch (err) {
      console.error("Action summary error:", err);
      if (mountRef.current) {
        setActionError(err instanceof Error ? err.message : "Failed to load action summary");
      }
    } finally {
      if (mountRef.current) setActionLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setRiskLoading(true);
    setActionLoading(true);
    await Promise.all([fetchRiskSummary(), fetchActionSummary()]);
    if (mountRef.current) setRefreshing(false);
  }, [fetchRiskSummary, fetchActionSummary]);

  useEffect(() => {
    mountRef.current = true;
    refreshAll();
    return () => { mountRef.current = false; };
  }, [refreshAll]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshAll();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshAll]);

  useEffect(() => {
    return () => { mountRef.current = false; };
  }, []);

  const isLoading = riskLoading || actionLoading;
  const hasError = riskError || actionError;


  // Derived counts for explanation banner
  const airlinesCount = riskData?.total_airlines || 0;
  const branchesCount = riskData?.total_branches || 0;
  const hubsCount = riskData?.total_hubs || 0;
  const entitiesTotal = airlinesCount + branchesCount + hubsCount;
  const recordsTotal = actionData?.overallSummary?.totalRecords || 0;

  return (
    <div className={cn("relative", className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  AI Command Center
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Real-time intelligence dashboard
                </p>
              </div>
            </motion.div>

            <div className="flex items-center gap-2">

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
              </button>

              <button
                onClick={refreshAll}
                disabled={refreshing || isLoading}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600",
                  "text-white shadow-md shadow-teal-500/20",
                  refreshing && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                <span>{refreshing ? "Syncing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        <AnimatePresence>
          {hasError && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 mb-4"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs font-medium">
                Some AI services are temporarily unavailable. Displaying partial data.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 px-3 py-2 mb-3 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="text-[12px] text-gray-600 leading-snug">
                  <p><span className="font-semibold text-gray-700">Risk Intelligence</span> = hitung entitas (Maskapai/Cabang/Hub) per level risiko.</p>
                  {!hideActionIntelligence && (
                    <p><span className="font-semibold text-gray-700">Action Intelligence</span> = hitung per laporan (Total, Open/Closed, Severity).</p>
                  )}
                  {(airlinesCount + branchesCount + hubsCount > 0 || recordsTotal > 0) && (
                    <p className="text-[11px] text-gray-600 mt-1">
                      Contoh saat ini: entitas {airlinesCount} + {branchesCount} + {hubsCount} = <span className="font-semibold">{entitiesTotal}</span> • laporan <span className="font-semibold">{recordsTotal.toLocaleString("id-ID")}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">Kenapa beda? Level agregasi berbeda (entitas vs laporan). Baris tanpa nama dihitung “Unknown”; variasi penulisan nama bisa terhitung terpisah.</p>
                </div>
              </div>
              <div
                className={cn(
                  "grid gap-4",
                  (compact || hideActionIntelligence) ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
                )}
              >
                {/* Risk Summary Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm"
                >
                  <RiskSummaryCard
                    data={riskData}
                    actionData={actionData}
                    loading={riskLoading}
                    error={riskError}
                  />
                </motion.div>

                {/* Action Summary Card */}
                {!hideActionIntelligence && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm"
                  >
                    <ActionSummaryCard
                      data={actionData}
                      loading={actionLoading}
                      error={actionError}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
