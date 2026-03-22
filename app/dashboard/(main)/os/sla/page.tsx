'use client';

import { useEffect, useMemo, useState } from 'react';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';

type Stats = {
  categoryDistribution: { name: string; value: number }[];
  areaDistribution: { name: string; value: number }[];
  bagHandlingPerformance: { name: string; value: number }[];
};

type SLAResponse = {
  filters: {
    categories: string[];
    areas: string[];
    airlines: string[];
    branches: string[];
  };
  stats: Stats;
  nonCompliance: Array<{
    Kategori: string;
    Area: string;
    Perfomance: string;
    Airline: string;
    Cab: string;
    Reasons: string;
  }>;
  avsec: Array<{
    SecurityServicePerformance: string;
    Airline: string;
    Cab: string;
    Reasons: string;
  }>;
  bagHandling: Array<{
    BagHandlingPerformance: string;
    Airline: string;
    Cab: string;
    Reasons: string;
  }>;
  debrief: Array<{
    Finishing: string | null;
    Airline: string;
    Cab: string;
    Reasons: string;
  }>;
};

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      <select
        className="px-3 py-2 rounded-xl border border-[var(--surface-4)] bg-white text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SLAFullServicePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SLAResponse | null>(null);
  const [category, setCategory] = useState('All');
  const [area, setArea] = useState('All');
  const [branch, setBranch] = useState('All');
  const [airline, setAirline] = useState('All');
  const [ncPage, setNcPage] = useState(1);
  const [avsecPage, setAvsecPage] = useState(1);
  const [debriefPage, setDebriefPage] = useState(1);
  const pageSize = 10;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (category !== 'All') p.set('category', category);
    if (area !== 'All') p.set('area', area);
    if (branch !== 'All') p.set('branch', branch);
    if (airline !== 'All') p.set('airline', airline);
    return p.toString();
  }, [category, area, branch, airline]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    const url = query ? `/api/sla/full-service?${query}` : '/api/sla/full-service';
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (!ignore) setData(j);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const bagBarData = useMemo(
    () => (data?.stats.bagHandlingPerformance || []).map((d) => ({ name: d.name, count: d.value })),
    [data]
  );
  const paged = <T,>(rows: T[], page: number) => rows.slice((page - 1) * pageSize, page * pageSize);
  const ncRows = data?.nonCompliance || [];
  const avRows = data?.avsec || [];
  const dbRows = data?.debrief || [];
  const ncPaged = paged(ncRows, ncPage);
  const avPaged = paged(avRows, avsecPage);
  const dbPaged = paged(dbRows, debriefPage);
  const resetPages = () => {
    setNcPage(1);
    setAvsecPage(1);
    setDebriefPage(1);
  };
  const resetFilters = () => {
    setCategory('All');
    setArea('All');
    setBranch('All');
    setAirline('All');
    resetPages();
  };
  const exportCSV = (filename: string, headers: string[], rows: (string | number | null)[][]) => {
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-0)' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">SLA Full Service Airline</h1>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert('Coming soon')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm"
            >
              SLA Inspection Landside
            </button>
            <button
              onClick={() => alert('Coming soon')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm"
            >
              SLA Inspection Airside
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Select label="Category" value={category} onChange={setCategory} options={data?.filters.categories || []} />
            <Select label="Area" value={area} onChange={setArea} options={data?.filters.areas || []} />
            <Select label="Branch" value={branch} onChange={setBranch} options={data?.filters.branches || []} />
            <Select label="Airline" value={airline} onChange={setAirline} options={data?.filters.airlines || []} />
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-[var(--surface-4)] bg-white text-sm font-semibold hover:bg-[var(--surface-2)]"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full border-4 animate-spin"
              style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PresentationSlide title="Non-Compliance in Category">
                <ResponsivePieChart data={data?.stats.categoryDistribution || []} />
              </PresentationSlide>
              <PresentationSlide title="Non-Compliance in Area">
                <ResponsivePieChart data={data?.stats.areaDistribution || []} donut percentageLabels />
              </PresentationSlide>
              <PresentationSlide title="Bag Handling Performance">
                <ResponsiveBarChart data={bagBarData} dataKeys={['count']} />
              </PresentationSlide>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PresentationSlide title="Debriefing After Service Performance">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-semibold">Total: {dbRows.length}</div>
                  <button
                    onClick={() =>
                      exportCSV(
                        'debrief.csv',
                        ['Airline', 'Branch', 'Finishing', 'Reasons'],
                        dbRows.map((r) => [r.Airline, r.Cab, r.Finishing ?? '', r.Reasons])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--surface-4)] hover:bg-[var(--surface-2)]"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-emerald-600 text-white">
                        <th className="px-3 py-2">Airline</th>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">Finishing</th>
                        <th className="px-3 py-2">Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbPaged.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--surface-4)]">
                          <td className="px-3 py-2">{r.Airline}</td>
                          <td className="px-3 py-2">{r.Cab}</td>
                          <td className="px-3 py-2">{r.Finishing ?? '-'}</td>
                          <td className="px-3 py-2">{r.Reasons}</td>
                        </tr>
                      ))}
                      {dbRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-[var(--text-muted)]" colSpan={4}>
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span>
                    {dbRows.length === 0
                      ? '0'
                      : `${(debriefPage - 1) * pageSize + 1} - ${Math.min(debriefPage * pageSize, dbRows.length)} of ${dbRows.length}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDebriefPage((p) => Math.max(1, p - 1))}
                      disabled={debriefPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setDebriefPage((p) => (p * pageSize < dbRows.length ? p + 1 : p))}
                      disabled={debriefPage * pageSize >= dbRows.length}
                      className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </PresentationSlide>

              <PresentationSlide title="AVSEC Performance">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-semibold">Total: {avRows.length}</div>
                  <button
                    onClick={() =>
                      exportCSV(
                        'avsec.csv',
                        ['Airline', 'Branch', 'Security Service Performance', 'Reasons'],
                        avRows.map((r) => [r.Airline, r.Cab, r.SecurityServicePerformance, r.Reasons])
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--surface-4)] hover:bg-[var(--surface-2)]"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-emerald-600 text-white">
                        <th className="px-3 py-2">Airline</th>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">Security Service Performance</th>
                        <th className="px-3 py-2">Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avPaged.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--surface-4)]">
                          <td className="px-3 py-2">{r.Airline}</td>
                          <td className="px-3 py-2">{r.Cab}</td>
                          <td className="px-3 py-2">{r.SecurityServicePerformance}</td>
                          <td className="px-3 py-2">{r.Reasons}</td>
                        </tr>
                      ))}
                      {avRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-[var(--text-muted)]" colSpan={4}>
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span>
                    {avRows.length === 0
                      ? '0'
                      : `${(avsecPage - 1) * pageSize + 1} - ${Math.min(avsecPage * pageSize, avRows.length)} of ${avRows.length}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAvsecPage((p) => Math.max(1, p - 1))}
                      disabled={avsecPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setAvsecPage((p) => (p * pageSize < avRows.length ? p + 1 : p))}
                      disabled={avsecPage * pageSize >= avRows.length}
                      className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </PresentationSlide>
            </div>

            <PresentationSlide title="Non-Compliance">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-semibold">Total: {ncRows.length}</div>
                <button
                  onClick={() =>
                    exportCSV(
                      'non_compliance.csv',
                      ['Kategori', 'Airline', 'Branch', 'Area', 'Performance', 'Reasons'],
                      ncRows.map((r) => [r.Kategori, r.Airline, r.Cab, r.Area, r.Perfomance, r.Reasons])
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--surface-4)] hover:bg-[var(--surface-2)]"
                >
                  Export CSV
                </button>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-emerald-600 text-white">
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Airline</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Area</th>
                      <th className="px-3 py-2">Performance</th>
                      <th className="px-3 py-2">Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncPaged.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--surface-4)]">
                        <td className="px-3 py-2">{r.Kategori}</td>
                        <td className="px-3 py-2">{r.Airline}</td>
                        <td className="px-3 py-2">{r.Cab}</td>
                        <td className="px-3 py-2">{r.Area}</td>
                        <td className="px-3 py-2">{r.Perfomance}</td>
                        <td className="px-3 py-2">{r.Reasons}</td>
                      </tr>
                    ))}
                    {ncRows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-[var(--text-muted)]" colSpan={6}>
                          No data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span>
                  {ncRows.length === 0
                    ? '0'
                    : `${(ncPage - 1) * pageSize + 1} - ${Math.min(ncPage * pageSize, ncRows.length)} of ${ncRows.length}`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNcPage((p) => Math.max(1, p - 1))}
                    disabled={ncPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setNcPage((p) => (p * pageSize < ncRows.length ? p + 1 : p))}
                    disabled={ncPage * pageSize >= ncRows.length}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </PresentationSlide>
          </>
        )}
      </div>
    </div>
  );
}
