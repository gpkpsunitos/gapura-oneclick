'use client';

import { useDeferredValue, useMemo } from 'react';
import {
  AlertTriangle,
  BadgeInfo,
  Radar,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Report } from '@/types';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { normalizeText } from './summary/summary-utils';

interface DelayCodeReportTabProps {
  reports: Report[];
}

type DelaySourceType = 'official' | 'narrative' | 'both';

type DelayInsightRow = {
  id: string;
  sourceType: DelaySourceType;
  officialDelayCode: string;
  extractedDelaySignal: string;
  hasDelayNarrative: boolean;
  date: string;
  rawDate: number;
  branch: string;
  airline: string;
  flight: string;
  category: string;
  area: string;
  status: string;
  detail: string;
  rootSummary: string;
};

type MetricRow = {
  id: string;
  label: string;
  total: number;
};

const NARRATIVE_FIELDS: Array<keyof Report> = ['report', 'root_caused', 'action_taken', 'preventive_action'];
const SIGNAL_KEYWORDS = ['delay code', 'flight delay', 'keterlambatan', 'delay'];
const SOURCE_COLORS: Record<DelaySourceType, string> = {
  official: 'oklch(0.67 0.18 160)',
  narrative: 'oklch(0.72 0.18 70)',
  both: 'oklch(0.6 0.19 250)',
};

function normalizeDelayText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

function getDisplayArea(report: Report) {
  if (report.terminal_area_category) return `Terminal Area / ${normalizeText(report.terminal_area_category)}`;
  if (report.apron_area_category) return `Apron Area / ${normalizeText(report.apron_area_category)}`;
  if (report.general_category) return `General / ${normalizeText(report.general_category)}`;
  return normalizeText(report.area || '-', '-');
}

function getRawDate(report: Report) {
  const raw = report.date_of_event || report.created_at;
  if (!raw) return 0;

  let parsed: Date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    parsed = new Date(year, month - 1, day);
  } else {
    const asDate = new Date(raw);
    if (Number.isNaN(asDate.getTime())) return 0;
    parsed = new Date(asDate.getUTCFullYear(), asDate.getUTCMonth(), asDate.getUTCDate());
  }

  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDisplayDate(rawDate: number) {
  if (!rawDate) return '-';
  return new Date(rawDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function narrativeText(report: Report) {
  return NARRATIVE_FIELDS
    .map((field) => normalizeDelayText(report[field], ''))
    .filter(Boolean)
    .join('\n');
}

function hasDelayNarrative(report: Report) {
  const text = narrativeText(report).toLowerCase();
  return SIGNAL_KEYWORDS.some((keyword) => text.includes(keyword));
}

function extractDelaySignal(report: Report) {
  const text = narrativeText(report);
  if (!text) return '';

  const explicitCode = text.match(/delay\s*code\s*[:\-]\s*([^\n\r]+)/i);
  if (explicitCode?.[1]) {
    return normalizeDelayText(explicitCode[1]);
  }

  const explicitFlightDelay = text.match(/(?:flight\s+delay|keterlambatan)\s*[:\-]?\s*([^\n\r]{0,140})/i);
  if (explicitFlightDelay?.[1]) {
    return normalizeDelayText(explicitFlightDelay[1]);
  }

  const genericLine = text
    .split(/\n+/)
    .map((line) => normalizeDelayText(line))
    .find((line) => SIGNAL_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword)));

  return genericLine || '';
}

