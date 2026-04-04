/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API client untuk layanan GSE (Ground Service Equipment)
 * Menyediakan fungsi untuk mengambil data analitik dan statistik GSE dari layanan AI
 */

/** Base URL untuk layanan AI, diambil dari environment variable atau default value */
const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.AI_SERVICE_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://gapura-dev-gapura-ai.hf.space');

/**
 * Interface untuk entry distribusi data
 * Menyimpan jumlah dan persentase untuk kategori tertentu
 */
export interface GseDistributionEntry {
  /** Jumlah item dalam kategori */
  count: number;
  /** Persentase dari total */
  percentage: number;
}

/**
 * Interface untuk contoh data GSE
 * Menyimpan contoh kasus atau record yang relevan
 */
export interface GseExample {
  /** ID unik untuk baris/record */
  row_id: string;
  /** Deskripsi laporan (opsional) */
  report?: string;
  /** Penyebab akar (root cause) (opsional) */
  root_cause?: string;
  /** Tindakan yang diambil (opsional) */
  action_taken?: string;
  /** Area lokasi (opsional) */
  area?: string;
  /** Cabang/branch (opsional) */
  branch?: string;
  /** Maskapai/airline (opsional) */
  airlines?: string;
}

/**
 * Interface untuk response top issues GSE
 * Menyimpan data isu/isu teratas dalam operasi GSE
 */
export interface GseIssuesTopResponse {
  /** Status response */
  status: string;
  /** Filter yang digunakan untuk query */
  filters: { esklasi_regex: string };
  /** Total record GSE yang diproses */
  total_gse_records: number;
  /** Data isu teratas (opsional) */
  top?: {
    /** Kategori isu */
    category: string;
    /** Jumlah kasus */
    count: number;
    /** Persentase dari total */
    percentage: number;
  };
  /** Distribusi data per kategori (opsional) */
  distribution?: Record<string, GseDistributionEntry>;
  /** Data subkategori teratas (opsional) */
  top_subcategory?: {
    /** Nama subkategori */
    subcategory: string;
    /** Jumlah kasus */
    count: number;
    /** Persentase dari total */
    percentage: number;
  };
  /** Distribusi data per subkategori (opsional) */
  distribution_subcategory?: Record<string, GseDistributionEntry>;
  /** Data root cause teratas (opsional) */
  top_root_cause?: {
    /** Kategori root cause */
    category: string;
    /** Jumlah kasus */
    count: number;
    /** Persentase dari total */
    percentage: number;
  };
  /** Distribusi data per root cause (opsional) */
  distribution_root_cause?: Record<string, GseDistributionEntry>;
  /** Contoh kasus teratas (opsional) */
  top_samples?: Record<string, GseExample[]>;
}

/**
 * Interface untuk response serviceability GSE
 * Menyimpan data tentang kelayakan penggunaan peralatan GSE
 */
export interface GseServiceabilityResponse {
  /** Status response */
  status: string;
  /** Filter yang digunakan untuk query */
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  /** Total record GSE yang diproses */
  total_gse_records: number;
  /** Distribusi kelayakan peralatan */
  serviceability_distribution: Record<string, GseDistributionEntry>;
  /** Status peralatan per jenis */
  equipment_status: Array<{
    equipment: string;
    counts: Record<string, number>;
    total: number;
  }>;
  /** Contoh kasus teratas (opsional) */
  top_samples?: Record<string, GseExample[]>;
}

/**
 * Interface untuk kasus irregularitas GSE
 * Menyimpan informasi kasus irregularitas yang terdeteksi
 */
export interface GseIrregularityCase {
  /** Nama sheet sumber data */
  sheet: string;
  /** Cabang/branch */
  branch: string;
  /** Maskapai/airline */
  airline: string;
  /** Area */
  area: string;
  /** Kategori root cause */
  rc_category: string;
  /** Tag/kategori */
  tag: string;
  /** Preview laporan */
  report_preview: string;
  /** Preview root cause */
  root_cause_preview: string;
}

