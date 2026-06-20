"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Plane,
  MapPin,
  TrendingUp,
  Shield,
  Activity,
  Info,
  Flame,
  Hash,
  BarChart3,
  ChevronRight,
  Lightbulb,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  RiskSummaryData,
  EntityRiskDetail,
  ActionSummaryResponse,
  CategoryData,
} from "./types";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface RiskSummaryCardProps {
  data: RiskSummaryData | null;
  actionData?: ActionSummaryResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;

const LEVEL_STYLE: Record<
  string,
  {
    card: string;
    border: string;
    iconBg: string;
    numText: string;
    labelText: string;
    barFill: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  Critical: {
    card: "from-red-50 to-rose-50",
    border: "border-red-100",
    iconBg: "bg-red-500",
    numText: "text-red-700",
    labelText: "text-red-500",
    barFill: "from-red-500 to-rose-500",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
  },
  High: {
    card: "from-orange-50 to-amber-50",
    border: "border-orange-100",
    iconBg: "bg-orange-500",
    numText: "text-orange-700",
    labelText: "text-orange-500",
    barFill: "from-orange-500 to-amber-500",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
  },
  Medium: {
    card: "from-amber-50 to-yellow-50",
    border: "border-amber-100",
    iconBg: "bg-amber-500",
    numText: "text-amber-700",
    labelText: "text-amber-500",
    barFill: "from-amber-400 to-yellow-400",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
  },
  Low: {
    card: "from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-500",
    numText: "text-emerald-700",
    labelText: "text-emerald-500",
    barFill: "from-emerald-400 to-teal-400",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
};

const LEVEL_ICON: Record<string, React.ElementType> = {
  Critical: AlertTriangle,
  High: TrendingUp,
  Medium: Activity,
  Low: Shield,
};

// Complexity: Time O(1) | Space O(1)
function getRiskScoreColor(score: number): string {
  if (score >= 70) return "text-red-600";
  if (score >= 50) return "text-orange-600";
  if (score >= 30) return "text-amber-600";
  return "text-emerald-600";
}

// Complexity: Time O(1) | Space O(1)
function getRiskBarGradient(score: number): string {
  if (score >= 70) return "from-red-500 to-rose-500";
  if (score >= 50) return "from-orange-500 to-amber-500";
  if (score >= 30) return "from-amber-400 to-yellow-400";
  return "from-emerald-400 to-teal-400";
}

// Complexity: Time O(n) | Space O(n)
function filterUnknown(entities: EntityRiskDetail[]): EntityRiskDetail[] {
  return entities.filter(
    (e) =>
      e.name !== "Unknown" &&
      e.name !== "unknown" &&
      e.name !== "Non Airline Case"
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/50 p-3 animate-pulse">
      <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-12 bg-gray-200 rounded" />
    </div>
  );
}

// Complexity: Time O(k) k = categories.length (bounded ≤5) | Space O(1)
function EntityRiskRow({
  entity,
  rank,
}: {
  entity: EntityRiskDetail;
  rank: number;
}) {
  const rankStyles = [
    "bg-red-100 text-red-700 border-red-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-yellow-50 text-yellow-700 border-yellow-200",
    "bg-gray-100 text-gray-600 border-gray-200",
  ];

  const style = LEVEL_STYLE[entity.risk_level] || LEVEL_STYLE.Low;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * rank }}
      className="group p-2.5 rounded-lg border border-gray-100/80 bg-white/70 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-md text-[9px] font-black flex items-center justify-center border",
            rankStyles[rank] || rankStyles[4]
          )}
        >
          {rank + 1}
        </span>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-800 truncate">
              {entity.name}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={cn(
                  "text-[11px] font-black tabular-nums",
                  getRiskScoreColor(entity.risk_score)
                )}
              >
                {entity.risk_score.toFixed(1)}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider",
                  style.badgeBg,
                  style.badgeText
                )}
              >
                {entity.risk_level}
              </span>
            </div>
          </div>

          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(entity.risk_score, 100)}%` }}
              transition={{ duration: 0.4, delay: 0.05 * rank }}
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                getRiskBarGradient(entity.risk_score)
              )}
            />
          </div>

          <div className="flex items-center gap-3 text-[9px] text-gray-400">
            <span className="flex items-center gap-0.5 tabular-nums">
              <Hash className="w-2.5 h-2.5" />
              {entity.total_issues} issues
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              <Flame className="w-2.5 h-2.5" />
              freq {entity.frequency_score.toFixed(2)}
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              <BarChart3 className="w-2.5 h-2.5" />
              sev {entity.severity_score.toFixed(2)}
            </span>
          </div>

          {entity.issue_categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entity.issue_categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="px-1.5 py-0.5 rounded-full bg-gray-50 text-[8px] font-medium text-gray-500 border border-gray-100"
                >
                  {cat}
                </span>
              ))}
              {entity.issue_categories.length > 3 && (
                <span className="px-1 py-0.5 text-[8px] text-gray-400">
                  +{entity.issue_categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TopRiskSection({
  title,
  icon: Icon,
  entities,
  iconColor,
  bgGradient,
  borderColor,
}: {
  title: string;
  icon: React.ElementType;
  entities: EntityRiskDetail[];
  iconColor: string;
  bgGradient: string;
  borderColor: string;
}) {
  const filtered = filterUnknown(entities);
  if (filtered.length === 0) return null;

  return (
    <div className={cn("p-3 rounded-xl border", bgGradient, borderColor)}>
      <p
        className={cn(
          "text-[10px] font-bold uppercase mb-2.5 flex items-center gap-1.5",
          iconColor
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {title}
      </p>
      <div className="space-y-1.5">
        {filtered.slice(0, 5).map((entity, i) => (
          <EntityRiskRow key={entity.name} entity={entity} rank={i} />
        ))}
      </div>
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

function CategoryRow({
  name,
  data,
  isExpanded,
  onToggle,
}: {
  name: string;
  data: CategoryData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const resolutionRate =
    data.count > 0 ? ((data.closedCount / data.count) * 100).toFixed(0) : 0;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-gradient-to-r from-gray-50/50 to-white/50">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
            {data.count}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{name}</p>
            <p className="text-[10px] text-gray-500">
              {data.openCount} open · {data.closedCount} closed ·{" "}
              {data.avgResolutionDays.toFixed(1)}d avg
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-600">
              {resolutionRate}%
            </p>
            <p className="text-[10px] text-gray-400">resolved</p>
          </div>
          <ChevronRight
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
                  Severity
                </p>
                <SeverityBar
                  distribution={data.severityDistribution}
                  total={data.count}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {data.topAirlines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                      <Plane className="w-3 h-3" /> Top Airlines
                    </p>
                    <div className="space-y-1">
                      {data.topAirlines.slice(0, 3).map((airline, i) => (
                        <span
                          key={i}
                          className="block text-xs text-gray-600 truncate"
                        >
                          {airline}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.topHubs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Top Hubs
                    </p>
                    <div className="space-y-1">
                      {data.topHubs.slice(0, 3).map((hub, i) => (
                        <span
                          key={i}
                          className="block text-xs text-gray-600"
                        >
                          {hub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {data.topActions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Recommended Actions
                  </p>
                  <div className="space-y-1.5">
                    {data.topActions.slice(0, 3).map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0",
                            action.priority === "HIGH"
                              ? "bg-red-100 text-red-700"
                              : action.priority === "LOW"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {action.priority}
                        </span>
                        <span className="text-gray-600 leading-tight">
                          {action.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-500">
                  Effectiveness Score
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                      style={{
                        width: `${(data.effectivenessScore || 0) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-orange-600">
                    {((data.effectivenessScore || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RiskSummaryCard({
  data,
  actionData,
  loading,
  error,
  className,
}: RiskSummaryCardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
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
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Complexity: Time O(1) | Space O(1)
  const entityCounts: Record<string, number> = {};
  for (const level of SEVERITY_LEVELS) {
    entityCounts[level] =
      (data.airline_risks?.[level] || 0) +
      (data.branch_risks?.[level] || 0) +
      (data.hub_risks?.[level] || 0);
  }
  const maxEntityCount = Math.max(...Object.values(entityCounts));
  const entitiesTotal =
    (data.total_airlines || 0) +
    (data.total_branches || 0) +
    (data.total_hubs || 0);

  const overview = data.overview;
  const issueSeverity = overview?.total_severity_distribution;
  const maxIssueSeverity = issueSeverity
    ? Math.max(...Object.values(issueSeverity))
    : 0;

  const topAirlines = data.airline_details
    ? filterUnknown(data.airline_details).slice(0, 5)
    : [];
  const topBranches = data.branch_details
    ? filterUnknown(data.branch_details).slice(0, 5)
    : [];
  const topHubs = data.hub_details
    ? filterUnknown(data.hub_details).slice(0, 5)
    : [];

  const hasDetailedAirlines = topAirlines.length > 0;
  const hasDetailedBranches = topBranches.length > 0;
  const hasDetailedHubs = topHubs.length > 0;

  // Action data: categories + risk scores (moved from ActionSummaryCard)
  const categories = actionData?.categories || {};
  const topCategoriesByRisk = actionData?.topCategoriesByRisk
    ?.filter((c) => c.category !== "Unknown")
    ?.slice(0, 5) || [];
  const categoryEntries = Object.entries(categories).filter(
    ([name]) => name !== "Unknown"
  );
  const displayedCategories = showAllCategories
    ? categoryEntries
    : categoryEntries.slice(0, 3);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Risk Intelligence
            </h3>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-gray-500">
                Cross-domain risk analysis
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Risk Intelligence explanation"
                      className="ml-1 inline-flex items-center justify-center rounded-full w-4 h-4 bg-gray-100 text-gray-500 hover:bg-gray-200"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs text-xs leading-relaxed"
                  >
                    <p>
                      Hitung per entitas (Maskapai/Cabang/Hub) yang masuk ke tiap
                      level risiko.
                    </p>
                    <p className="mt-1">
                      Angka di kartu = jumlah entitas, bukan jumlah laporan.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
            Per Entitas
          </span>
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
            {entitiesTotal} Entitas
          </span>
          {data.last_updated && (
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
              {new Date(data.last_updated).toLocaleDateString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {/* ── Domain Chips ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase">
          Entitas per level risiko
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold flex items-center gap-1">
            <Plane className="w-3 h-3" />
            {data.total_airlines || 0} Airlines
          </span>
          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {data.total_branches || 0} Branches
          </span>
          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.total_hubs || 0} Hubs
          </span>
        </div>
      </div>


      {/* ── Severity Cards (Entity Counts) ── */}
      <div className="grid grid-cols-4 gap-2">
        {SEVERITY_LEVELS.map((level, i) => {
          const style = LEVEL_STYLE[level];
          const Icon = LEVEL_ICON[level];
          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className={cn(
                "p-3 rounded-xl bg-gradient-to-br border text-center",
                style.card,
                style.border
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1.5",
                  style.iconBg
                )}
              >
                <Icon className="w-3 h-3 text-white" />
              </div>
              <p className={cn("text-lg font-black", style.numText)}>
                {entityCounts[level]}
              </p>
              <p
                className={cn(
                  "text-[9px] font-bold uppercase",
                  style.labelText
                )}
              >
                {level}
              </p>
            </motion.div>
          );
        })}
      </div>


      {/* ── Top Risk Sections ── */}
      {(hasDetailedAirlines || hasDetailedBranches) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TopRiskSection
            title="Top Risk Airlines"
            icon={Plane}
            entities={topAirlines}
            iconColor="text-blue-600"
            bgGradient="bg-gradient-to-br from-blue-50/50 to-cyan-50/30"
            borderColor="border-blue-100/50"
          />
          <TopRiskSection
            title="Top Risk Branches"
            icon={Building2}
            entities={topBranches}
            iconColor="text-violet-600"
            bgGradient="bg-gradient-to-br from-violet-50/50 to-purple-50/30"
            borderColor="border-violet-100/50"
          />
        </div>
      )}

      {/* Fallback */}
      {!hasDetailedAirlines && !hasDetailedBranches && (
        <div className="grid grid-cols-2 gap-3">
          {data.top_risky_airlines && data.top_risky_airlines.length > 0 && (
            <FallbackTopList
              title="Top Risk Airlines"
              icon={Plane}
              items={data.top_risky_airlines.filter(
                (n) => n !== "Unknown" && n !== "Non Airline Case"
              )}
              iconColor="text-blue-600"
              bgGradient="bg-gradient-to-br from-blue-50/50 to-cyan-50/50"
              borderColor="border-blue-100/50"
            />
          )}
          {data.top_risky_branches && data.top_risky_branches.length > 0 && (
            <FallbackTopList
              title="Top Risk Branches"
              icon={Building2}
              items={data.top_risky_branches.filter((n) => n !== "Unknown")}
              iconColor="text-violet-600"
              bgGradient="bg-gradient-to-br from-violet-50/50 to-purple-50/50"
              borderColor="border-violet-100/50"
            />
          )}
        </div>
      )}

      {hasDetailedHubs && (
        <TopRiskSection
          title="Top Risk Hubs"
          icon={MapPin}
          entities={topHubs}
          iconColor="text-teal-600"
          bgGradient="bg-gradient-to-br from-teal-50/50 to-emerald-50/30"
          borderColor="border-teal-100/50"
        />
      )}

      {/* ── Risk Score by Category (from Action Data) ── */}
      {topCategoriesByRisk.length > 0 && (() => {
        const maxRisk = Math.max(...topCategoriesByRisk.map(c => c.riskScore));
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Risk Score by Category
            </p>
            <div className="space-y-1.5">
              {topCategoriesByRisk.map((cat, i) => {
                const barPct = maxRisk > 0 ? (cat.riskScore / maxRisk) * 100 : 0;
                const displayPct = cat.riskScore / 10;
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-700 w-28 truncate">
                      {cat.category}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          displayPct > 66
                            ? "bg-gradient-to-r from-red-500 to-orange-500"
                            : displayPct > 33
                              ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500"
                        )}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-12 text-right tabular-nums">
                      {displayPct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Categories Breakdown (from Action Data) ── */}
      {categoryEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <FolderOpen className="w-3 h-3" /> Categories Breakdown
            </p>
            {categoryEntries.length > 3 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-[10px] font-medium text-rose-600 hover:text-rose-700"
              >
                {showAllCategories
                  ? "Show less"
                  : `+${categoryEntries.length - 3} more`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {displayedCategories.map(([name, catData]) => (
              <CategoryRow
                key={name}
                name={name}
                data={catData}
                isExpanded={expandedCategory === name}
                onToggle={() =>
                  setExpandedCategory(
                    expandedCategory === name ? null : name
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FallbackTopList({
  title,
  icon: Icon,
  items,
  iconColor,
  bgGradient,
  borderColor,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  iconColor: string;
  bgGradient: string;
  borderColor: string;
}) {
  const rankStyles = [
    "bg-red-100 text-red-600",
    "bg-orange-100 text-orange-600",
    "bg-amber-100 text-amber-600",
  ];

  return (
    <div className={cn("p-3 rounded-xl border", bgGradient, borderColor)}>
      <p
        className={cn(
          "text-[10px] font-bold uppercase mb-2 flex items-center gap-1",
          iconColor
        )}
      >
        <Icon className="w-3 h-3" />
        {title}
      </p>
      <div className="space-y-1.5">
        {items.slice(0, 3).map((name, i) => (
          <div key={name} className="flex items-center gap-2">
            <span
              className={cn(
                "w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center",
                rankStyles[i] || "bg-gray-100 text-gray-600"
              )}
            >
              {i + 1}
            </span>
            <span className="text-xs text-gray-700 truncate">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