function aggregateMetric(rows: DelayInsightRow[], selector: (row: DelayInsightRow) => string): MetricRow[] {
  const buckets: Record<string, number> = {};

  rows.forEach((row) => {
    const label = normalizeText(selector(row), '').trim();
    if (!label) return;
    buckets[label] = (buckets[label] || 0) + 1;
  });

  return Object.entries(buckets)
    .map(([label, total]) => ({ id: label, label, total }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function KpiCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/75 p-4 shadow-[0_12px_30px_-24px_oklch(0.2_0.03_250_/_0.28)]">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-[2rem] font-black tracking-[-0.04em] text-[var(--text-primary)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{caption}</p>
    </div>
  );
}

function MiniBarChart({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/70 p-4">
      <div className="mb-4 text-[0.72rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">{title}</div>
      <div className="h-[200px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="oklch(0.92 0.01 90 / 0.9)" strokeDasharray="4 4" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} cases`, 'Total']}
              contentStyle={{
                borderRadius: '16px',
                borderColor: 'oklch(0.9 0.01 90 / 0.9)',
                background: 'oklch(0.99 0.005 90 / 0.95)',
              }}
            />
            <Bar dataKey="total" fill="oklch(0.68 0.17 165)" radius={[0, 12, 12, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DelayCodeReportTab({ reports }: DelayCodeReportTabProps) {
  const deferredReports = useDeferredValue(reports);

  const delayRows = useMemo<DelayInsightRow[]>(() => {
    return deferredReports
      .map((report) => {
        const officialDelayCode = normalizeDelayText(report.delay_code);
        const extractedDelaySignal = extractDelaySignal(report);
        const hasNarrative = hasDelayNarrative(report);

        if (!officialDelayCode && !extractedDelaySignal && !hasNarrative) {
          return null;
        }

        const rawDate = getRawDate(report);
        const sourceType: DelaySourceType = officialDelayCode && extractedDelaySignal
          ? 'both'
          : officialDelayCode
            ? 'official'
            : 'narrative';

        return {
          id: report.id,
          sourceType,
          officialDelayCode: officialDelayCode || '-',
          extractedDelaySignal: extractedDelaySignal || '-',
          hasDelayNarrative: hasNarrative,
          date: formatDisplayDate(rawDate),
          rawDate,
          branch: normalizeText(report.stations?.code || report.branch || '-', '-').toUpperCase(),
          airline: normalizeText(report.airlines || report.airline || 'Non Airline Case'),
          flight: normalizeText(report.flight_number || '#N/A'),
          category: normalizeText(report.category || '-'),
          area: getDisplayArea(report),
          status: normalizeText(report.status || '-'),
          detail: normalizeText(report.report || report.description || '-'),
          rootSummary: normalizeText(report.root_caused || report.identification_of_root || '-'),
        };
      })
      .filter((row): row is DelayInsightRow => Boolean(row))
      .sort((left, right) => right.rawDate - left.rawDate);
  }, [deferredReports]);

  const officialDelayRows = useMemo(
    () => deferredReports.filter((report) => Boolean(normalizeDelayText(report.delay_code))),
    [deferredReports]
  );

  const officialCoverage = deferredReports.length > 0
    ? ((officialDelayRows.length / deferredReports.length) * 100).toFixed(1)
    : '0.0';

  const extractedSignalRows = useMemo(
    () => delayRows.filter((row) => row.sourceType === 'narrative' || row.sourceType === 'both'),
    [delayRows]
  );

  const sourceRows = useMemo<MetricRow[]>(
    () => ([
      { id: 'official', label: 'Official field', total: delayRows.filter((row) => row.sourceType === 'official').length },
      { id: 'narrative', label: 'Narrative-derived', total: delayRows.filter((row) => row.sourceType === 'narrative').length },
      { id: 'both', label: 'Both sources', total: delayRows.filter((row) => row.sourceType === 'both').length },
    ]).filter((item) => item.total > 0),
    [delayRows]
  );

  const topSignals = useMemo(
    () => aggregateMetric(extractedSignalRows, (row) => row.extractedDelaySignal),
    [extractedSignalRows]
  );

  const byBranch = useMemo(
    () => aggregateMetric(extractedSignalRows, (row) => row.branch),
    [extractedSignalRows]
  );

  const byAirline = useMemo(
    () => aggregateMetric(extractedSignalRows, (row) => row.airline),
    [extractedSignalRows]
  );

  const byCategory = useMemo(
    () => aggregateMetric(extractedSignalRows, (row) => row.category),
    [extractedSignalRows]
  );

  const byMonth = useMemo(
    () =>
      aggregateMetric(extractedSignalRows, (row) => {
        if (!row.rawDate) return '-';
        return new Date(row.rawDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
    [extractedSignalRows]
  );

  return (
    <div className="space-y-6">
      <SummarySectionCard
        title="Official Delay Field Health"
        subtitle="Halaman ini memisahkan coverage field resmi dari sinyal delay yang diekstrak dari narasi laporan live Google Sheets. Angka official dan fallback tidak digabung."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Reports" value={deferredReports.length.toLocaleString('id-ID')} caption="Seluruh report yang lolos filter aktif dashboard." />
            <KpiCard label="Official Delay Code" value={officialDelayRows.length.toLocaleString('id-ID')} caption="Row yang benar-benar mengisi kolom resmi `Delay Code`." />
            <KpiCard label="Official Coverage" value={`${officialCoverage}%`} caption="Coverage field resmi pada dataset yang sedang dilihat." />
            <KpiCard label="Missing Official Field" value={(deferredReports.length - officialDelayRows.length).toLocaleString('id-ID')} caption="Row yang belum mengisi kolom resmi `Delay Code`." />
          </div>

          <div className="rounded-[26px] border border-[oklch(0.84_0.06_78_/_0.7)] bg-[oklch(0.98_0.03_92_/_0.78)] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-[oklch(0.66_0.16_72)]" size={18} />
              <div className="space-y-2">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[oklch(0.48_0.12_72)]">Official Field Warning</div>
                <p className="text-sm leading-6 text-[var(--text-primary)]">
                  Kolom <span className="font-black">Delay Code</span> tersedia di header live, tetapi coverage pada view ini saat ini
                  {' '}<span className="font-black">{officialDelayRows.length} / {deferredReports.length}</span>. Insight operasional di section berikut memakai fallback naratif secara terpisah.
                </p>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  `Delay Duration` tidak dijadikan dimensi utama karena header live belum konsisten tersedia, jadi tab ini fokus pada integritas field resmi dan sinyal delay eksplisit di teks laporan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        title="Delay Signals Extracted From Narrative"
        subtitle="Fallback ini hanya menangkap keyword delay yang eksplisit seperti `delay`, `delay code`, `flight delay`, dan `keterlambatan` dari body laporan live."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/70 p-4">
              <div className="mb-4 flex items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <Radar size={15} />
                Source Split
              </div>
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceRows} dataKey="total" nameKey="label" innerRadius={68} outerRadius={98} strokeWidth={0}>
                      {sourceRows.map((row) => (
                        <Cell
                          key={row.id}
                          fill={row.id === 'official' ? SOURCE_COLORS.official : row.id === 'both' ? SOURCE_COLORS.both : SOURCE_COLORS.narrative}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} cases`, 'Total']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
                {sourceRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.id === 'official' ? SOURCE_COLORS.official : row.id === 'both' ? SOURCE_COLORS.both : SOURCE_COLORS.narrative }}
                    />
                    <span>{row.label} ({row.total})</span>
                  </div>
                ))}
              </div>
            </div>

            <MiniBarChart title="Top Extracted Delay Signals" rows={topSignals} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MiniBarChart title="Narrative Delay by Branch" rows={byBranch} />
            <MiniBarChart title="Narrative Delay by Airline" rows={byAirline} />
            <MiniBarChart title="Narrative Delay by Category" rows={byCategory} />
            <MiniBarChart title="Narrative Delay by Month" rows={byMonth} />
          </div>
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        title="Operational Case Archive"
        subtitle="Arsip ini hanya menampilkan row yang punya `delay_code` resmi atau sinyal delay eksplisit dari narasi laporan."
      >
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/60 p-4 text-sm leading-6 text-[var(--text-secondary)]">
            <div className="flex items-start gap-2">
              <BadgeInfo size={16} className="mt-1 shrink-0 text-[var(--brand-emerald-700)]" />
              <p>
                `Official field` berarti nilai berasal dari kolom `Delay Code`. `Narrative-derived` berarti sinyal delay muncul di teks bebas `Report` atau `Root Caused`.
                Nilai extracted disajikan apa adanya setelah normalisasi whitespace, tanpa taxonomy tambahan.
              </p>
            </div>
          </div>

          <SummaryDenseTable
            data={delayRows}
            rowKey={(row) => row.id}
            itemsPerPage={8}
            initialSort={{ columnId: 'date', direction: 'desc' }}
            emptyMessage="No explicit delay signals found in the current filtered dataset."
            columns={[
              {
                id: 'date',
                header: 'Date',
                accessor: (row) => <span className="font-mono font-bold">{row.date}</span>,
                sortValue: (row) => row.rawDate,
                minWidth: '104px',
              },
              {
                id: 'source',
                header: 'Source',
                accessor: (row) => (
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor: `${SOURCE_COLORS[row.sourceType]}20`,
                      color: SOURCE_COLORS[row.sourceType],
                    }}
                  >
                    {row.sourceType}
                  </span>
                ),
                sortValue: (row) => row.sourceType,
                minWidth: '122px',
              },
              {
                id: 'branch',
                header: 'Branch',
                accessor: (row) => row.branch,
                sortValue: (row) => row.branch,
              },
              {
                id: 'airline',
                header: 'Airline',
                accessor: (row) => <span className="block max-w-[180px] break-words">{row.airline}</span>,
                sortValue: (row) => row.airline,
                minWidth: '180px',
              },
              {
                id: 'flight',
                header: 'Flight',
                accessor: (row) => row.flight,
                sortValue: (row) => row.flight,
              },
              {
                id: 'category',
                header: 'Category',
                accessor: (row) => row.category,
                sortValue: (row) => row.category,
                minWidth: '128px',
              },
              {
                id: 'area',
                header: 'Area',
                accessor: (row) => <span className="block max-w-[200px] break-words">{row.area}</span>,
                sortValue: (row) => row.area,
                minWidth: '200px',
              },
              {
                id: 'status',
                header: 'Status',
                accessor: (row) => row.status,
                sortValue: (row) => row.status,
              },
              {
                id: 'officialDelayCode',
                header: 'Official Delay',
                accessor: (row) => <span className="block max-w-[220px] break-words">{row.officialDelayCode}</span>,
                sortValue: (row) => row.officialDelayCode,
                minWidth: '220px',
              },
              {
                id: 'extractedDelaySignal',
                header: 'Extracted Signal',
                accessor: (row) => <span className="block max-w-[280px] break-words">{row.extractedDelaySignal}</span>,
                sortValue: (row) => row.extractedDelaySignal,
                minWidth: '280px',
              },
              {
                id: 'detail',
                header: 'Report Summary',
                accessor: (row) => (
                  <div className="max-w-[340px] space-y-1">
                    <p className="break-words font-semibold text-[var(--text-primary)]">{row.detail}</p>
                    <p className="break-words text-[0.76rem] text-[var(--text-muted)]">{row.rootSummary}</p>
                  </div>
                ),
                sortValue: (row) => row.detail,
                minWidth: '340px',
              },
            ]}
          />
        </div>
      </SummarySectionCard>
    </div>
  );
}
