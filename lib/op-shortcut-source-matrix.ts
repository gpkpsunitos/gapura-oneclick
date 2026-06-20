export type AnalyticsSourceKind = 'real' | 'ai';

export interface AnalyticsSourceDescriptor {
  label: string;
  route: string;
  envKeys?: string[];
  sheetNames?: string[];
  divisionFilter?: string;
  upstreamPath?: string;
  queryContract?: string[];
  notes?: string[];
}

export interface AnalyticsRuntimeStatus {
  lastSyncAt?: string | number | null;
  generatedAt?: string | null;
  sourceSyncAt?: string | null;
  cached?: boolean;
  stale?: boolean;
  count?: number | null;
}

export interface ShortcutSourceConfig {
  key: string;
  title: string;
  pagePath: string;
  realSource: AnalyticsSourceDescriptor;
  aiSource?: AnalyticsSourceDescriptor;
}

export const OP_SHORTCUT_SOURCE_MATRIX: Record<string, ShortcutSourceConfig> = {
  topIrregularityComplaint: {
    key: 'topIrregularityComplaint',
    title: 'Top Irregularity & Complaint',
    pagePath: '/dashboard/op/irregularity-complaint-top-cases',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/action-summary',
      upstreamPath: '/api/ai/analyze-all -> derived action summary',
    },
  },
  gseDashboard: {
    key: 'gseDashboard',
    title: 'GSE Dashboard',
    pagePath: '/dashboard/op',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
      divisionFilter: 'Divisi OP pada ESKLASI DIVISI',
      queryContract: ['esklasiRegex=OP', 'gseOnly=true'],
      notes: ['Tidak ada GSE_SHEET_ID khusus, sehingga data real diturunkan dari dataset laporan utama dengan heuristik GSE lalu difilter memakai Divisi OP pada kolom ESKLASI DIVISI.', 'Jika hasil filter OP terlalu tipis di data live, section GSE menampilkan semua kasus yang terdeteksi GSE dari kolom-kolom Google Sheets.'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/gse/*',
      upstreamPath: '/api/ai/gse/issues/top | serviceability | irregularities | ranking',
      queryContract: ['esklasi_regex=OP'],
    },
  },
  monitoringEfektivitas: {
    key: 'monitoringEfektivitas',
    title: 'Monitoring Efektivitas',
    pagePath: '/dashboard/charts/monthly-report/detail',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics | /api/reports/analytics/aggregated',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
      notes: ['Halaman shared tetap dipakai ulang untuk shortcut OP dan penggunaan native.'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/summarize | /api/ai/branch/summary | /api/ai/forecast/seasonal | /api/ai/seasonality/forecast',
      upstreamPath: 'summary + branch + seasonal intelligence',
    },
  },
  monitoringKesesuaianStandar: {
    key: 'monitoringKesesuaianStandar',
    title: 'Monitoring Kesesuaian Standar',
    pagePath: '/dashboard/charts/category-by-area/detail',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
      notes: ['Halaman shared area intelligence tetap dipakai ulang.'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/root-cause/stats',
      upstreamPath: '/api/ai/root-cause/stats',
    },
  },
};

export function getShortcutSourceConfig(key: keyof typeof OP_SHORTCUT_SOURCE_MATRIX) {
  return OP_SHORTCUT_SOURCE_MATRIX[key];
}