/**
 * Interface untuk response irregularities GSE
 * Menyimpan data kasus irregularitas yang terdeteksi
 */
export interface GseIrregularitiesResponse {
  /** Status response */
  status: string;
  /** Filter yang digunakan untuk query */
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  /** Total kasus irregularitas GSE */
  total_gse_irregularity_cases: number;
  /** Distribusi per tag/kategori */
  distribution_by_tag: Record<string, GseDistributionEntry>;
  /** Array kasus irregularitas */
  cases: GseIrregularityCase[];
}

/**
 * Interface untuk item ranking GSE
 * Menyimpan data ranking untuk entitas tertentu
 */
export interface GseRankingItem {
  /** Nama entitas (branch, airline, atau area) */
  name: string;
  /** Jumlah kasus */
  count: number;
  /** Persentase dari total */
  percentage: number;
}

/**
 * Interface untuk response ranking GSE
 * Menyimpan data ranking untuk berbagai entitas
 */
export interface GseRankingResponse {
  /** Status response */
  status: string;
  /** Jenis entitas (branch, airline, atau area) */
  entity: 'branch' | 'airline' | 'area';
  /** Filter yang digunakan untuk query */
  filters: {
    esklasi_regex: string;
    confidence_threshold: number;
  };
  /** Total record GSE yang diproses */
  total_gse_records: number;
  /** Array ranking teratas */
  top: GseRankingItem[];
  /** Distribusi level tinggi per entitas */
  distribution_high_level: Record<string, GseDistributionEntry>;
}

/**
 * Helper function untuk mengambil JSON dari API
 * Menggunakan fetch dengan konfigurasi yang konsisten
 * 
 * @template T - Tipe data yang diharapkan
 * @param url - URL endpoint
 * @returns Promise yang resolve dengan data JSON
 * @throws Error jika request gagal atau response bukan JSON
 * 
 * @internal
 */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Mengambil data top issues GSE
 * Mengambil isu/isu teratas dalam operasi GSE berdasarkan regex eskalasi
 * 
 * @param esklasiRegex - Regex untuk filter divisi eskalasi (default: 'OT')
 * @returns Promise yang resolve dengan data top issues GSE
 * 
 * @example
 * ```typescript
 * const issues = await fetchGseIssuesTop('DIVISI_OS');
 * console.log('Top issue:', issues.top?.category);
 * ```
 */
export async function fetchGseIssuesTop(
  esklasiRegex: string = 'OT'
): Promise<GseIssuesTopResponse> {
  const url = `${BASE_URL}/api/ai/gse/issues/top?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseIssuesTopResponse>(url);
}

/**
 * Mengambil data serviceability GSE
 * Mengambil data kelayakan penggunaan peralatan GSE
 * 
 * @param esklasiRegex - Regex untuk filter divisi eskalasi (default: 'OT')
 * @returns Promise yang resolve dengan data serviceability GSE
 * 
 * @example
 * ```typescript
 * const serviceability = await fetchGseServiceability('DIVISI_OS');
 * console.log('Serviceability distribution:', serviceability.serviceability_distribution);
 * ```
 */
export async function fetchGseServiceability(
  esklasiRegex: string = 'OT'
): Promise<GseServiceabilityResponse> {
  const url = `${BASE_URL}/api/ai/gse/serviceability?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseServiceabilityResponse>(url);
}

/**
 * Mengambil data irregularities GSE
 * Mengambil kasus irregularitas yang terdeteksi dalam operasi GSE
 * 
 * @param esklasiRegex - Regex untuk filter divisi eskalasi (default: 'OT')
 * @returns Promise yang resolve dengan data irregularities GSE
 * 
 * @example
 * ```typescript
 * const irregularities = await fetchGseIrregularities('DIVISI_OS');
 * console.log('Total cases:', irregularities.total_gse_irregularity_cases);
 * ```
 */
