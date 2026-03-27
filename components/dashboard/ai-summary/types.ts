// Types for AI Summary Dashboard - matches action-summary.json structure

export interface TopAction {
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  rationale: string;
  confidence: number;
}

export interface CategoryData {
  count: number;
  severityDistribution: {
    Low: number;
    Medium: number;
    High: number;
    Critical?: number;
  };
  topActions: TopAction[];
  avgResolutionDays: number;
  topHubs: string[];
  topAirlines: string[];
  effectivenessScore: number;
  openCount: number;
  closedCount: number;
  highPriorityCount: number;
}

export interface OverallSummary {
  totalRecords: number;
  openCount: number;
  closedCount: number;
  highPriorityCount: number;
  severityDistribution: {
    Low: number;
    Medium: number;
    High: number;
    Critical?: number;
  };
  avgResolutionDays: number;
  categoriesCount: number;
  avgDaysSource?: string;
}

export interface TopCategoryByCount {
  category: string;
  count: number;
  highPriority: number;
}

export interface TopCategoryByRisk {
  category: string;
  riskScore: number;
  count: number;
}

export interface GlobalRecommendation {
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  rationale: string;
  confidence: number;
}

export interface ActionSummaryResponse {
  status: string;
  totalRecords: number;
  categories: Record<string, CategoryData>;
  overallSummary: OverallSummary;
  topCategoriesByCount: TopCategoryByCount[];
  topCategoriesByRisk: TopCategoryByRisk[];
  globalRecommendations: GlobalRecommendation[];
}

// Risk Summary Types

export interface RiskOverview {
  total_issues: number;
  total_severity_distribution: Record<string, number>;
  avg_risk_score_airlines: number;
  avg_risk_score_branches: number;
  avg_risk_score_hubs: number;
  risk_level_thresholds: Record<string, number>;
}

export interface EntityRiskDetail {
  name: string;
  risk_score: number;
  risk_level: string;
  total_issues: number;
  severity_distribution: Record<string, number>;
  issue_categories: string[];
  category_count: number;
  frequency_score: number;
  severity_score: number;
  data_quality_score: number;
  recommendations: string[];
}

export interface RiskSummaryData {
  overview?: RiskOverview;
  airline_risks?: Record<string, number>;
  branch_risks?: Record<string, number>;
  hub_risks?: Record<string, number>;
  top_risky_airlines?: string[];
  top_risky_branches?: string[];
  top_risky_hubs?: string[];
  airline_details?: EntityRiskDetail[];
  branch_details?: EntityRiskDetail[];
  hub_details?: EntityRiskDetail[];
  total_airlines?: number;
  total_branches?: number;
  total_hubs?: number;
  last_updated?: string;
}
