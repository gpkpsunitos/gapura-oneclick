'use client';

import { Fragment, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleGauge,
  Search,
  ShieldCheck,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import {
  fetchGseIssuesTop,
  fetchGseServiceability,
  fetchGseIrregularities,
  fetchGseRanking,
  toNumber,
  sumMap,
  normalizeDistribution,
  toDonutData,
  type GseIssuesTopResponse,
  type GseServiceabilityResponse,
  type GseIrregularitiesResponse,
  type GseRankingResponse,
  type GseIrregularityCase,
} from '@/lib/gse-api';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'equipment' | 'cases';

interface StatCardProps {
  icon: ElementType;
  label: string;
  value: string;
  caption: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}

const STATUS_ORDER = ['Serviceable', 'Needs Maintenance', 'Unserviceable', 'Unavailable', 'Unknown'];

function StatCard({ icon: Icon, label, value, caption, tone }: StatCardProps) {
  const colors = {
    blue: {
      icon: 'bg-sky-100 text-sky-700',
      value: 'text-sky-900',
      border: 'border-sky-200',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-900',
      border: 'border-emerald-200',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-amber-900',
      border: 'border-amber-200',
    },
    rose: {
      icon: 'bg-rose-100 text-rose-700',
      value: 'text-rose-900',
      border: 'border-rose-200',
    },
  }[tone];

  return (
    <div className={`rounded-2xl border bg-[var(--surface-1)] p-4 shadow-spatial-sm ${colors.border}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${colors.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-black tracking-tight ${colors.value}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{caption}</p>
    </div>
  );
}

function toneForStatus(status: string): string {
  if (status === 'Serviceable') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Needs Maintenance') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Unserviceable') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'Unavailable') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function ProgressBar({ value, max, color = 'from-emerald-500 to-sky-500' }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full bg-gray-100">
      <div className={`h-1.5 rounded-full bg-gradient-to-r ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function GseDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [issuesData, setIssuesData] = useState<GseIssuesTopResponse | null>(null);
  const [serviceData, setServiceData] = useState<GseServiceabilityResponse | null>(null);
  const [irregularitiesData, setIrregularitiesData] = useState<GseIrregularitiesResponse | null>(null);
  const [rankBranch, setRankBranch] = useState<GseRankingResponse | null>(null);
  const [rankArea, setRankArea] = useState<GseRankingResponse | null>(null);
  const [rankAirline, setRankAirline] = useState<GseRankingResponse | null>(null);

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [expandedCaseIndex, setExpandedCaseIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        const [issues, service, irregularities, branch, area, airline] = await Promise.all([
          fetchGseIssuesTop('OT'),
          fetchGseServiceability('OT'),
          fetchGseIrregularities('OT'),
          fetchGseRanking('branch', 'OT'),
          fetchGseRanking('area', 'OT'),
          fetchGseRanking('airline', 'OT'),
        ]);

        if (mounted) {
          setIssuesData(issues);
          setServiceData(service);
          setIrregularitiesData(irregularities);
          setRankBranch(branch);
          setRankArea(area);
          setRankAirline(airline);
        }
      } catch {
        if (mounted) setError('Gagal memuat data GSE');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  const totalRecords = toNumber(issuesData?.total_gse_records);
  const topCategory = issuesData?.top;
  const topSubcategory = issuesData?.top_subcategory;
  const topRootCause = issuesData?.top_root_cause;

  const distributionList = useMemo(
    () => normalizeDistribution(issuesData?.distribution),
    [issuesData]
  );

  const subcategoryList = useMemo(
    () => normalizeDistribution(issuesData?.distribution_subcategory),
    [issuesData]
  );

  const rootCauseList = useMemo(
    () => normalizeDistribution(issuesData?.distribution_root_cause),
    [issuesData]
  );

  const serviceabilityList = useMemo(
    () => normalizeDistribution(serviceData?.serviceability_distribution),
    [serviceData]
  );

  const totalServiceability = useMemo(
    () => serviceabilityList.reduce((sum, item) => sum + item.count, 0),
    [serviceabilityList]
  );

  const serviceableCount = useMemo(
    () => serviceabilityList.find((s) => s.name === 'Serviceable')?.count || 0,
    [serviceabilityList]
  );

  const serviceabilityRate = totalServiceability > 0
    ? (serviceableCount / totalServiceability) * 100
    : 0;

  const equipmentRows = useMemo(() => {
    if (!serviceData?.equipment_status) return [];
    return serviceData.equipment_status
      .map((e) => ({
        equipment: e.equipment || 'Unknown',
        total: toNumber(e.total),
        counts: e.counts || {},
      }))
      .sort((a, b) => b.total - a.total);
  }, [serviceData]);

  const casesList = useMemo(() => irregularitiesData?.cases || [], [irregularitiesData]);

  const tagOptions = useMemo(() => {
    const set = new Set(casesList.map((c) => c.tag?.trim() || 'Unknown'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [casesList]);

  const branchOptions = useMemo(() => {
    const set = new Set(casesList.map((c) => c.branch?.trim() || 'Unknown'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [casesList]);

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return casesList.filter((c) => {
      const tag = c.tag?.trim() || 'Unknown';
      const branch = c.branch?.trim() || 'Unknown';

      if (tagFilter !== 'ALL' && tag !== tagFilter) return false;
      if (branchFilter !== 'ALL' && branch !== branchFilter) return false;
      if (!keyword) return true;

      const haystack = [
        c.branch,
        c.airline,
        c.area,
        c.tag,
        c.rc_category,
        c.report_preview,
        c.root_cause_preview,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [casesList, search, tagFilter, branchFilter]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'cases', label: 'Cases' },
  ];

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#f4fff6] via-[#f6fbff] to-[#fff8f1] p-6 shadow-spatial-sm">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <Wrench className="h-3.5 w-3.5" />
              OT Command Center
            </span>
            <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
              GSE Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            GSE Command Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            Analisis kasus GSE: distribusi kategori, status kelaikan peralatan, ranking entitas, dan daftar kasus irregularity.
          </p>
        </div>

        <div className="relative z-10 mt-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition',
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && activeTab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CircleGauge}
              label="Total GSE Records"
              value={totalRecords.toLocaleString('id-ID')}
              caption="Total kasus teridentifikasi GSE"
              tone="blue"
            />
            <StatCard
              icon={BarChart3}
              label="Top Category"
              value={topCategory?.category || '-'}
              caption={topCategory ? `${topCategory.count} kasus (${topCategory.percentage.toFixed(1)}%)` : 'Belum ada data'}
              tone="emerald"
            />
            <StatCard
              icon={Wrench}
              label="Top Subcategory"
              value={topSubcategory?.subcategory || '-'}
              caption={topSubcategory ? `${topSubcategory.count} kasus` : 'Belum ada data'}
              tone="amber"
            />
            <StatCard
              icon={AlertTriangle}
              label="Top Root Cause"
              value={topRootCause?.category || '-'}
              caption={topRootCause ? `${topRootCause.count} kasus` : 'Belum ada data'}
              tone="rose"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Distribusi Kategori (SDA/SDM/Maintenance)
              </h2>
              <div className="space-y-3">
                {distributionList.map((item) => (
                  <div key={item.name} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="font-bold text-gray-800">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <ProgressBar value={item.count} max={distributionList[0]?.count || 1} />
                  </div>
                ))}
                {distributionList.length === 0 && (
                  <p className="text-xs text-gray-400">Data belum tersedia.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Distribusi Subkategori
              </h2>
              <ResponsivePieChart
                data={toDonutData(subcategoryList)}
                donut
                showLegend
                percentageLabels
                innerRadius={60}
                height="h-[280px]"
              />
            </div>

            <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Distribusi Root Cause
              </h2>
              <div className="space-y-2">
                {rootCauseList.slice(0, 6).map((item) => (
                  <div key={item.name} className="rounded-lg border border-gray-200 bg-white p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-gray-700">{item.name}</span>
                      <span className="ml-2 font-bold text-gray-800">{item.count}</span>
                    </div>
                    <ProgressBar value={item.count} max={rootCauseList[0]?.count || 1} color="from-amber-500 to-rose-500" />
                  </div>
                ))}
                {rootCauseList.length === 0 && (
                  <p className="text-xs text-gray-400">Data belum tersedia.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
              Ranking Entitas
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { title: 'Top Branches', data: rankBranch?.top || [] },
                { title: 'Top Areas', data: rankArea?.top || [] },
                { title: 'Top Airlines', data: rankAirline?.top || [] },
              ].map((group) => (
                <div key={group.title} className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {group.data.slice(0, 5).map((item, idx) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="font-bold text-gray-800">{item.count}</span>
                        </div>
                        <ProgressBar value={item.count} max={group.data[0]?.count || 1} />
                      </div>
                    ))}
                    {group.data.length === 0 && (
                      <p className="text-xs text-gray-400">Belum ada data</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {issuesData?.top_samples && Object.keys(issuesData.top_samples).length > 0 && (
            <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Sample Cases per Category
              </h2>
              <div className="space-y-3">
                {Object.entries(issuesData.top_samples).map(([category, samples]) => {
                  if (!samples || samples.length === 0) return null;
                  return (
                    <div key={category} className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                        {category}
                      </p>
                      <div className="space-y-2">
                        {samples.slice(0, 3).map((s, i) => (
                          <div key={`${s.row_id}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                            <p className="text-xs font-medium text-gray-700">{s.report || '-'}</p>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Branch: {s.branch || '-'} | Area: {s.area || '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && activeTab === 'equipment' && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Wrench}
              label="Total Units"
              value={totalServiceability.toLocaleString('id-ID')}
              caption="Total peralatan GSE"
              tone="blue"
            />
            <StatCard
              icon={ShieldCheck}
              label="Serviceable"
              value={serviceableCount.toLocaleString('id-ID')}
              caption={`${serviceabilityRate.toFixed(1)}% dari total`}
              tone="emerald"
            />
            <StatCard
              icon={Activity}
              label="Unserviceable"
              value={(serviceabilityList.find((s) => s.name === 'Unserviceable')?.count || 0).toLocaleString('id-ID')}
              caption="Tidak layak pakai"
              tone="rose"
            />
            <StatCard
              icon={AlertTriangle}
              label="Needs Maintenance"
              value={(serviceabilityList.find((s) => s.name === 'Needs Maintenance')?.count || 0).toLocaleString('id-ID')}
              caption="Perlu perbaikan"
              tone="amber"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Distribusi Serviceability
              </h2>
              <ResponsivePieChart
                data={toDonutData(serviceabilityList)}
                donut
                showLegend
                percentageLabels
                innerRadius={60}
                height="h-[300px]"
              />
            </div>

            <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-7">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
                Status per Equipment
              </h2>
              <div className="space-y-2">
                {serviceabilityList.map((item) => {
                  const width = totalServiceability > 0 ? (item.count / totalServiceability) * 100 : 0;
                  return (
                    <div key={item.name} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(item.name)}`}>
                          {item.name}
                        </span>
                        <span className="text-xs font-bold text-gray-700">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800">
              Detail Equipment
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Equipment</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Total</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Status Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentRows.map((row) => (
                    <tr key={row.equipment} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{row.equipment}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{row.total}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_ORDER.map((status) => {
                            const count = toNumber(row.counts?.[status]);
                            if (count <= 0) return null;
                            return (
                              <span
                                key={`${row.equipment}-${status}`}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(status)}`}
                              >
                                {status}: {count}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {equipmentRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-sm text-gray-400">
                        Data equipment belum tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && activeTab === 'cases' && (
        <>
          <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                Tag Distribution
              </h2>
              <span className="text-xs text-gray-500">
                Total: {irregularitiesData?.total_gse_irregularity_cases || 0} cases
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(irregularitiesData?.distribution_by_tag || {}).map(([tag, entry]) => (
                <span
                  key={tag}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                >
                  {tag}: {entry.count} ({entry.percentage.toFixed(1)}%)
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                Irregularity Cases
              </h2>
              <p className="text-xs text-gray-500">Filter dan cari kasus irregularity terkait GSE.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari laporan, branch, airline..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-300"
                />
              </label>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
              >
                <option value="ALL">Semua Tag</option>
                {tagOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
              >
                <option value="ALL">Semua Branch</option>
                {branchOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Menampilkan {filteredCases.length.toLocaleString('id-ID')} dari {casesList.length.toLocaleString('id-ID')} kasus
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {['Branch', 'Airline', 'Area', 'Tag', 'RC Category', 'Report', 'Aksi'].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.slice(0, 50).map((c, idx) => {
                    const isExpanded = expandedCaseIndex === idx;
                    return (
                      <Fragment key={`${c.branch}-${c.airline}-${idx}`}>
                        <tr className="border-t border-gray-100 align-top">
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{c.branch || '-'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-700">{c.airline || '-'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-700">{c.area || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {c.tag || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-700">{c.rc_category || '-'}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">
                            <p className="line-clamp-2 max-w-md">{c.report_preview || '-'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setExpandedCaseIndex(isExpanded ? null : idx)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition',
                                isExpanded
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              )}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> View
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-emerald-100 bg-emerald-50/30">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    Report Preview
                                  </p>
                                  <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">
                                    {c.report_preview || '-'}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    Root Cause Preview
                                  </p>
                                  <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">
                                    {c.root_cause_preview || '-'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                                <span>Sheet: {c.sheet || '-'}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                        Tidak ada data yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
