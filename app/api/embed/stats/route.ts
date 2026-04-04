/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengambil statistik laporan
 * Menyediakan data agregasi dan tren untuk berbagai dimensi (airline, category, status, dll)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

/**
 * Interface untuk data baris laporan
 * Menyimpan informasi dasar laporan untuk agregasi statistik
 */
interface ReportRow {
  /** ID unik laporan */
  id: string;
  /** Nama maskapai penerbangan */
  airline: string | null;
  /** Kategori utama laporan */
  main_category: string | null;
  /** Status laporan */
  status: string | null;
  /** Tingkat keparahan laporan */
  severity: string | null;
  /** Area lokasi kejadian */
  area: string | null;
  /** Prioritas laporan */
  priority: string | null;
  /** Divisi target penanganan */
  target_division: string | null;
  /** Kode stasiun/branch */
  station_code: string | null;
  /** Tanggal insiden */
  incident_date: string | null;
  /** Tanggal pembuatan laporan */
  created_at: string;
}

/**
 * Interface untuk item hasil agregasi
 * Menyimpan jumlah dan persentase untuk setiap nilai unik
 */
interface AggregatedItem {
  /** Nama nilai yang diagregasi */
  name: string;
  /** Jumlah kemunculan */
  count: number;
  /** Persentase dari total */
  percentage: number;
}

/**
 * Interface untuk response statistik
 * Menyimpan hasil agregasi lengkap dengan distribusi dan tren
 */
interface StatsResponse {
  /** Tipe agregasi yang diminta (airline, category, status, dll) */
  type: string;
  /** Rentang waktu (7d atau 30d) */
  range: string;
  /** Total jumlah laporan */
  totalCount: number;
  /** Data distribusi berdasarkan tipe */
  distribution: AggregatedItem[];
  /** Data tren berdasarkan waktu */
  trendData: { date: string; count: number }[];
}

/**
 * Mengagregasi laporan berdasarkan field tertentu
 * Kompleksitas: Time O(n) | Space O(n) - n = jumlah laporan
 * @param reports - Array laporan yang akan diagregasi
 * @param field - Field yang digunakan untuk agregasi
 * @returns Array item yang diagregasi dengan count dan percentage, diurutkan berdasarkan count
 */
function aggregateByField(reports: ReportRow[], field: keyof ReportRow): AggregatedItem[] {
  const counts = new Map<string, number>();
  
  for (const report of reports) {
    const value = report[field] as string | null;
    const key = value || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  const total = reports.length || 1;
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Membangun data tren berdasarkan tanggal
 * Kompleksitas: Time O(n) | Space O(d) - d = jumlah tanggal unik
 * @param reports - Array laporan yang akan dianalisis trennya
 * @param rangeDays - Jumlah hari ke belakang untuk analisis tren
 * @returns Array data tren dengan tanggal dan jumlah laporan per hari
 */
function buildTrendData(reports: ReportRow[], rangeDays: number): { date: string; count: number }[] {
  const dateMap = new Map<string, number>();
  const today = new Date();
  
  // Pre-fill semua tanggal dengan 0
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateMap.set(d.toISOString().split('T')[0], 0);
  }
  
  // Hitung laporan per tanggal
  for (const report of reports) {
    const dateStr = report.created_at.split('T')[0];
    if (dateMap.has(dateStr)) {
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    }
  }
  
  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Menangani request GET untuk mengambil statistik laporan
 * Menerima query parameter untuk tipe dan rentang waktu
 * @param request - Request object dengan query parameter
 * @returns Response JSON berisi data statistik dengan distribusi dan tren
 * @throws {Error} Jika terjadi kesalahan saat mengambil atau memproses data
 * @example
 * GET /api/embed/stats?type=airline&range=30d
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'airline';
    const range = searchParams.get('range') || '7d';
    
    const rangeDays = range === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);

    const fieldMap: Record<string, keyof ReportRow> = {
      airline: 'airline',
      category: 'main_category',
      status: 'status',
      severity: 'severity',
      area: 'area',
      division: 'target_division',
      station: 'station_code'
    };
    
    const field = fieldMap[type] || 'airline';

    // Ambil dari Google Sheets dengan optimasi server-side
    const reports = await reportsService.getReports({
      filters: {
        dateFrom: startDate.toISOString()
      },
      fields: ['id', 'created_at', 'incident_date', 'date_of_event', 'airline', 'airlines', 'main_category', 'general_category', 'status', 'severity', 'area', 'priority', 'target_division', 'station_code', 'branch']
    });
    
    // Map ke struktur ReportRow
    const typedReports: ReportRow[] = reports.map(r => ({
        id: r.id,
        airline: r.airline || r.airlines || null,
        main_category: r.main_category || r.general_category || null,
        status: r.status,
        severity: r.severity || null,
        area: r.area || null,
        priority: r.priority || null,
        target_division: r.target_division || null,
        station_code: r.station_code || r.branch || null,
        incident_date: r.incident_date || r.date_of_event || null,
        created_at: r.created_at
    }));
    
    const response: StatsResponse = {
      type,
      range,
      totalCount: typedReports.length,
      distribution: aggregateByField(typedReports, field),
      trendData: buildTrendData(typedReports, rangeDays)
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
