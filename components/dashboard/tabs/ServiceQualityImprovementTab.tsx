'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Report } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileStack,
  Plane,
  QrCode,
  Shapes,
} from 'lucide-react';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDenseTable } from './summary/SummaryDenseTable';
import { SummaryDetailArchive } from './summary/SummaryDetailArchive';
import type { SummaryKpiItem, SummaryDetailRow } from './summary/types';

interface ServiceQualityImprovementTabProps {
  reports: Report[];
}

/* ─── oklch colour tokens (identical to Summary Report) ─── */

const CATEGORY_FILLS = {
  accident: 'oklch(0.55 0.18 25)',
  complaint: 'oklch(0.62 0.2 25)',
  irregularity: 'oklch(0.68 0.17 165)',
  compliment: 'oklch(0.68 0.16 205)',
};

const AREA_FILLS = {
  terminal: 'oklch(0.65 0.18 160)',
  apron: 'oklch(0.62 0.2 25)',
  general: 'oklch(0.68 0.16 205)',
};

const CUSTOMER_FEEDBACK_LOOKER_URL = 'https://lookerstudio.google.com/reporting/1afa362c-347e-44cd-98b1-0ec29abbb333';
const OP_INITIAL_IRREGULARITY_LOOKER_URL = 'https://lookerstudio.google.com/reporting/06d31553-08c6-42f3-81e6-1bc96356a854/page/tKISF';
const CUSTOMER_FEEDBACK_LOOKER_QR = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(CUSTOMER_FEEDBACK_LOOKER_URL)}`;
const OP_INITIAL_IRREGULARITY_LOOKER_QR = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(OP_INITIAL_IRREGULARITY_LOOKER_URL)}`;

function heatValue(val: number, max: number) {
  if (!val) return 'transparent';
  const ratio = Math.max(0.1, val / max);
  return `oklch(0.75 0.18 160 / ${ratio})`;
}

/* ─── PaginatedTable (restyled to match SummaryDenseTable) ─── */

