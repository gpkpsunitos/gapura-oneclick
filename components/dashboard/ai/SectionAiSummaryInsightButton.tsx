'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Brain, Loader2, Sparkles, Table2, TrendingUp } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type SectionAiContext = {
  section: string;
  title: string;
  chartType: string;
  chartData: unknown;
  featureHints?: string[];
  filters?: Record<string, unknown>;
};

type SummaryTableRow = {
  label: string;
  value: number | string;
  note?: string;
};

type SummaryChartRow = {
  label: string;
  value: number;
};

type SectionSummaryResponse = {
  status: string;
  cached?: boolean;
  generatedAt: string;
  model: string;
  section: string;
  executiveSummary: string;
  keyPoints: string[];
  table: SummaryTableRow[];
  chart: SummaryChartRow[];
  predictiveSummary: string;
  insights: string[];
};

type FeatureResult = {
  key: string;
  label: string;
  summary: string;
  chartSignal: string[];
  recommendations: string[];
  visual?: {
    type: 'bar' | 'forecast' | 'table';
    rows: Array<{
      label: string;
      value?: number;
      secondary?: string;
      score?: number;
    }>;
  };
};

type InsightResponse = {
  status: string;
  generatedAt: string;
  context: { section: string; chartTitle: string; chartType: string };
  features: FeatureResult[];
};

const summaryMemoryCache = new Map<string, SectionSummaryResponse>();
const insightMemoryCache = new Map<string, InsightResponse>();
const CHART_COLORS = ['#007073', '#d9911e', '#42a85b', '#0f86c1', '#b7472a', '#61706a'];

function stableKey(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(Date.now());
  }
}

function formatNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('en-US') : String(value ?? '-');
}

