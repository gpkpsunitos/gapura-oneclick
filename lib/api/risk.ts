
import type { RiskOverview, EntityRiskDetail } from '@/components/dashboard/ai-summary/types';

export interface RiskSummaryResponse {
  last_updated: string;
  overview: RiskOverview;
  airline_risks: Record<string, number>;
  branch_risks: Record<string, number>;
  hub_risks: Record<string, number>;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  top_risky_hubs: string[];
  airline_details: EntityRiskDetail[];
  branch_details: EntityRiskDetail[];
  hub_details: EntityRiskDetail[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
}

// Complexity: Time O(1) | Space O(1) — single fetch
export async function fetchRiskSummary(): Promise<RiskSummaryResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/ai/risk/summary?esklasi_regex=`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch risk summary');
  }

  return response.json();
}
