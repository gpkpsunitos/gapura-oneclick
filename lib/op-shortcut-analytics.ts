'use client';

interface ReportAnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  hub?: string;
  branch?: string;
  area?: string;
  airlines?: string;
  sourceSheet?: string;
  esklasiRegex?: string;
  gseOnly?: boolean;
}

interface ReportAnalyticsResponse<T> {
  timestamp: number;
  count: number;
  reports: T[];
}

export async function fetchAnalyticsReports<T extends Record<string, unknown>>(
  filters: ReportAnalyticsFilters,
  fields: string[],
  signal?: AbortSignal
): Promise<ReportAnalyticsResponse<T>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    params.set(key, String(value));
  });
  if (fields.length > 0) {
    params.set('fields', fields.join(','));
  }

  const response = await fetch(`/api/reports/analytics?${params.toString()}`, {
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Failed to fetch analytics (${response.status})`);
  }

  return response.json();
}

export function getReportDate(value?: string | number | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function normalizeIssueCategory(value?: string | null): 'Irregularity' | 'Complaint' | 'Compliment' | 'Accidents / Incidents' | 'Other' {
  const normalized = String(value || '').toLowerCase();
  if (/accident|incident|insiden|kecelakaan/.test(normalized)) return 'Accidents / Incidents';
  if (/irregular/.test(normalized)) return 'Irregularity';
  if (/compliment|apresiasi|appreciation/.test(normalized)) return 'Compliment';
  if (/complain|keluhan|komplain/.test(normalized)) return 'Complaint';
  return 'Other';
}

export function pickBranch<T extends Record<string, unknown>>(report: T): string {
  return String(
    report.branch ||
      report.reporting_branch ||
      report.station_code ||
      report.station_id ||
      'Unknown'
  ).trim() || 'Unknown';
}

export function pickAirline<T extends Record<string, unknown>>(report: T): string {
  return String(report.airlines || report.airline || report.jenis_maskapai || 'Unknown').trim() || 'Unknown';
}

export function buildMonthlySeries<T>(
  reports: T[],
  getDateValue: (report: T) => string | number | null | undefined,
  getBucket: (report: T) => string
) {
  const monthMap = new Map<string, Record<string, number>>();

  reports.forEach((report) => {
    const date = getReportDate(getDateValue(report));
    if (!date) return;
    const monthKey = formatMonthKey(date);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {});
    }
    const bucket = getBucket(report);
    const current = monthMap.get(monthKey)!;
    current[bucket] = (current[bucket] || 0) + 1;
  });

  return Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, values]) => ({
      month: formatMonthLabel(monthKey),
      ...values,
    }));
}