function buildLocalFallbackRows(chartData: unknown): SummaryChartRow[] {
  if (!Array.isArray(chartData)) return [];

  return chartData
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const label = String(row.name ?? row.label ?? row.month ?? row.category ?? row.branch ?? row.airline ?? row.title ?? `Row ${index + 1}`);
      const value = Number(row.value ?? row.total ?? row.count ?? row.grandTotal ?? row.total_records ?? 0);
      return label && Number.isFinite(value) ? { label, value } : null;
    })
    .filter((row): row is SummaryChartRow => Boolean(row))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function SectionAiSummaryInsightButton({ context }: { context: SectionAiContext }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'insight'>('summary');
  const [summary, setSummary] = useState<SectionSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const cacheKey = useMemo(() => stableKey(context), [context]);

  async function loadSummary() {
    if (summaryLoading || summary) return;
    const cached = summaryMemoryCache.get(cacheKey);
    if (cached) {
      setSummary(cached);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch('/api/ai/section-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `AI summary failed (${response.status})`);
      summaryMemoryCache.set(cacheKey, payload);
      setSummary(payload);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Failed to load AI summary');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadInsight() {
    if (insightLoading || insight) return;
    const cached = insightMemoryCache.get(cacheKey);
    if (cached) {
      setInsight(cached);
      return;
    }

    setInsightLoading(true);
    setInsightError(null);
    try {
      const response = await fetch('/api/ai/chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: context.section,
          chartTitle: context.title,
          chartType: context.chartType,
          chartData: context.chartData,
          featureHints: context.featureHints,
          filters: context.filters,
          fast: false,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `AI insight failed (${response.status})`);
      insightMemoryCache.set(cacheKey, payload);
      setInsight(payload);
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : 'Failed to load AI insight');
    } finally {
      setInsightLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'summary') void loadSummary();
    if (activeTab === 'insight') void loadInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab]);

  const openModal = () => {
    window.alert('Coming soon\n\nThis feature is still on development');
  };

  const fallbackRows = buildLocalFallbackRows(context.chartData);
  const summaryChartRows = summary?.chart?.length ? summary.chart : fallbackRows;
  const summaryTableRows = summary?.table?.length ? summary.table : fallbackRows.map((row) => ({ ...row, note: 'Local section signal' }));

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="group relative inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-900 shadow-[0_12px_28px_-16px_rgba(4,120,87,0.55),0_0_0_1px_rgba(217,145,30,0.18)_inset] transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_16px_34px_-18px_rgba(180,83,9,0.55),0_0_0_1px_rgba(217,145,30,0.28)_inset] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2"
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(217,145,30,0.18)_46%,transparent_72%)] opacity-55 transition group-hover:opacity-80" aria-hidden="true" />
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-300/70">
          <Brain size={15} />
        </span>
        <span className="relative z-10 whitespace-nowrap">AI Summary &amp; Insight</span>
        <Sparkles size={14} className="relative z-10 text-amber-500" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(96vw,1040px)] overflow-y-auto bg-[#fbfdf8] p-0 sm:max-w-[1040px]">
          <div className="border-b border-[#d7ded2] bg-white px-5 py-4 pr-12">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="h-9 w-[4px] bg-[#007073] shadow-[7px_0_0_#d9911e]" aria-hidden="true" />
                <div className="min-w-0">
                  <SheetTitle className="truncate text-[22px] font-black tracking-[-0.02em] text-[#007073]">
                    {context.title}
                  </SheetTitle>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#61706a]">
                    AI Summary & Insight
                  </p>
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="px-5 py-4">
            <div className="grid grid-cols-2 border border-[#8a8a8a] bg-white text-[12px] font-black uppercase tracking-[0.12em] text-[#24322a]">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex h-10 items-center justify-center gap-2 border-r border-[#8a8a8a] transition ${activeTab === 'summary' ? 'bg-[#72bf75] text-[#0f2415]' : 'hover:bg-[#eef7ef]'}`}
              >
                <Sparkles size={15} />
                AI Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('insight')}
                className={`flex h-10 items-center justify-center gap-2 transition ${activeTab === 'insight' ? 'bg-[#72bf75] text-[#0f2415]' : 'hover:bg-[#eef7ef]'}`}
              >
                <TrendingUp size={15} />
                AI Insight
              </button>
            </div>

            <div className="mt-4">
              {activeTab === 'summary' ? (
                <SummaryPanel
                  loading={summaryLoading}
                  error={summaryError}
                  summary={summary}
                  tableRows={summaryTableRows}
                  chartRows={summaryChartRows}
                />
              ) : (
                <InsightPanel loading={insightLoading} error={insightError} insight={insight} />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center border border-[#cfd8ce] bg-white">
      <div className="flex items-center gap-3 text-sm font-black text-[#61706a]">
        <Loader2 className="animate-spin" size={20} />
        {label}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="border border-[#b7472a] bg-[#fff7f0] px-4 py-3 text-sm font-bold text-[#8a321d]">
      {message}
    </div>
  );
}

function SummaryPanel({
  loading,
  error,
  summary,
  tableRows,
  chartRows,
}: {
  loading: boolean;
  error: string | null;
  summary: SectionSummaryResponse | null;
  tableRows: SummaryTableRow[];
  chartRows: SummaryChartRow[];
}) {
  if (loading) return <LoadingState label="Building AI summary..." />;
  if (error) return <ErrorState message={error} />;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="border border-[#cfd8ce] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.12)]">
        <p className="text-[15px] font-semibold leading-7 text-[#263033]">{summary.executiveSummary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#61706a]">
          <span className="border border-[#cfd8ce] bg-[#fbfdf8] px-2 py-1">{summary.model}</span>
          <span className="border border-[#cfd8ce] bg-[#fbfdf8] px-2 py-1">{summary.cached ? 'Cached' : 'Fresh'}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
        <DataTable title="AI Summary Table" rows={tableRows} />
        <SummaryChart rows={chartRows} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PointList title="Key Summary" items={summary.keyPoints} />
        <PointList title="AI Insights" items={summary.insights} />
      </div>

      <div className="border border-[#cfd8ce] bg-white p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007073]">Predictive Summary</div>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#263033]">{summary.predictiveSummary}</p>
      </div>
    </div>
  );
}

function DataTable({ title, rows }: { title: string; rows: SummaryTableRow[] }) {
  return (
    <div className="min-h-[260px] overflow-hidden border border-[#cfd8ce] bg-white">
      <div className="flex h-10 items-center gap-2 border-b border-[#d7ded2] bg-[#fbfdf8] px-3">
        <Table2 size={15} className="text-[#d9911e]" />
        <h3 className="text-sm font-black text-[#1f2a2d]">{title}</h3>
      </div>
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#72bf75] text-[#0f2415]">
              <th className="border border-[#6f6f6f] px-3 py-2 text-left font-black">Signal</th>
              <th className="border border-[#6f6f6f] px-3 py-2 text-right font-black">Value</th>
              <th className="border border-[#6f6f6f] px-3 py-2 text-left font-black">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className="hover:bg-[#eef7ef]">
                <td className="border border-[#8a8a8a] px-3 py-2 font-bold text-[#263033]">{row.label}</td>
                <td className="border border-[#8a8a8a] px-3 py-2 text-right font-black text-[#1f2a2d]">{formatNumber(row.value)}</td>
                <td className="border border-[#8a8a8a] px-3 py-2 font-semibold text-[#61706a]">{row.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryChart({ rows }: { rows: SummaryChartRow[] }) {
  return (
    <div className="min-h-[260px] border border-[#cfd8ce] bg-white p-3">
      <div className="mb-3 text-sm font-black text-[#1f2a2d]">AI Summary Chart</div>
      {rows.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm font-bold text-[#61706a]">No chart data</div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid stroke="#dce5dc" strokeDasharray="3 5" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#1f2a2d', fontSize: 10, fontWeight: 800 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={118} tick={{ fill: '#1f2a2d', fontSize: 10, fontWeight: 800 }} interval={0} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {rows.slice(0, 8).map((row, index) => (
                  <Cell key={row.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PointList({ title, items }: { title: string; items: string[] }) {

  const cleaned = items
    .map((item) => String(item ?? '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return (
      <div className="border border-dashed border-[#cfd8ce] bg-white p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#61706a]">{title}</div>
        <p className="mt-2 text-sm font-semibold text-[#61706a]">No signal returned for this section.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#cfd8ce] bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007073]">{title}</div>
      <ul className="mt-3 space-y-2">
        {cleaned.slice(0, 6).map((item, index) => (
          <li key={`${item}-${index}`} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 text-sm font-semibold leading-6 text-[#263033]">
            <span className="text-right font-black text-[#d9911e]">{index + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightPanel({ loading, error, insight }: { loading: boolean; error: string | null; insight: InsightResponse | null }) {
  if (loading) return <LoadingState label="Building AI insight..." />;
  if (error) return <ErrorState message={error} />;
  if (!insight) return null;

  const features = Array.isArray(insight.features) ? insight.features : [];
  return (
    <div className="space-y-4">
      {features.map((feature) => (
        <FeatureInsightCard key={feature.key} feature={feature} />
      ))}
    </div>
  );
}

function FeatureInsightCard({ feature }: { feature: FeatureResult }) {
  return (
    <div className="border border-[#cfd8ce] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[16px] font-black text-[#1f2a2d]">{feature.label}</h3>
          {feature.summary ? (
            <p className="mt-1 text-sm font-semibold leading-6 text-[#61706a]">{feature.summary}</p>
          ) : null}
        </div>
      </div>
      <FeatureVisual visual={feature.visual} />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PointList title="Endpoint Signal" items={feature.chartSignal || []} />
        {}
        <PointList title="Recommended Action" items={feature.recommendations || []} />
      </div>
    </div>
  );
}

function FeatureVisual({ visual }: { visual?: FeatureResult['visual'] }) {
  if (!visual?.rows?.length) return null;

  const rows = visual.rows
    .filter((row) => {
      const label = String(row.label ?? '').trim();
      if (!label || label.toLowerCase() === 'unknown') return false;
      const v = Number(row.value ?? row.score ?? 0);
      return Number.isFinite(v) && v > 0;
    })
    .slice(0, 8);
  if (rows.length === 0) return null;

  if (visual.type === 'bar' || visual.type === 'forecast') {
    return (
      <div className="mt-4 h-[300px] border border-[#d7ded2] bg-[#fbfdf8] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#dce5dc" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#1f2a2d', fontSize: 10, fontWeight: 800 }} interval={0} />
            <YAxis tick={{ fill: '#1f2a2d', fontSize: 10, fontWeight: 800 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#007073" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[0.44fr_0.56fr]">
      <div className="h-[260px] border border-[#d7ded2] bg-[#fbfdf8] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {}
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              outerRadius={92}
              label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
            >
              {rows.map((row, index) => (
                <Cell key={row.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString('en-US')} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <DataTable title="AI Insight Table" rows={rows.map((row) => ({ label: row.label, value: row.value ?? row.score ?? '-', note: row.secondary }))} />
    </div>
  );
}
