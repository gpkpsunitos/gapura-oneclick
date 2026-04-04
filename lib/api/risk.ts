/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API client untuk mengambil data risk summary dan analitik risiko
 * Menyediakan fungsi untuk mengambil overview risiko dan detail per entitas
 */

import type { RiskOverview, EntityRiskDetail } from '@/components/dashboard/ai-summary/types';

/**
 * Interface untuk response risk summary
 * Menyimpan ringkasan lengkap data risiko dari berbagai perspektif
 */
export interface RiskSummaryResponse {
  /** Timestamp terakhir kali data diperbarui */
  last_updated: string;
  /** Ringkasan overview risiko secara keseluruhan */
  overview: RiskOverview;
  /** Distribusi risiko per maskapai/airline */
  airline_risks: Record<string, number>;
  /** Distribusi risiko per cabang/branch */
  branch_risks: Record<string, number>;
  /** Distribusi risiko per hub */
  hub_risks: Record<string, number>;
  /** Array nama maskapai dengan risiko tertinggi */
  top_risky_airlines: string[];
  /** Array nama cabang dengan risiko tertinggi */
  top_risky_branches: string[];
  /** Array nama hub dengan risiko tertinggi */
  top_risky_hubs: string[];
  /** Detail risiko per maskapai */
  airline_details: EntityRiskDetail[];
  /** Detail risiko per cabang */
  branch_details: EntityRiskDetail[];
  /** Detail risiko per hub */
  hub_details: EntityRiskDetail[];
  /** Total jumlah maskapai yang dipantau */
  total_airlines: number;
  /** Total jumlah cabang yang dipantau */
  total_branches: number;
  /** Total jumlah hub yang dipantau */
  total_hubs: number;
}

/**
 * Mengambil ringkasan data risiko dari API
 * Fungsi ini mengambil overview risiko lengkap beserta detail per entitas
 * 
 * @returns Promise yang resolve dengan RiskSummaryResponse
 * @throws Error jika request gagal
 * 
 * @example
 * ```typescript
 * const riskData = await fetchRiskSummary();
 * console.log('Total high risk items:', riskData.overview.high_risk_count);
 * console.log('Top risky airline:', riskData.top_risky_airlines[0]);
 * ```
 */
// Complexity: Time O(1) | Space O(1) — single fetch
export async function fetchRiskSummary(): Promise<RiskSummaryResponse> {
  const response = await fetch('/api/ai/risk/summary?esklasi_regex=', {
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
