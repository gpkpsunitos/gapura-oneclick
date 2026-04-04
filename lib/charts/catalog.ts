/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi katalog chart yang tersedia di sistem, termasuk
 * metadata dan fungsi untuk mencari chart berdasarkan slug atau kategori
 */

/**
 * Interface untuk entri katalog chart
 */
export interface ChartCatalogEntry {
  /** Slug unik untuk identifikasi chart */
  slug: string;
  /** Judul chart */
  title: string;
  /** Deskripsi singkat chart */
  description?: string;
  /** Path URL untuk halaman detail chart */
  detailPath: string;
  /** Kategori chart */
  category: string;
  /** Sumber data (Google Sheets atau Database) */
  dataSource: 'google-sheets' | 'database';
  /** ID sheet Google Sheets (jika menggunakan Google Sheets) */
  sheetId?: string;
  /** Range data pada Google Sheets */
  sheetRange?: string;
}

/**
 * Daftar katalog chart yang tersedia
 */
export const chartCatalog: ChartCatalogEntry[] = [
  {
    slug: 'report-by-case-category',
    title: 'Report by Case Category',
    description: 'Analysis of cases by category (Irregularity, Complaint, Compliment)',
    detailPath: '/dashboard/charts/report-by-case-category/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'hub-report',
    title: 'Hub Report',
    description: 'Hub performance analysis & risk profile',
    detailPath: '/dashboard/charts/hub-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'branch-report',
    title: 'Branch Report',
    description: 'Branch performance & risk profile analysis',
    detailPath: '/dashboard/charts/branch-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'category-by-area',
    title: 'Category by Area',
    description: 'Physical risk distribution — where are operational risks concentrated?',
    detailPath: '/dashboard/charts/category-by-area/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'case-category-by-branch',
    title: 'Case Category by Branch',
    description: 'Operational location risk — which branch is highest risk?',
    detailPath: '/dashboard/charts/case-category-by-branch/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'case-category-by-airline',
    title: 'Case Category by Airline',
    description: 'Entity performance risk — is this airline high risk?',
    detailPath: '/dashboard/charts/case-category-by-airline/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'airline-report',
    title: 'Airlines Report',
    description: 'Airline performance analysis & risk profile',
    detailPath: '/dashboard/charts/airline-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'monthly-report',
    title: 'Monthly Report',
    description: 'Monthly trend analysis with category breakdown',
    detailPath: '/dashboard/charts/monthly-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'area-report',
    title: 'Area Report',
    description: 'Area performance analysis (Landside, Airside, etc.)',
    detailPath: '/dashboard/charts/area-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
  {
    slug: 'pivot-report',
    title: 'Pivot Report',
    description: 'Cross-tabulation heatmap analysis',
    detailPath: '/dashboard/charts/pivot-report/detail',
    category: 'Customer Feedback',
    dataSource: 'google-sheets',
  },
];

/**
 * Mencari chart berdasarkan slug
 * 
 * @param slug - Slug chart yang dicari
 * @returns Object chart atau undefined jika tidak ditemukan
 */
export function getChartBySlug(slug: string): ChartCatalogEntry | undefined {
  return chartCatalog.find(chart => chart.slug === slug);
}

/**
 * Mengambil daftar chart berdasarkan kategori
 * 
 * @param category - Kategori chart
 * @returns Array chart dalam kategori tersebut
 */
export function getChartsByCategory(category: string): ChartCatalogEntry[] {
  return chartCatalog.filter(chart => chart.category === category);
}
