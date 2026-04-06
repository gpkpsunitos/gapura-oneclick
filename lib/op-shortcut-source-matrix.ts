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
  complaintByCategory: {
    key: 'complaintByCategory',
    title: 'Complaint per Category',
    pagePath: '/dashboard/op/complaint-by-category',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
      notes: ['Data real berasal dari sinkronisasi laporan utama tanpa query filter divisi yang di-hardcode di halaman ini.'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/action-summary',
      upstreamPath: '/api/ai/analyze-all -> derived action summary',
    },
  },
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
  rootCauseDominant: {
    key: 'rootCauseDominant',
    title: 'Root Cause Dominan',
    pagePath: '/dashboard/op/root-cause-dominant',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/root-cause/stats',
      upstreamPath: '/api/ai/root-cause/stats',
    },
  },
  joumpa: {
    key: 'joumpa',
    title: 'Joumpa Handling',
    pagePath: '/dashboard/op/joumpa',
    realSource: {
      label: 'Google Sheets',
      route: '/api/joumpa',
      envKeys: ['JOUMPA_SHEET_ID'],
      sheetNames: ['Form Responses 1'],
      notes: ['Halaman ini tetap real-data only.'],
    },
  },
  gseDashboard: {
    key: 'gseDashboard',
    title: 'GSE Dashboard',
    pagePath: '/dashboard/ot/gse',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
      divisionFilter: 'regex OT pada ESKLASI DIVISI',
      queryContract: ['esklasiRegex=OT', 'gseOnly=true'],
      notes: ['Tidak ada GSE_SHEET_ID khusus, sehingga data real diturunkan dari dataset laporan utama dengan heuristik GSE lalu difilter memakai regex `OT` pada kolom ESKLASI DIVISI.', 'Jika hasil regex OT terlalu tipis di data live, halaman GSE akan fallback ke seluruh kasus yang terdeteksi GSE dari kolom-kolom Google Sheets.'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/gse/*',
      upstreamPath: '/api/ai/gse/issues/top | serviceability | irregularities | ranking',
      queryContract: ['esklasi_regex=OT'],
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
