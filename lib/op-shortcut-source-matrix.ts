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
  riskSeverity: {
    key: 'riskSeverity',
    title: 'Risk & Severity',
    pagePath: '/dashboard/op/risk-severity',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['NON CARGO', 'CGO'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/risk/summary',
      upstreamPath: '/api/ai/risk/summary',
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
  caseStatus: {
    key: 'caseStatus',
    title: 'Status Case',
    pagePath: '/dashboard/op/case-status',
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
  slaCompliance: {
    key: 'slaCompliance',
    title: 'SLA Compliance',
    pagePath: '/dashboard/op/sla-compliance',
    realSource: {
      label: 'Google Sheets',
      route: '/api/sla/full-service',
      envKeys: ['SLA_FULL_SERVICE_SHEET_ID'],
      sheetNames: ['Sheet1', 'AVSEC', 'Bag Handling', 'DEBRIEFING AFTER SERVICE'],
      notes: ['Dataset ini spesifik SLA Full Service dan tidak digabung dengan AI.'],
    },
  },
  cargoIrregularity: {
    key: 'cargoIrregularity',
    title: 'Logistik Irregularity',
    pagePath: '/dashboard/op/cargo-irregularity',
    realSource: {
      label: 'Google Sheets',
      route: '/api/reports/analytics',
      envKeys: ['GOOGLE_SHEET_ID'],
      sheetNames: ['CGO'],
      queryContract: ['sourceSheet=CGO'],
    },
    aiSource: {
      label: 'AI',
      route: '/api/ai/summarize',
      upstreamPath: '/api/ai/summarize/cgo',
      queryContract: ['category=cgo'],
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
      divisionFilter: 'OT',
      queryContract: ['targetDivision=OT', 'gseOnly=true'],
      notes: ['Tidak ada GSE_SHEET_ID khusus, sehingga data real diturunkan dari dataset laporan utama dengan heuristik GSE.'],
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
