'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Plane, ShieldCheck } from 'lucide-react';
import { AnalyticsMetricCard } from '@/components/dashboard/analytics-metric-card';
import { AnalyticsSection, AnalyticsSourceStrip, AnalyticsUnavailable } from '@/components/dashboard/analytics-source-strip';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';

type DistributionRow = {
  name: string;
  value: number;
};

type NonComplianceRow = {
  Kategori: string;
  Area: string;
  Perfomance: string;
  Airline: string;
  Cab: string;
  Reasons: string;
};

type ServiceRow = {
  Airline: string;
  Cab: string;
  Reasons: string;
};

type SlaPayload = {
  filters: {
    categories: string[];
    areas: string[];
    airlines: string[];
    branches: string[];
  };
  stats: {
    categoryDistribution: DistributionRow[];
    areaDistribution: DistributionRow[];
    bagHandlingPerformance: DistributionRow[];
  };
  nonCompliance: NonComplianceRow[];
  avsec: ServiceRow[];
  bagHandling: Array<ServiceRow & { BagHandlingPerformance: string }>;
  debrief: Array<ServiceRow & { Finishing: string | null }>;
};

const SOURCE_CONFIG = getShortcutSourceConfig('slaCompliance');

export default function OPSLACompliance() {
  const [data, setData] = useState<SlaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: 'All',
    area: 'All',
    airline: 'All',
    branch: 'All',
  });
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== 'All') params.set(key, value);
        });

        const response = await fetch(`/api/sla/full-service?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as SlaPayload;
        if (!active) return;
        setData(payload);
        setRealStatus({
          count:
            (payload.nonCompliance?.length || 0) +
            (payload.avsec?.length || 0) +
            (payload.bagHandling?.length || 0) +
            (payload.debrief?.length || 0),
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data SLA');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters]);

  const topReason = useMemo(() => {
    const counts = new Map<string, number>();
    data?.nonCompliance?.forEach((row) => {
      if (!row.Reasons) return;
      counts.set(row.Reasons, (counts.get(row.Reasons) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)[0];
  }, [data]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="SLA Compliance"
        description="Halaman ini sepenuhnya memakai dataset SLA Full Service dari `SLA_FULL_SERVICE_SHEET_ID`. Tidak ada pencampuran dengan data laporan utama atau output AI."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
      />

      <AnalyticsSection
        title="Distribusi SLA Real"
        description="Chart di bawah ini berasal dari sheet SLA Full Service yang sesuai dengan env `SLA_FULL_SERVICE_SHEET_ID`."
        variant="real"
      >
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="mb-5 flex flex-wrap gap-3">
          {[
            { key: 'category', label: 'Category', options: data?.filters.categories || [] },
            { key: 'area', label: 'Area', options: data?.filters.areas || [] },
            { key: 'airline', label: 'Airline', options: data?.filters.airlines || [] },
            { key: 'branch', label: 'Branch', options: data?.filters.branches || [] },
          ].map((filter) => (
            <label key={filter.key} className="flex min-w-[12rem] flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {filter.label}
              <select
                value={filters[filter.key as keyof typeof filters]}
                onChange={(event) => setFilters((current) => ({ ...current, [filter.key]: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="All">All</option>
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={ClipboardCheck} label="Non Compliance" value={(data?.nonCompliance.length || 0).toLocaleString('id-ID')} caption="Baris Sheet1" tone="real" />
          <AnalyticsMetricCard icon={ShieldCheck} label="AVSEC" value={(data?.avsec.length || 0).toLocaleString('id-ID')} caption="Baris AVSEC" tone="real" />
          <AnalyticsMetricCard icon={CheckCircle2} label="Bag Handling" value={(data?.bagHandling.length || 0).toLocaleString('id-ID')} caption="Baris Bag Handling" tone="real" />
          <AnalyticsMetricCard icon={Plane} label="Top Reason" value={topReason?.name || '-'} caption={`${topReason?.count || 0} kejadian`} tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={data?.stats.categoryDistribution || []} title="Kategori Non Compliance" donut showLegend percentageLabels height="h-[280px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={data?.stats.areaDistribution || []} title="Distribusi Area" donut showLegend percentageLabels height="h-[280px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Bag Handling Performance</h3>
              <p className="text-xs text-slate-600">Distribusi performa pada sheet Bag Handling.</p>
            </div>
            <ResponsiveBarChart data={data?.stats.bagHandlingPerformance || []} xAxisKey="name" dataKeys={['value']} showLegend={false} height="h-[280px]" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <h3 className="mb-3 text-sm font-black text-slate-900">Top Non-Compliance Records</h3>
            <div className="max-h-[24rem] overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Cabang</th>
                    <th className="px-4 py-3">Airline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.nonCompliance || []).slice(0, 20).map((row, index) => (
                    <tr key={`${row.Kategori}-${row.Cab}-${index}`} className="bg-white">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.Kategori}</td>
                      <td className="px-4 py-3 text-slate-600">{row.Area}</td>
                      <td className="px-4 py-3 text-slate-600">{row.Cab}</td>
                      <td className="px-4 py-3 text-slate-600">{row.Airline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <h3 className="mb-3 text-sm font-black text-slate-900">Service Snapshot</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">AVSEC</div>
                <div className="text-3xl font-black text-slate-900">{(data?.avsec.length || 0).toLocaleString('id-ID')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Debrief</div>
                <div className="text-3xl font-black text-slate-900">{(data?.debrief.length || 0).toLocaleString('id-ID')}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">
                {loading ? 'Memuat data SLA...' : `Dataset SLA aktif dengan total ${(realStatus?.count || 0).toLocaleString('id-ID')} record terfilter.`}
              </p>
            </div>
          </div>
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title="Analitik AI"
        description="Untuk dataset SLA Full Service saat ini tidak ada endpoint AI yang sesuai. Karena itu halaman ini sengaja tetap real-data only."
        variant="ai"
      >
        <AnalyticsUnavailable
          title="AI insight belum tersedia"
          description="Dataset SLA Full Service memakai sheet khusus `SLA_FULL_SERVICE_SHEET_ID`, sementara pipeline AI yang ada belum memiliki kontrak khusus untuk dataset ini."
        />
      </AnalyticsSection>
    </div>
  );
}
