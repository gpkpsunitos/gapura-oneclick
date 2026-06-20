'use client';

import { useDeferredValue, useMemo, type ReactNode } from 'react';
import type { Report } from '@/types';
import { normalizeText } from './summary/summary-utils';
import { useDrilldown } from '@/components/chart-detail/useDrilldown';
import { ChartAiAnalysisButton, type ChartAiContext } from '@/components/dashboard/ai/ChartAiAnalysisButton';
import { SectionAiSummaryInsightButton } from '@/components/dashboard/ai/SectionAiSummaryInsightButton';
import { isGseServiceReport } from '@/lib/report-normalization';

interface GsePerformanceTabProps {
  reports: Report[];
}

type CountRow = { id: string; label: string; total: number; sources: Set<string> };

const PANEL_FRAME = 'sr-table-card flex min-h-0 min-w-0 flex-col';

function val(v: unknown): string {
  return normalizeText(typeof v === 'string' ? v : '', '').trim();
}

function aggregate(reports: Report[], getValue: (r: Report) => string): CountRow[] {
  const buckets = new Map<string, CountRow>();
  reports.forEach((r) => {
    const raw = getValue(r);
    if (!raw) return;
    const key = raw.toLowerCase();
    const existing = buckets.get(key);
    if (existing) {
      existing.total += 1;
      existing.sources.add(raw);
    } else {
      buckets.set(key, { id: key, label: raw, total: 1, sources: new Set([raw]) });
    }
  });
  return Array.from(buckets.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function Panel({
  title,
  subtitle,
  total,
  children,
  className = '',
  aiContext,
}: {
  title: string;
  subtitle?: string;
  total?: number;
  children: ReactNode;
  className?: string;
  aiContext?: ChartAiContext;
}) {
  return (
    <div className={`${PANEL_FRAME} ${className}`}>
      <div className="sr-table-caption">
        <div className="sr-table-caption-title min-w-0">
          <span className="h-6 w-1 bg-[color:var(--sr-gold)]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-bold leading-snug tracking-[-0.02em] text-[color:var(--sr-text)]">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof total === 'number' ? (
            <span className="inline-flex items-baseline gap-1 rounded-md bg-[color:var(--sr-accent-soft)] px-2.5 py-1 text-[color:var(--sr-accent-dark)]">
              <span className="font-mono text-[15px] font-bold tabular-nums">{total}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">cases</span>
            </span>
          ) : null}
          {aiContext ? <ChartAiAnalysisButton context={aiContext} /> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function BarList({
  rows,
  emptyLabel,
  onOpen,
}: {
  rows: CountRow[];
  emptyLabel: string;
  onOpen: (row: CountRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[9rem] items-center justify-center text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        {emptyLabel}
      </div>
    );
  }

  const max = rows[0]?.total || 1;
  const totalValue = rows.reduce((sum, r) => sum + r.total, 0) || 1;

  return (
    <ol className="flex flex-col gap-2 p-3">
      {rows.map((row, idx) => {
        const barPct = Math.max(4, (row.total / max) * 100);
        const sharePct = (row.total / totalValue) * 100;
        const isTop = idx < 3;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="group flex w-full items-center gap-3 rounded-lg border border-[color:var(--sr-border)] bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--sr-accent)] hover:shadow-[0_8px_24px_-12px_rgba(6,78,59,0.25)]"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-bold tabular-nums ${
                  isTop
                    ? 'bg-[color:var(--sr-accent)] text-white'
                    : 'bg-[color:var(--sr-sunken)] text-[color:var(--sr-text-2)]'
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-[13px] font-semibold leading-snug text-[color:var(--sr-text)]">{row.label}</p>
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--sr-sunken)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--sr-accent)] transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--sr-text-3)]">
                    {sharePct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[18px] font-bold tabular-nums leading-none text-[color:var(--sr-text)]">
                {row.total}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type MatrixCell = { total: number; reports: Report[] };

function CrossMatrix({
  categories,
  matrix,
  motorizedTotal,
  nonMotorizedTotal,
  grandTotal,
  onOpen,
}: {
  categories: { id: string; label: string; total: number }[];
  matrix: Record<string, { motorized: MatrixCell; nonMotorized: MatrixCell }>;
  motorizedTotal: number;
  nonMotorizedTotal: number;
  grandTotal: number;
  onOpen: (reports: Report[], context: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="flex min-h-[9rem] items-center justify-center text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--sr-text-3)]">
        No data available
      </div>
    );
  }

  // Max cell value for shading intensity
  let maxCell = 0;
  categories.forEach((c) => {
    const row = matrix[c.id];
    if (!row) return;
    maxCell = Math.max(maxCell, row.motorized.total, row.nonMotorized.total);
  });

  const shade = (value: number) => {
    if (!value || !maxCell) return 'transparent';
    const intensity = Math.min(0.95, 0.12 + (value / maxCell) * 0.65);
    return `rgba(6, 78, 59, ${intensity.toFixed(3)})`;
  };

  return (
    <div className="overflow-auto p-3">
      <table className="sr-table w-full min-w-[640px] text-[13px]">
        <thead>
          <tr>
            <th className="sr-sticky-col-1 !text-left">Category Case GSE</th>
            <th className="sr-center">GSE Motorized</th>
            <th className="sr-center">GSE Non-Motorized</th>
            <th className="sr-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const row = matrix[cat.id] || {
              motorized: { total: 0, reports: [] },
              nonMotorized: { total: 0, reports: [] },
            };
            const mShade = shade(row.motorized.total);
            const nShade = shade(row.nonMotorized.total);
            const mFg = row.motorized.total / Math.max(1, maxCell) > 0.5 ? 'white' : 'var(--sr-text)';
            const nFg = row.nonMotorized.total / Math.max(1, maxCell) > 0.5 ? 'white' : 'var(--sr-text)';
            return (
              <tr key={cat.id}>
                <td className="sr-label sr-sticky-col-1 align-middle">{cat.label}</td>
                <td className="sr-center align-middle !p-0">
                  <button
                    type="button"
                    disabled={!row.motorized.total}
                    onClick={() => onOpen(row.motorized.reports, `${cat.label} · GSE Motorized`)}
                    className="h-full w-full px-3 py-3 font-mono text-[15px] font-bold tabular-nums transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
                    style={{ backgroundColor: mShade, color: row.motorized.total ? mFg : 'var(--sr-text-3)' }}
                  >
                    {row.motorized.total || '–'}
                  </button>
                </td>
                <td className="sr-center align-middle !p-0">
                  <button
                    type="button"
                    disabled={!row.nonMotorized.total}
                    onClick={() => onOpen(row.nonMotorized.reports, `${cat.label} · GSE Non-Motorized`)}
                    className="h-full w-full px-3 py-3 font-mono text-[15px] font-bold tabular-nums transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
                    style={{ backgroundColor: nShade, color: row.nonMotorized.total ? nFg : 'var(--sr-text-3)' }}
                  >
                    {row.nonMotorized.total || '–'}
                  </button>
                </td>
                <td className="sr-center align-middle font-mono text-[15px] font-bold tabular-nums">{cat.total}</td>
              </tr>
            );
          })}
          <tr>
            <td className="sr-label sr-sticky-col-1 align-middle !bg-[color:var(--sr-overlay)] font-bold uppercase tracking-[0.06em]">
              Grand Total
            </td>
            <td className="sr-center align-middle !bg-[color:var(--sr-overlay)] font-mono text-[15px] font-bold tabular-nums">
              {motorizedTotal}
            </td>
            <td className="sr-center align-middle !bg-[color:var(--sr-overlay)] font-mono text-[15px] font-bold tabular-nums">
              {nonMotorizedTotal}
            </td>
            <td className="sr-center align-middle !bg-[color:var(--sr-overlay)] font-mono text-[15px] font-bold tabular-nums">
              {grandTotal}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function GsePerformanceTab({ reports }: GsePerformanceTabProps) {
  const deferredReports = useDeferredValue(reports);
  const { openDrilldown, DrilldownRenderer } = useDrilldown();

  const gseReports = useMemo(
    () => deferredReports.filter(isGseServiceReport),
    [deferredReports]
  );

  const categoryRows = useMemo(
    () => aggregate(gseReports, (r) => val(r.category_case_gse)),
    [gseReports]
  );

  const motorizedRows = useMemo(
    () => aggregate(gseReports, (r) => val(r.gse_motorized)),
    [gseReports]
  );

  const nonMotorizedRows = useMemo(
    () => aggregate(gseReports, (r) => val(r.gse_non_motorized)),
    [gseReports]
  );

  const { matrix, motorizedTotal, nonMotorizedTotal, grandTotal } = useMemo(() => {
    const m: Record<string, { motorized: MatrixCell; nonMotorized: MatrixCell }> = {};
    let mTot = 0;
    let nTot = 0;
    let gTot = 0;

    gseReports.forEach((r) => {
      const cat = val(r.category_case_gse);
      if (!cat) return;
      const key = cat.toLowerCase();
      if (!m[key]) m[key] = { motorized: { total: 0, reports: [] }, nonMotorized: { total: 0, reports: [] } };

      const hasMotor = !!val(r.gse_motorized);
      const hasNonMotor = !!val(r.gse_non_motorized);
      if (hasMotor) {
        m[key].motorized.total += 1;
        m[key].motorized.reports.push(r);
        mTot += 1;
        gTot += 1;
      } else if (hasNonMotor) {
        m[key].nonMotorized.total += 1;
        m[key].nonMotorized.reports.push(r);
        nTot += 1;
        gTot += 1;
      } else {
        gTot += 1; // category counted even when neither column populated
      }
    });
    return { matrix: m, motorizedTotal: mTot, nonMotorizedTotal: nTot, grandTotal: gTot };
  }, [gseReports]);

  const matrixCategories = useMemo(
    () => categoryRows.map((row) => ({ id: row.id, label: row.label, total: row.total })),
    [categoryRows]
  );

  const sectionAiContext = useMemo(
    () => ({
      section: 'GSE Performance',
      title: 'GSE Performance',
      chartType: 'gse_availability_overview',
      chartData: [
        ...categoryRows.map((r) => ({ label: `Category: ${r.label}`, value: r.total })),
        ...motorizedRows.map((r) => ({ label: `Motorized: ${r.label}`, value: r.total })),
        ...nonMotorizedRows.map((r) => ({ label: `Non-Motorized: ${r.label}`, value: r.total })),
      ],
      featureHints: ['summarization', 'rootCause', 'riskScoring', 'actionRecommendation'],
    }),
    [categoryRows, motorizedRows, nonMotorizedRows]
  );

  return (
    <div className="sr-scope space-y-6 bg-[color:var(--sr-canvas)] px-4 py-6 pb-10 text-[color:var(--sr-text)] sm:px-6 lg:px-8">
      <div className="sr-card relative flex flex-col gap-4 overflow-hidden px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-[5px] bg-[color:var(--sr-accent)]" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="inline-block h-12 w-[6px] shrink-0 rounded bg-[color:var(--sr-accent)] shadow-[5px_0_0_var(--sr-gold)]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(26px,2.4vw,34px)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--sr-text)]">
              GSE Performance
            </h1>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--sr-text-3)]">
              GSE availability · {grandTotal} cases · {matrixCategories.length} categories
            </p>
          </div>
        </div>
        <SectionAiSummaryInsightButton context={sectionAiContext} />
      </div>

      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>GSE Availability Overview</h2>
        </div>
        <Panel
          title="GSE Availability Category"
          total={grandTotal}
          aiContext={{
            section: 'GSE Performance',
            chartTitle: 'GSE Availability Category Matrix',
            chartType: 'category_equipment_matrix',
            chartData: matrixCategories.map((cat) => ({
              category: cat.label,
              motorized: matrix[cat.id]?.motorized.total || 0,
              non_motorized: matrix[cat.id]?.nonMotorized.total || 0,
              total: cat.total,
            })),
            featureHints: ['riskScoring', 'rootCause', 'summarization'],
          }}
        >
          <CrossMatrix
            categories={matrixCategories}
            matrix={matrix}
            motorizedTotal={motorizedTotal}
            nonMotorizedTotal={nonMotorizedTotal}
            grandTotal={grandTotal}
            onOpen={(items, context) => openDrilldown(items, context)}
          />
        </Panel>
      </section>

      <section>
        <div className="sr-section-h">
          <span className="sr-section-rule" aria-hidden="true" />
          <h2>Breakdown by Equipment Class</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel
            title="Category Case GSE"
            total={categoryRows.reduce((s, r) => s + r.total, 0)}
            aiContext={{
              section: 'GSE Performance',
              chartTitle: 'Category Case GSE',
              chartType: 'category_breakdown',
              chartData: categoryRows.map((r) => ({ name: r.label, total: r.total })),
              featureHints: ['riskScoring', 'summarization', 'actionRecommendation'],
            }}
          >
            <BarList
              rows={categoryRows}
              emptyLabel="No category data"
              onOpen={(row) =>
                openDrilldown(
                  gseReports.filter((r) => val(r.category_case_gse).toLowerCase() === row.id),
                  `Category Case GSE: ${row.label}`
                )
              }
            />
          </Panel>

          <Panel
            title="GSE Motorized"
            total={motorizedRows.reduce((s, r) => s + r.total, 0)}
            aiContext={{
              section: 'GSE Performance',
              chartTitle: 'GSE Motorized',
              chartType: 'motorized_breakdown',
              chartData: motorizedRows.map((r) => ({ name: r.label, total: r.total })),
              featureHints: ['riskScoring', 'rootCause', 'actionRecommendation'],
            }}
          >
            <BarList
              rows={motorizedRows}
              emptyLabel="No motorized data"
              onOpen={(row) =>
                openDrilldown(
                  gseReports.filter((r) => val(r.gse_motorized).toLowerCase() === row.id),
                  `GSE Motorized: ${row.label}`
                )
              }
            />
          </Panel>

          <Panel
            title="GSE Non-Motorized"
            total={nonMotorizedRows.reduce((s, r) => s + r.total, 0)}
            className="md:col-span-2 xl:col-span-1"
            aiContext={{
              section: 'GSE Performance',
              chartTitle: 'GSE Non-Motorized',
              chartType: 'non_motorized_breakdown',
              chartData: nonMotorizedRows.map((r) => ({ name: r.label, total: r.total })),
              featureHints: ['riskScoring', 'rootCause', 'actionRecommendation'],
            }}
          >
            <BarList
              rows={nonMotorizedRows}
              emptyLabel="No non-motorized data"
              onOpen={(row) =>
                openDrilldown(
                  gseReports.filter((r) => val(r.gse_non_motorized).toLowerCase() === row.id),
                  `GSE Non-Motorized: ${row.label}`
                )
              }
            />
          </Panel>
        </div>
      </section>

      {DrilldownRenderer()}
    </div>
  );
}
