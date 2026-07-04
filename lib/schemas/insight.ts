
import { z } from 'zod';

export const Severity = z.enum(['TOP RISK', 'HIGH RISK', 'MEDIUM', 'LOW']);
export type Severity = z.infer<typeof Severity>;

export const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 0,
  MEDIUM: 1,
  'HIGH RISK': 2,
  'TOP RISK': 3,
};

export const ExecHeadline = z.object({
  sentence: z.string(),
  signal: z.enum(['ok', 'watch', 'risk', 'opportunity']),
  confidence: z.number().min(0).max(1),
});

export const ForecastPoint = z.object({
  period: z.string(),
  yhat: z.number(),
  yhat_lower: z.number(),
  yhat_upper: z.number(),
});

export const ForecastSeries = z.object({
  series_key: z.string(),
  history_points: z.number().int().nonnegative(),
  coverage: z.number().min(0).max(1),
  points: z.array(ForecastPoint),
});

export const AnomalyPoint = z.object({
  period: z.string(),
  actual: z.number(),
  expected: z.number(),
  residual: z.number(),
  z_score: z.number(),
  is_anomaly: z.boolean(),
});

export const RCADriver = z.object({
  feature: z.string(),
  shap_value: z.number(),
  direction: z.enum(['increases', 'decreases']),
  contribution_pct: z.number().min(0).max(100),
});

export const CaseInsightResponse = z.object({
  headline: ExecHeadline,
  as_of: z.string(),
  records_basis: z.number().int().nonnegative(),
  severity_predicted: Severity.nullable().optional(),
  severity_confidence: z.number().min(0).max(1).nullable().optional(),
  forecast: ForecastSeries.nullable().optional(),
  anomaly: AnomalyPoint.nullable().optional(),
  rca_top_drivers: z.array(RCADriver).default([]),
  similar_cases: z.array(z.record(z.string(), z.unknown())).default([]),
  warnings: z.array(z.string()).default([]),
  model_versions: z.record(z.string(), z.string()).default({}),
});

export type CaseInsightResponse = z.infer<typeof CaseInsightResponse>;
export type ForecastSeries = z.infer<typeof ForecastSeries>;
export type AnomalyPoint = z.infer<typeof AnomalyPoint>;
export type RCADriver = z.infer<typeof RCADriver>;
