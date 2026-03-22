// types/entity-analytics.ts

export interface AirlineStats {
  name: string;
  count: number;
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  topRoutes: string[];
  avgPredictionDays: number;
  lastIncident: Date | null;
  reports: any[];
}

export interface RouteStats {
  route: string;
  from: string;
  to: string;
  count: number;
  criticalRate: number;
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  primaryIssueType: string;
  lastIncident: Date | null;
  reports: any[];
}

export interface HubStats {
  name: string;
  count: number;
  percentage: number;
  severityBreakdown: Record<string, number>;
  topIssueCategory: string;
  topAirlines: string[];
  reports: any[];
}

export interface FlightStats {
  flightNumber: string;
  airline: string;
  count: number;
  avgPredictionDays: number;
  reports: any[];
}

export interface EntityStats {
  airlines: Map<string, AirlineStats>;
  routes: Map<string, RouteStats>;
  hubs: Map<string, HubStats>;
  flightNumbers: Map<string, FlightStats>;
  allReports: any[];
  summary: {
    totalEntities: number;
    totalReports: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgPredictionDays: number;
  };
}

export interface FilterState {
  airlines: string[];
  routes: string[];
  hubs: string[];
  severities: ('Critical' | 'High' | 'Medium' | 'Low')[];
  dateRange: { start: Date; end: Date } | null;
}

export interface SelectedEntity {
  type: 'airline' | 'route' | 'hub' | 'flight';
  name: string;
  stats: AirlineStats | RouteStats | HubStats | FlightStats;
}
