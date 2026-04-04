/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi definisi tipe data untuk analitik entitas, mencakup statistik
 * maskapai, rute, hub, dan nomor penerbangan untuk fitur AI Entity Analytics.
 */

/**
 * Statistik maskapai
 */
export interface AirlineStats {
  /** Nama maskapai */
  name: string;
  /** Jumlah insiden */
  count: number;
  /** Pembagian keparahan */
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  /** Top rute */
  topRoutes: string[];
  /** Rata-rata hari prediksi */
  avgPredictionDays: number;
  /** Insiden terakhir */
  lastIncident: Date | null;
  /** Daftar laporan */
  reports: any[];
}

/**
 * Statistik rute
 */
export interface RouteStats {
  /** Rute */
  route: string;
  /** Dari */
  from: string;
  /** Ke */
  to: string;
  /** Jumlah insiden */
  count: number;
  /** Tingkat critical */
  criticalRate: number;
  /** Pembagian keparahan */
  severityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  /** Tipe isu utama */
  primaryIssueType: string;
  /** Insiden terakhir */
  lastIncident: Date | null;
  /** Daftar laporan */
  reports: any[];
}

/**
 * Statistik hub
 */
export interface HubStats {
  /** Nama hub */
  name: string;
  /** Jumlah insiden */
  count: number;
  /** Persentase */
  percentage: number;
  /** Pembagian keparahan */
  severityBreakdown: Record<string, number>;
  /** Kategori isu utama */
  topIssueCategory: string;
  /** Top maskapai */
  topAirlines: string[];
  /** Daftar laporan */
  reports: any[];
}

/**
 * Statistik penerbangan
 */
export interface FlightStats {
  /** Nomor penerbangan */
  flightNumber: string;
  /** Maskapai */
  airline: string;
  /** Jumlah insiden */
  count: number;
  /** Rata-rata hari prediksi */
  avgPredictionDays: number;
  /** Daftar laporan */
  reports: any[];
}

/**
 * Statistik entitas lengkap
 */
export interface EntityStats {
  /** Statistik maskapai */
  airlines: Map<string, AirlineStats>;
  /** Statistik rute */
  routes: Map<string, RouteStats>;
  /** Statistik hub */
  hubs: Map<string, HubStats>;
  /** Statistik nomor penerbangan */
  flightNumbers: Map<string, FlightStats>;
  /** Semua laporan */
  allReports: any[];
  /** Ringkasan */
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

/**
 * State filter
 */
export interface FilterState {
  /** Filter maskapai */
  airlines: string[];
  /** Filter rute */
  routes: string[];
  /** Filter hub */
  hubs: string[];
  /** Filter keparahan */
  severities: ('Critical' | 'High' | 'Medium' | 'Low')[];
  /** Rentang tanggal */
  dateRange: { start: Date; end: Date } | null;
}

/**
 * Entitas yang dipilih
 */
export interface SelectedEntity {
  /** Tipe entitas */
  type: 'airline' | 'route' | 'hub' | 'flight';
  /** Nama entitas */
  name: string;
  /** Statistik entitas */
  stats: AirlineStats | RouteStats | HubStats | FlightStats;
}
