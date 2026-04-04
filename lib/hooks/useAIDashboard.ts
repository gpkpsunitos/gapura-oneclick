/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi React hook untuk pembuatan dashboard berbasis AI,
 * termasuk generate dari prompt dan generate khusus Customer Feedback
 */

'use client';

import { useState } from 'react';
import type { DashboardDefinition } from '@/types/builder';
import { fetchWithDemo } from '@/lib/utils';

/**
 * Hook untuk pembuatan dashboard berbasis AI
 * 
 * @returns Object berisi fungsi dan state untuk generate AI dashboard
 */
export function useAIDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate dashboard dari prompt AI
   * 
   * @param prompt - Prompt teks untuk generate dashboard
   * @returns Promise berisi definisi dashboard atau null jika gagal
   */
  async function generate(prompt: string): Promise<DashboardDefinition | null> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithDemo('/api/dashboards/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.details
          ? `${data.error}: ${Array.isArray(data.details) ? data.details.join(', ') : data.details}`
          : data.error || 'Gagal membuat dashboard';
        setError(msg);
        return null;
      }

      return data.dashboard as DashboardDefinition;
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Generate dashboard khusus Customer Feedback dengan filter tanggal
   * 
   * @param dateFrom - Tanggal awal (format YYYY-MM-DD)
   * @param dateTo - Tanggal akhir (format YYYY-MM-DD)
   * @returns Promise berisi definisi dashboard atau null jika gagal
   */
  async function generateCustomerFeedback(dateFrom: string, dateTo: string): Promise<DashboardDefinition | null> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithDemo('/api/dashboards/customer-feedback-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal membuat dashboard Customer Feedback');
        return null;
      }

      return data.dashboard as DashboardDefinition;
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Membersihkan pesan error
   */
  function clearError() {
    setError(null);
  }

  return { generate, generateCustomerFeedback, loading, error, clearError };
}