export async function fetchGseIrregularities(
  esklasiRegex: string = 'OT'
): Promise<GseIrregularitiesResponse> {
  const url = `${BASE_URL}/api/ai/gse/irregularities?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseIrregularitiesResponse>(url);
}

/**
 * Mengambil data ranking GSE
 * Mengambil ranking untuk branch, airline, atau area berdasarkan parameter
 * 
 * @param entity - Jenis entitas ('branch', 'airline', atau 'area')
 * @param esklasiRegex - Regex untuk filter divisi eskalasi (default: 'OT')
 * @returns Promise yang resolve dengan data ranking GSE
 * 
 * @example
 * ```typescript
 * const ranking = await fetchGseRanking('branch', 'DIVISI_OS');
 * console.log('Top branch:', ranking.top[0]);
 * ```
 */
export async function fetchGseRanking(
  entity: 'branch' | 'airline' | 'area',
  esklasiRegex: string = 'OT'
): Promise<GseRankingResponse> {
  const url = `${BASE_URL}/api/ai/gse/ranking?entity=${entity}&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
  return fetchJson<GseRankingResponse>(url);
}

/**
 * Mengkonversi nilai ke number yang valid
 * Mengembalikan 0 jika nilai bukan number finite
 * 
 * @param value - Nilai yang akan dikonversi
 * @returns Number yang valid atau 0
 * 
 * @example
 * ```typescript
 * toNumber('123') // 123
 * toNumber(null) // 0
 * toNumber(Infinity) // 0
 * ```
 */
export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Menjumlahkan semua nilai dalam record object
 * 
 * @param record - Object dengan key-value number pairs
 * @returns Total jumlah dari semua nilai
 * 
 * @example
 * ```typescript
 * sumMap({ a: 10, b: 20, c: 30 }) // 60
 * ```
 */
export function sumMap(record?: Record<string, number>): number {
  if (!record) return 0;
  return Object.values(record).reduce((sum, value) => sum + toNumber(value), 0);
}

/**
 * Mengubah record menjadi array entries yang terurut
 * Mengambil N entri teratas berdasarkan nilai secara descending
 * 
 * @param record - Object dengan key-value number pairs
 * @param take - Jumlah entri yang akan diambil (default: 5)
 * @returns Array pasangan [key, value] yang sudah diurutkan
 * 
 * @example
 * ```typescript
 * const result = toSortedEntries({ a: 30, b: 10, c: 20 }, 2);
 * // [['a', 30], ['c', 20]]
 * ```
 */
export function toSortedEntries(
  record?: Record<string, number>,
  take = 5
): Array<[string, number]> {
  return Object.entries(record || {})
    .map(([key, value]) => [key, toNumber(value)] as [string, number])
    .filter(([key, value]) => key.trim().length > 0 && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take);
}

/**
 * Normalisasi data distribusi untuk visualisasi
 * Mengubah record distribusi menjadi array yang terurut dan diformat
 * 
 * @param map - Object distribusi dengan GseDistributionEntry values
 * @returns Array object dengan format { name, count, percentage }
 * 
 * @example
 * ```typescript
 * const result = normalizeDistribution(distributionData);
 * // [{ name: 'Category A', count: 100, percentage: 50 }, ...]
 * ```
 */
export function normalizeDistribution(
  map?: Record<string, GseDistributionEntry>
): Array<{ name: string; count: number; percentage: number }> {
  return Object.entries(map || {})
    .map(([name, entry]) => ({
      name,
      count: toNumber(entry?.count),
      percentage: toNumber(entry?.percentage),
    }))
    .filter((item) => item.name && item.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Mengkonversi data untuk visualisasi donut chart
 * Mengubah array items menjadi format yang sesuai untuk chart library
 * 
 * @param items - Array items dengan format { name, count }
 * @returns Array object dengan format { name, value }
 * 
 * @example
 * ```typescript
 * const donutData = toDonutData([{ name: 'A', count: 100 }, { name: 'B', count: 200 }]);
 * // [{ name: 'A', value: 100 }, { name: 'B', value: 200 }]
 * ```
 */
export function toDonutData(
  items: Array<{ name: string; count: number }>
): Array<{ name: string; value: number }> {
  return items.map((item) => ({ name: item.name, value: item.count }));
}