function PaginatedTable({ data, renderRow, headers, itemsPerPage = 10 }: any) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const pageData = data.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const startIdx = page * itemsPerPage + 1;
  const endIdx = Math.min((page + 1) * itemsPerPage, data.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[oklch(0.9_0.01_90_/_0.7)] bg-white/50">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-[var(--surface-1)]/95 backdrop-blur-xl">
            <tr>
              {headers.map((h: any, i: number) => (
                <th
                  key={i}
                  className={`border-b border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-1)]/95 px-4 py-3 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] whitespace-nowrap ${h.className || ''}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row: any, i: number) => renderRow(row, i))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/90 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          <span>{startIdx}–{endIdx} of {data.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.9_0.01_90_/_0.9)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[4.5rem] text-center">{page + 1}/{totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.9_0.01_90_/_0.9)] bg-white text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-emerald-400)] hover:text-[var(--brand-emerald-700)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function ServiceQualityImprovementTab({ reports }: ServiceQualityImprovementTabProps) {

  // 1. KPIs
  const kpis = useMemo(() => {
    const branches = new Set(reports.map(r => r.stations?.code || r.branch).filter(Boolean));
    const airlines = new Set(reports.map(r => r.airlines || r.airline).filter(Boolean));
    const complaints = reports.filter(r => r.category === 'Complaint').length;
    const compliments = reports.filter(r => r.category === 'Compliment').length;
    const open = reports.filter(r => r.status === 'OPEN').length;
    const closed = reports.filter(r => r.status === 'CLOSED').length;
    return { total: reports.length, branches: branches.size, airlines: airlines.size, complaints, compliments, open, closed };
  }, [reports]);

  // 2. Report Category (Pie) — oklch fills
  const reportCategoryData = useMemo(() => {
    const cats: Record<string, number> = { 'Accident / Incident': 0, 'Complaint': 0, 'Irregularity': 0, 'Compliment': 0 };
    reports.forEach(r => {
      const c = r.category || '';
      if (c.toLowerCase().includes('complai')) cats['Complaint']++;
      else if (c.toLowerCase().includes('irreg')) cats['Irregularity']++;
      else if (c.toLowerCase().includes('complim')) cats['Compliment']++;
      else if (c.toLowerCase().includes('accid') || r.accident_incident) cats['Accident / Incident']++;
    });
    return [
      { name: 'Accident / Incident', value: cats['Accident / Incident'], fill: CATEGORY_FILLS.accident },
      { name: 'Complaint', value: cats['Complaint'], fill: CATEGORY_FILLS.complaint },
      { name: 'Irregularity', value: cats['Irregularity'], fill: CATEGORY_FILLS.irregularity },
      { name: 'Compliment', value: cats['Compliment'], fill: CATEGORY_FILLS.compliment },
    ].filter(d => d.value > 0);
  }, [reports]);

  // Area Pie Chart — oklch fills
  const reportCategoryAreaData = useMemo(() => {
    const cats: Record<string, number> = { 'Terminal Area': 0, 'Apron Area': 0, 'General': 0 };
    reports.forEach(r => {
      const a = String(r.area).toLowerCase();
      if (r.terminal_area_category || a.includes('terminal') || a.includes('landside')) cats['Terminal Area']++;
      else if (r.apron_area_category || a.includes('apron') || a.includes('airside')) cats['Apron Area']++;
      else cats['General']++;
    });
    return [
      { name: 'Terminal Area', value: cats['Terminal Area'], fill: AREA_FILLS.terminal },
      { name: 'Apron Area', value: cats['Apron Area'], fill: AREA_FILLS.apron },
      { name: 'General', value: cats['General'], fill: AREA_FILLS.general },
    ].filter(d => d.value > 0);
  }, [reports]);

  // 3. Monthly Report (Bar)
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const d = new Date(r.date_of_event || r.created_at);
      if (!isNaN(d.getTime())) {
        const key = d.toLocaleString('en-US', { month: 'long' });
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([month, val]) => ({ month, val }))
      .sort((a, b) => {
        const m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return m.indexOf(b.month) - m.indexOf(a.month);
      });
  }, [reports]);

  // Remarks Case Distribution (Bar)
  const remarksCaseData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const key = (r.remarks_case || '').trim();
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val);
  }, [reports]);

  const remarksCaseCols = useMemo(() => remarksCaseData.map(d => d.name), [remarksCaseData]);

  // 4. Remarks Case by Airlines (Pivot Data)
  const rcByAirlines = useMemo(() => {
    const grouped: Record<string, any> = {};
    reports.forEach(r => {
      const branch = (r.stations?.code || r.branch || 'Unknown').toString().trim().toUpperCase();
      const airline = (r.airlines || r.airline || 'Unknown').toString().trim();
      const rc = (r.remarks_case || '').trim();
      const key = `${branch}-${airline}`;
      if (!grouped[key]) {
        grouped[key] = { branch, airlines: airline };
        remarksCaseCols.forEach(c => grouped[key][c] = 0);
        grouped[key].acc = 0;
      }
      if (rc && grouped[key][rc] !== undefined) grouped[key][rc]++;
    });
    return Object.values(grouped).map((row: any) => {
      const total = remarksCaseCols.reduce((sum: number, c: string) => sum + (row[c] || 0), 0);
      return { ...row, total };
    }).sort((a: any, b: any) => b.total - a.total);
  }, [reports, remarksCaseCols]);

  // 5. General Aggregator
  const aggCategory = (field: keyof Report) => {
    const res: Record<string, number> = {};
    reports.forEach(r => {
      const v = r[field];
      if (v && typeof v === 'string') {
        const str = v.trim();
        if (str) res[str] = (res[str] || 0) + 1;
      }
    });
    return Object.entries(res).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  };

  const caseClassificationData = useMemo(() => aggCategory('case_classification'), [reports]);
  const rootCauseData = useMemo(() => aggCategory('identification_of_root'), [reports]);

  // Heatmaps
  const heatmapData = useMemo(() => {
    const byBranch: Record<string, Record<string, number>> = {};
    const branches = new Set<string>();
    const byAirline: Record<string, Record<string, number>> = {};
    const airlines = new Set<string>();
    const rootCauseByBranch: Record<string, Record<string, number>> = {};

    reports.forEach(r => {
      const cls = String(r.case_classification || '').trim() || 'Unknown';
      const rc = String(r.identification_of_root || '').trim() || 'Unknown';
      const b = (r.stations?.code || r.branch || 'Unknown').toString().trim().toUpperCase();
      const a = (r.airlines || r.airline || 'Unknown').toString().trim();

      if (!byBranch[cls]) byBranch[cls] = {};
      if (!byAirline[rc]) byAirline[rc] = {};
      if (!rootCauseByBranch[rc]) rootCauseByBranch[rc] = {};

      byBranch[cls][b] = (byBranch[cls][b] || 0) + 1;
      byAirline[rc][a] = (byAirline[rc][a] || 0) + 1;
      rootCauseByBranch[rc][b] = (rootCauseByBranch[rc][b] || 0) + 1;

      branches.add(b);
      airlines.add(a);
    });

    return {
      branch: { data: Object.entries(byBranch).map(([cls, bMap]) => ({ cls, ...bMap })), cols: Array.from(branches).sort() },
      airlineRc: { data: Object.entries(byAirline).map(([cls, aMap]) => ({ cls, ...aMap })), cols: Array.from(airlines).sort() },
      branchRc: { data: Object.entries(rootCauseByBranch).map(([cls, bMap]) => ({ cls, ...bMap })), cols: Array.from(branches).sort() }
    };
  }, [reports]);

  // Area data
  const areaData = useMemo(() => {
    const group = (filterFn: (r: Report) => boolean, catField: keyof Report) => {
      const g: Record<string, { cat: string, class: string, total: number }> = {};
      reports.filter(filterFn).forEach(r => {
        const cat = String(r[catField] || '').trim();
        const cls = String(r.case_classification || '').trim() || '-';
        if (!cat) return;
        const key = `${cat}-${cls}`;
        if (!g[key]) g[key] = { cat, class: cls, total: 0 };
        g[key].total++;
      });
      return Object.values(g).sort((a, b) => b.total - a.total);
    };
    return {
      land: group(r => !!r.terminal_area_category || String(r.area).toLowerCase().includes('terminal'), 'terminal_area_category'),
      apron: group(r => !!r.apron_area_category || String(r.area).toLowerCase().includes('apron'), 'apron_area_category'),
      general: group(r => !!r.general_category || String(r.area).toLowerCase().includes('general'), 'general_category'),
    };
  }, [reports]);

  // Landside Identification of Root
  const landsideRootIds = useMemo(() => {
    const g: Record<string, number> = {};
    reports.filter(r => !!r.terminal_area_category || String(r.area).toLowerCase().includes('terminal')).forEach(r => {
      const rc = String(r.identification_of_root || '').trim();
      if (rc) g[rc] = (g[rc] || 0) + 1;
    });
    return Object.entries(g).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [reports]);

  // Detail Report — mapped to SummaryDetailRow for SummaryDetailArchive
  const detailRows = useMemo<SummaryDetailRow[]>(() => {
    return reports.map(r => {
      const dateSource = r.date_of_event || r.created_at;
      const parsedDate = new Date(dateSource);
      const rawDate = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
      return {
        id: r.id,
        date: rawDate > 0 ? parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        rawDate,
        branch: (r.stations?.code || r.branch || '-').toString().trim().toUpperCase(),
        airline: (r.airlines || r.airline || 'Non Airline Case').toString().trim(),
        flight: r.flight_number || '#N/A',
        category: r.category || '-',
        breakdown: r.breakdown_caused || '-',
        rootSummary: r.identification_of_root || '-',
        detail: r.description || r.report || '-',
        detailRoot: r.root_caused || r.identification_of_root || '-',
        action: r.action_taken || '-',
        preventive: r.preventive_action || '-',
        status: r.status || '-',
      };
    });
  }, [reports]);

  // ── KPI items for grid ──
  const kpiItems: SummaryKpiItem[] = [
    { key: 'total', label: 'Reports', value: kpis.total, description: '', tone: 'volume' },
    { key: 'branches', label: 'Branch', value: kpis.branches, description: '', tone: 'volume' },
    { key: 'airlines', label: 'Airlines', value: kpis.airlines, description: '', tone: 'volume' },
    { key: 'complaints', label: 'Complaint', value: kpis.complaints, description: '', tone: 'mix' },
    { key: 'compliments', label: 'Compliment Report', value: kpis.compliments, description: '', tone: 'mix' },
    { key: 'open', label: 'Report Open', value: kpis.open, description: '', tone: 'workflow' },
    { key: 'closed', label: 'Report Closed', value: kpis.closed, description: '', tone: 'workflow' },
  ];

  const tooltipStyle = {
    borderRadius: '16px',
    borderColor: 'oklch(0.9 0.01 90 / 0.9)',
    background: 'oklch(0.99 0.005 90 / 0.95)',
  };

  /* ── shared cell class helpers ── */
  const cellBase = 'px-4 py-3 text-[0.82rem] text-[var(--text-primary)] align-top';
  const cellBreak = `${cellBase} break-words`;

  return (
    <div className="space-y-6">

      {/* ══════ KPI Strip ══════ */}
      <SummarySectionCard title="Overview" subtitle="">
        <SqiKpiGrid items={kpiItems} />
      </SummarySectionCard>

      {/* ══════ Report by Staff Joumpa ══════ */}
      <SummarySectionCard title="Report by Staff Joumpa" subtitle="Joumpa Handling Report based on Staff feedback">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">

          {/* Left column: Monthly + Remarks Case + Pie */}
          <div className="md:col-span-3 flex flex-col gap-5">
            {/* Monthly Report */}
            <SqiMiniPanel icon={<BarChart3 size={18} />} title="Monthly Report" subtitle="">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={monthlyData} margin={{ top: 10, right: 25, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="oklch(0.92 0.01 90 / 0.9)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="month" type="category" width={72} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value} reports`, 'Volume']}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'oklch(0.95 0.01 90 / 0.5)' }}
                    />
                    <Bar dataKey="val" fill="oklch(0.65 0.18 160)" barSize={20} radius={[0, 12, 12, 0]}>
                      <LabelList dataKey="val" position="right" className="fill-[var(--text-primary)] text-[11px] font-black" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SqiMiniPanel>

            {/* Remarks Case Distribution */}
            <SqiMiniPanel icon={<BarChart3 size={18} />} title="Remarks Case Distribution" subtitle="">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={remarksCaseData.slice(0, 5)} margin={{ top: 10, right: 25, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="oklch(0.92 0.01 90 / 0.9)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value} reports`, 'Volume']}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'oklch(0.95 0.01 90 / 0.5)' }}
                    />
                    <Bar dataKey="val" fill="oklch(0.65 0.18 160)" barSize={16} radius={[0, 12, 12, 0]}>
                      <LabelList dataKey="val" position="right" className="fill-[var(--text-primary)] text-[11px] font-black" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SqiMiniPanel>

            {/* Report Category Pie */}
            <SqiMiniPanel icon={<Shapes size={18} />} title="Report Category" subtitle="">
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="h-[220px] w-full shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportCategoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2}>
                        {reportCategoryData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name: string, entry: { payload?: { name?: string } }) => [`${value} reports`, entry?.payload?.name || '']}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportCategoryData.map(d => {
                    const totalCat = reportCategoryData.reduce((s, i) => s + i.value, 0);
                    const share = totalCat > 0 ? Math.round((d.value / totalCat) * 100) : 0;
                    return (
                      <div key={d.name} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{d.name}</span>
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="font-mono text-lg font-black text-[var(--text-primary)]">{d.value}</span>
                          <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SqiMiniPanel>
          </div>

          {/* Right column: Pivot Table */}
          <div className="md:col-span-9 flex flex-col">
            <SqiMiniPanel icon={<Plane size={18} />} title="Report Category by Airlines" subtitle="Remarks Case / Record Count">
              <PaginatedTable
                data={rcByAirlines}
                itemsPerPage={15}
                headers={[
                  { label: 'Branch' }, { label: 'Airlines' },
                  ...remarksCaseCols.slice(0, 5).map(c => ({ label: c })),
                  { label: 'Grand Total', className: 'text-right' }
                ]}
                renderRow={(row: any, i: number) => {
                  const renderedCols = remarksCaseCols.slice(0, 5);
                  let gtotal = 0;
                  const colMax = renderedCols.map(c => Math.max(...rcByAirlines.map((r: any) => r[c] || 0), 1));
                  return (
                    <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                      <td className={`${cellBreak} font-mono font-semibold`}>{row.branch}</td>
                      <td className={cellBreak}>{row.airlines}</td>
                      {renderedCols.map((c, idx) => {
                        const v = row[c] || 0;
                        gtotal += v;
                        return <td key={idx} className={`${cellBase} text-right`} style={{ backgroundColor: heatValue(v, colMax[idx]) }}>{v || '–'}</td>;
                      })}
                      <td className={`${cellBase} text-right font-mono font-black text-[var(--brand-emerald-700)]`}>{row.total}</td>
                    </tr>
                  );
                }}
              />
            </SqiMiniPanel>
          </div>
        </div>
      </SummarySectionCard>

      {/* ══════ Landside Root Cause Section ══════ */}
      <SummarySectionCard title="Landside Area Root Cause" subtitle="">
        <div className="space-y-5">
          <SqiMiniPanel icon={<Building2 size={18} />} title="Landside Area" subtitle="">
            <div className="flex-1 min-h-0">
              <PaginatedTable
                data={landsideRootIds}
                itemsPerPage={10}
                headers={[{ label: 'Identification of Root' }, { label: 'Total ▼' }]}
                renderRow={(row: any, i: number) => {
                  const maxTotal = landsideRootIds[0]?.value || 1;
                  const pWidth = (row.value / maxTotal) * 100;
                  return (
                    <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                      <td className={cellBreak}>{row.name}</td>
                      <td className={`${cellBase} w-[120px]`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono font-black text-[var(--brand-emerald-700)]">{row.value}</span>
                          <div className="flex-1 h-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.65 0.18 160)', width: `${pWidth}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </div>
          </SqiMiniPanel>

          <SqiMiniPanel icon={<AlertCircle size={18} />} title="Landside Area – Detail Root Cause Identification" subtitle="">
            <div className="flex-1 min-h-0">
              <PaginatedTable
                data={reports.filter(r => !!r.terminal_area_category || String(r.area).toLowerCase().includes('terminal'))}
                itemsPerPage={10}
                headers={[{ label: 'Branch' }, { label: 'Airlines' }, { label: 'Category' }, { label: 'Area' }, { label: 'Issue Caused' }, { label: 'Root Caused' }, { label: 'Total ▼' }]}
                renderRow={(row: any, i: number) => (
                  <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                    <td className={cellBreak}>{row.stations?.code || row.branch}</td>
                    <td className={cellBreak}>{row.airlines || row.airline}</td>
                    <td className={cellBreak}>{row.category}</td>
                    <td className={cellBreak}>{row.area}</td>
                    <td className={cellBreak}>{row.issue_caused || '-'}</td>
                    <td className={cellBreak}>{row.root_caused || row.identification_of_root}</td>
                    <td className={`${cellBase} w-[80px]`}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono font-black text-[var(--brand-emerald-700)]">1</span>
                        <div className="h-2.5 w-full rounded-full bg-[oklch(0.65_0.18_160)]" />
                      </div>
                    </td>
                  </tr>
                )}
              />
            </div>
          </SqiMiniPanel>
        </div>
      </SummarySectionCard>

      {/* ══════ Case Classification + Heatmaps ══════ */}
      <SummarySectionCard title="Breakdown of Identified Causes" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SqiMiniPanel icon={<AlertCircle size={18} />} title="Case Classification" subtitle="">
            <div className="flex-1 min-h-0">
              <PaginatedTable
                data={caseClassificationData}
                itemsPerPage={15}
                headers={[{ label: 'Case Classification' }, { label: 'Total ▼' }]}
                renderRow={(row: any, i: number) => {
                  const maxTotal = caseClassificationData[0]?.value || 1;
                  const pWidth = (row.value / maxTotal) * 100;
                  return (
                    <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                      <td className={cellBreak}>{row.name}</td>
                      <td className={`${cellBase} w-[100px]`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono font-black text-[var(--brand-emerald-700)]">{row.value}</span>
                          <div className="flex-1 h-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.65 0.18 160)', width: `${pWidth}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </div>
          </SqiMiniPanel>

          <div className="flex flex-col gap-5">
            {/* Branch Heatmap */}
            <SqiMiniPanel icon={<Building2 size={18} />} title="Breakdown by Branch" subtitle="">
              <div className="flex-1 min-h-0 max-h-[200px] overflow-auto">
                <PaginatedTable
                  data={heatmapData.branchRc.data}
                  itemsPerPage={5}
                  headers={[{ label: 'Identification of Root' }, ...heatmapData.branchRc.cols.map(c => ({ label: c }))]}
                  renderRow={(row: any, i: number) => {
                    const vals = heatmapData.branchRc.cols.map(c => row[c] || 0);
                    const rowMax = Math.max(...vals, 1);
                    return (
                      <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                        <td className={`${cellBreak}`} title={row.cls}>{row.cls}</td>
                        {heatmapData.branchRc.cols.map(c => (
                          <td key={c} className={`${cellBase} text-center`} style={{ backgroundColor: heatValue(row[c] || 0, rowMax) }}>
                            {(row[c] || 0) === 0 ? '–' : row[c]}
                          </td>
                        ))}
                      </tr>
                    );
                  }}
                />
              </div>
            </SqiMiniPanel>

            {/* Airline Heatmap */}
            <SqiMiniPanel icon={<Plane size={18} />} title="Breakdown by Airlines" subtitle="">
              <div className="flex-1 min-h-0 max-h-[200px] overflow-auto">
                <PaginatedTable
                  data={heatmapData.airlineRc.data}
                  itemsPerPage={5}
                  headers={[{ label: 'Identification of Root' }, ...heatmapData.airlineRc.cols.slice(0, 5).map(c => ({ label: c }))]}
                  renderRow={(row: any, i: number) => {
                    const renderedCols = heatmapData.airlineRc.cols.slice(0, 5);
                    const vals = renderedCols.map(c => row[c] || 0);
                    const rowMax = Math.max(...vals, 1);
                    return (
                      <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                        <td className={cellBreak} title={row.cls}>{row.cls}</td>
                        {renderedCols.map(c => (
                          <td key={c} className={`${cellBase} text-center`} style={{ backgroundColor: heatValue(row[c] || 0, rowMax) }}>
                            {(row[c] || 0) === 0 ? '–' : row[c]}
                          </td>
                        ))}
                      </tr>
                    );
                  }}
                />
              </div>
            </SqiMiniPanel>
          </div>
        </div>
      </SummarySectionCard>

      {/* ══════ Area Grid ══════ */}
      <SummarySectionCard title="Area Breakdown" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { title: 'Landside Area', labelCol: 'Terminal Area', data: areaData.land },
            { title: 'Airside Area', labelCol: 'Apron Area', data: areaData.apron },
            { title: 'General Service', labelCol: 'General Service', data: areaData.general },
          ].map((area, idx) => (
            <SqiMiniPanel key={idx} icon={<Building2 size={18} />} title={area.title} subtitle="">
              <div className="flex-1 min-h-0">
                <PaginatedTable
                  data={area.data}
                  itemsPerPage={10}
                  headers={[{ label: area.labelCol }, { label: 'Case Classification' }, { label: 'Total ▼' }]}
                  renderRow={(row: any, i: number) => {
                    const maxTotal = area.data[0]?.total || 1;
                    const pWidth = (row.total / maxTotal) * 100;
                    return (
                      <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                        <td className={cellBreak} title={row.cat}>{row.cat}</td>
                        <td className={cellBreak} title={row.class}>{row.class}</td>
                        <td className={`${cellBase} w-[80px]`}>
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-mono font-black text-[var(--brand-emerald-700)]">{row.total}</span>
                            <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: 'oklch(0.65 0.18 160)', width: `${pWidth}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                />
              </div>
            </SqiMiniPanel>
          ))}
        </div>
      </SummarySectionCard>

      {/* ══════ Area Pie + Detail Root Cause ══════ */}
      <SummarySectionCard title="Area Distribution Detail" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">

          <div className="md:col-span-3">
            <SqiMiniPanel icon={<Shapes size={18} />} title="Report Category" subtitle="">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={reportCategoryAreaData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} strokeWidth={0} paddingAngle={2}>
                      {reportCategoryAreaData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name: string, entry: { payload?: { name?: string } }) => [`${value} reports`, entry?.payload?.name || '']}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-2">
                  {reportCategoryAreaData.map(d => {
                    const totalArea = reportCategoryAreaData.reduce((s, i) => s + i.value, 0);
                    const share = totalArea > 0 ? Math.round((d.value / totalArea) * 100) : 0;
                    return (
                      <div key={d.name} className="rounded-2xl border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 px-3 py-2.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="min-w-0 break-words text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{d.name}</span>
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="font-mono text-lg font-black text-[var(--text-primary)]">{d.value}</span>
                          <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">{share}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SqiMiniPanel>
          </div>

          <div className="md:col-span-9">
            <SqiMiniPanel icon={<AlertCircle size={18} />} title="Landside Area – Detail Root Cause Identification" subtitle="">
              <div className="flex-1 min-h-0">
                <PaginatedTable
                  data={reports.filter(r => !!r.terminal_area_category || String(r.area).toLowerCase().includes('terminal'))}
                  itemsPerPage={6}
                  headers={[{ label: 'Branch' }, { label: 'Airlines' }, { label: 'Category' }, { label: 'Area' }, { label: 'Issue Caused' }, { label: 'Breakdown Caused' }, { label: 'Root Caused' }, { label: 'Total ▼' }]}
                  renderRow={(row: any, i: number) => (
                    <tr key={i} className="transition-colors hover:bg-[var(--surface-2)]/80">
                      <td className={cellBreak}>{row.stations?.code || row.branch || '-'}</td>
                      <td className={cellBreak}>{row.airlines || row.airline || '-'}</td>
                      <td className={cellBreak}>{row.category || '-'}</td>
                      <td className={cellBreak}>{row.area || '-'}</td>
                      <td className={cellBreak}>{row.issue_caused || '-'}</td>
                      <td className={cellBreak}>{row.breakdown_caused || '-'}</td>
                      <td className={cellBreak}>{row.root_caused || row.identification_of_root || '-'}</td>
                      <td className={`${cellBase} w-[80px]`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono font-black text-[var(--brand-emerald-700)]">1</span>
                          <div className="h-2.5 w-full rounded-full bg-[oklch(0.65_0.18_160)]" />
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>
            </SqiMiniPanel>
          </div>
        </div>
      </SummarySectionCard>

      {/* ══════ Detail Report ══════ */}
      <SummarySectionCard title="Detail Report" subtitle="">
        <SummaryDetailArchive rows={detailRows} />
      </SummarySectionCard>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <LookerQrCard
          title="Customer Feedback Service Dashboard Lookers Version"
          url={CUSTOMER_FEEDBACK_LOOKER_URL}
          qrUrl={CUSTOMER_FEEDBACK_LOOKER_QR}
        />
        <LookerQrCard
          title="Initial Irregularity Report Dashboard Lookers OP Version"
          url={OP_INITIAL_IRREGULARITY_LOOKER_URL}
          qrUrl={OP_INITIAL_IRREGULARITY_LOOKER_QR}
        />
      </div>

    </div>
  );
}

/* ─── Reusable Sub-Components (matching Summary Report design) ─── */

function SqiKpiGrid({ items }: { items: SummaryKpiItem[] }) {
  const groups = [
    { id: 'volume', title: 'Volume', icon: <FileStack size={16} />, items: items.filter(i => i.tone === 'volume') },
    { id: 'mix', title: 'Case Mix', icon: <Shapes size={16} />, items: items.filter(i => i.tone === 'mix') },
    { id: 'workflow', title: 'Workflow', icon: <CheckCircle2 size={16} />, items: items.filter(i => i.tone === 'workflow') },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12">
      {groups.map(g => (
        <div key={g.id} className="sm:col-span-1 xl:col-span-4">
          <div className="rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/75 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.65_0.18_160_/_0.12)] text-[var(--brand-emerald-700)]">
                {g.icon}
              </span>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[var(--brand-emerald-700)]">
                  {g.title}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {g.id === 'workflow' ? 'Closure state' : g.id === 'mix' ? 'Current category balance' : 'Current data footprint'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {g.items.map(item => (
                <div
                  key={item.key}
                  className={`rounded-[22px] border px-4 py-3 ${
                    g.id === 'mix'
                      ? 'border-[oklch(0.92_0.02_82_/_0.85)] bg-[oklch(0.99_0.01_82_/_0.85)]'
                      : g.id === 'workflow'
                      ? 'border-[oklch(0.9_0.01_90_/_0.85)] bg-[var(--surface-0)]/95'
                      : 'border-[var(--brand-emerald-100)] bg-[var(--brand-emerald-50)]/55'
                  }`}
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">{item.label}</p>
                  <p className="mt-2 font-mono text-[1.65rem] font-black leading-none text-[var(--brand-emerald-700)]">{item.value.toLocaleString()}</p>
                  {item.description ? (
                    <p className="mt-2 text-[0.76rem] leading-5 text-[var(--text-secondary)]">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LookerQrCard({
  title,
  url,
  qrUrl,
}: {
  title: string;
  url: string;
  qrUrl: string;
}) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <SummarySectionCard title={title} subtitle="">
        <div className="flex h-full flex-col gap-5 rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.75)] bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[oklch(0.65_0.18_160_/_0.12)] text-[var(--brand-emerald-700)]">
              <QrCode size={20} />
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm leading-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {url}
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <ExternalLink size={18} />
              <span>Buka Dashboard</span>
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="ml-2 inline-flex items-center gap-2 rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-2)] active:scale-[0.98]"
            >
              <Copy size={18} />
              <span>{copied ? 'Link Tersalin' : 'Salin Link'}</span>
            </button>
          </div>

          <div className="flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="rounded-[24px] border border-[var(--surface-4)] bg-white p-3 shadow-sm transition hover:bg-[var(--surface-2)]"
              aria-label={`Tampilkan QR code ${title}`}
            >
              <img
                src={qrUrl}
                alt={`QR code ${title}`}
                className="h-36 w-36 rounded-2xl object-contain"
              />
            </button>
          </div>
        </div>
      </SummarySectionCard>

      {showQrModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setShowQrModal(false)}
            aria-label="Tutup popup QR"
          />
          <div className="relative z-10 w-full max-w-md rounded-[30px] border border-[oklch(0.88_0.01_90_/_0.85)] bg-white p-6 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.45)]">
            <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Scan QR code atau buka dashboard Lookers secara langsung.
            </p>

            <div className="mt-5 flex justify-center">
              <div className="rounded-[28px] border border-[var(--surface-4)] bg-white p-4 shadow-sm">
                <img
                  src={qrUrl}
                  alt={`QR code ${title}`}
                  className="h-64 w-64 rounded-2xl object-contain"
                />
              </div>
            </div>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <ExternalLink size={18} />
              <span>Buka Dashboard</span>
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-[var(--surface-4)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-2)] active:scale-[0.98]"
            >
              <Copy size={18} />
              <span>{copied ? 'Link Tersalin' : 'Salin Link'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SqiMiniPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[24px] border border-[oklch(0.9_0.01_90_/_0.72)] bg-white/75 p-4">
      <div className="mb-4 flex shrink-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.65_0.18_160_/_0.12)] text-[var(--brand-emerald-700)]">
          {icon}
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="break-words font-display text-[1.02rem] font-black tracking-[-0.03em] text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle ? <p className="break-words text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
