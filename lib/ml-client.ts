/**
 * Typed client for the Gapura ML Service (Hugging Face Spaces).
 * Wraps the existing HuggingFaceClient with strongly-typed methods
 * for each analytics endpoint.
 *
 * Base URL is read from ML_SERVICE_URL env (falls back to AI_SERVICE_URL).
 */
import { getHfClient } from "./hf-client";

const ML_BASE =
  process.env.ML_SERVICE_URL ||
  process.env.AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  "";

function client() {
  return getHfClient({ baseUrl: ML_BASE });
}

/**
 * Headers for routes that call the ML service with raw fetch() instead of
 * the shared client. Includes X-API-Key when the service is locked down.
 * Server-side only — never expose ML_SERVICE_API_KEY to the browser.
 */
export function mlServiceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = process.env.ML_SERVICE_API_KEY || process.env.AI_SERVICE_API_KEY || "";
  return key ? { ...extra, "X-API-Key": key } : extra;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForecastPoint {
  date: string;
  predicted_count: number;
  /** 80% interval bounds from holdout residual. Counts avg ~2/day, so the band is wide. */
  lower?: number;
  upper?: number;
}

export interface ForecastResult {
  status: string;
  fallback?: boolean;
  forecast?: ForecastPoint[];
  trained_through?: string;
  /** Label for the prediction band, e.g. "80%". */
  interval?: string;
  resid_std?: number;
  daily_mean?: number;
}

export interface SeasonalityResult {
  status: string;
  fallback?: boolean;
  dates?: string[];
  observed?: number[];
  trend?: number[];
  seasonal?: number[];
  residual?: number[];
  peak_season_date?: string;
}

/**
 * Classifier statuses from the service:
 *  - "ok"                → confidence ≥ 0.60 (high)
 *  - "medium_confidence" → 0.35 ≤ confidence < 0.60
 *  - "low_confidence"    → label is "UNCERTAIN"; use top_candidates
 *  - "empty_input" | "model_not_trained"
 * `reason: "input_dissimilar_to_training_data"` flags out-of-distribution text.
 */
export interface ClassifyResult {
  status: string;
  label: string | null;
  confidence: number | null;
  top_candidates?: { label: string; confidence: number }[];
  nn_similarity?: number;
  reason?: string;
}

/** Optional report context — sending these measurably improves accuracy. */
export interface ClassifyContext {
  category?: string;
  airline?: string;
  branch?: string;
  area?: string;
  report_type?: string;
}

export interface AnalyzeResult {
  category: ClassifyResult;
  subcategory: ClassifyResult;
  root_cause: ClassifyResult;
  forecast: (Omit<ForecastResult, "status"> & { status?: string }) | null;
  risk_rankings: RiskScoreResult["rankings"] | null;
}

export interface TrendEntry {
  entity: string;
  direction: "rising" | "falling" | "stable";
  slope_per_week: number;
  percent_change: number;
  half_period_change?: number;
  p_value: number;
  r_squared?: number;
  recent_count: number;
  baseline_count: number;
  recent_avg_week: number;
  data_weeks: number;
  statistically_significant?: boolean;
  practically_significant?: boolean;
  notable?: boolean;
}

export interface TrendsResult {
  status: string;
  dimension: string;
  window_weeks: number;
  analysis_from?: string;
  analysis_to?: string;
  rising: TrendEntry[];
  falling: TrendEntry[];
  stable: TrendEntry[];
  total_entities?: number;
}

export interface DimensionForecastEntry {
  entity: string;
  forecast: { week: string; predicted_count: number }[];
  predicted_total: number;
  current_avg_week: number;
  trend_direction: "rising" | "falling" | "stable";
  method: string;
  history_weeks: number;
}

export interface DimensionForecastResult {
  status: string;
  dimension: string;
  n_weeks: number;
  from_week?: string;
  to_week?: string;
  forecasts?: DimensionForecastEntry[];
}

export interface RiskEntry {
  incident_count: number;
  open_rate: number;
  recency_rate: number;
  risk_score: number;
  rank: number;
  [key: string]: string | number; // dynamic group key (airline, branch, area)
}

export interface RiskScoreResult {
  status: string;
  fallback?: boolean;
  rankings?: {
    airline?: RiskEntry[];
    branch?: RiskEntry[];
    area?: RiskEntry[];
  };
}

export interface SchemaMapping {
  date?: string;
  description?: string;
  subcategory?: string;
  root_cause?: string;
  airline?: string;
  branch?: string;
  status?: string;
  category?: string;
  area?: string;
  [key: string]: string | undefined;
}

export interface MLHealthResult {
  status: string;
  schema_detected: SchemaMapping | null;
  last_retrain: string | null;
  row_count: number | null;
  models: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post<T>(path: string, body?: unknown): Promise<T> {
  return client().fetchJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function get<T>(path: string): Promise<T> {
  return client().fetchJson<T>(path);
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export const mlClient = {
  health(): Promise<MLHealthResult> {
    return get("/health");
  },

  forecast(nDays = 30): Promise<ForecastResult> {
    return post("/forecast", { n_days: nDays });
  },

  seasonality(): Promise<SeasonalityResult> {
    return post("/seasonality");
  },

  /** Classify report type: Irregularity / Complaint / Compliment / Occurrence
   *  (~68% CV acc from the narrative; the old ~98% figure was target leakage). */
  classifyCategory(text: string, ctx: ClassifyContext = {}): Promise<{ status: string; category: ClassifyResult }> {
    return post("/classify/category", { text, ...ctx });
  },

  classifySubcategory(text: string, ctx: ClassifyContext = {}): Promise<{ status: string; subcategory: ClassifyResult }> {
    return post("/classify/subcategory", { text, ...ctx });
  },

  classifyRootCause(text: string, ctx: ClassifyContext = {}): Promise<{ status: string; root_cause: ClassifyResult }> {
    return post("/classify/root-cause", { text, ...ctx });
  },

  /** All classifiers + 14-day forecast + risk rankings for one report text. */
  analyze(text: string, ctx: ClassifyContext = {}): Promise<AnalyzeResult> {
    return post("/analyze", { text, ...ctx });
  },

  /** Statistically significant rising/falling incident trends per entity. */
  trends(
    dimension: "airline" | "branch" | "area" | "subcategory" | "category" = "branch",
    windowWeeks = 12,
  ): Promise<TrendsResult> {
    return post("/analytics/trends", { dimension, window_weeks: windowWeeks });
  },

  /** Per-entity weekly volume forecast, highest predicted volume first. */
  forecastByDimension(
    dimension: "airline" | "branch" | "area" | "subcategory" | "category" = "subcategory",
    nWeeks = 4,
  ): Promise<DimensionForecastResult> {
    return post("/analytics/forecast/by-dimension", { dimension, n_weeks: nWeeks });
  },

  riskScore(): Promise<RiskScoreResult> {
    return post("/risk-score");
  },

  /** Push the current column mapping so the ML service uses it on next retrain. */
  pushSchema(mapping: SchemaMapping): Promise<{ status: string; mapping: SchemaMapping }> {
    return post("/schema", { mapping });
  },

  getSchema(): Promise<{ source: string; mapping: SchemaMapping }> {
    return get("/schema");
  },

  /** Trigger an immediate retrain cycle (may be slow). */
  triggerRetrain(forceDetect = false): Promise<{ status: string; metrics: unknown }> {
    return post("/retrain", { force_detect: forceDetect });
  },
};
