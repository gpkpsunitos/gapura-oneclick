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

export interface ClassifyResult {
  status: string;
  label: string | null;
  confidence: number | null;
  top_candidates?: { label: string; confidence: number }[];
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

  /** Classify report type: Irregularity / Complaint / Compliment / Occurrence / Accident
   *  (~71% CV acc from the narrative; the old ~98% figure was target leakage). */
  classifyCategory(text: string): Promise<{ status: string; category: ClassifyResult }> {
    return post("/classify/category", { text });
  },

  classifySubcategory(text: string): Promise<{ status: string; subcategory: ClassifyResult }> {
    return post("/classify/subcategory", { text });
  },

  classifyRootCause(text: string): Promise<{ status: string; root_cause: ClassifyResult }> {
    return post("/classify/root-cause", { text });
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
