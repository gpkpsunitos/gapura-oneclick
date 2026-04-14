'use client';

import { useMemo, useState } from 'react';
import type { Report } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileStack,
  Plane,
  QrCode,
  Shapes,
} from 'lucide-react';
import { SummarySectionCard } from './summary/SummarySectionCard';
import { SummaryDetailArchive } from './summary/SummaryDetailArchive';
import type { SummaryDetailRow } from './summary/types';
import {
  ChartCard,
  HeatmapTableCard,
  CustomTooltip,
  WrappedYAxisTick,
  ResponsiveContainer,
  heatColor,
  CategoryBarList,
  KpiCard,
} from './shared/chart-ui';

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
    const onProgress = reports.filter(r => r.status === 'ON PROGRESS').length;
    const resolutionRate = reports.length > 0 ? (closed / reports.length) * 100 : 0;
    return { total: reports.length, branches: branches.size, airlines: airlines.size, complaints, compliments, open, closed, onProgress, resolutionRate };
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

  // 3. Monthly Report (Bar) — proper chronological sort across years
  const monthlyData = useMemo(() => {
    const counts: Record<string, { label: string; sortKey: string; val: number }> = {};
    reports.forEach(r => {
      const d = new Date(r.date_of_event || r.created_at);
      if (!isNaN(d.getTime())) {
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!counts[sortKey]) counts[sortKey] = { label, sortKey, val: 0 };
        counts[sortKey].val++;
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .map(({ label, val }) => ({ month: label, val }));
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

  // Landside detail data for table
  const landsideDetailData = useMemo(() => {
    return reports.filter(r => !!r.terminal_area_category || String(r.area).toLowerCase().includes('terminal'));
  }, [reports]);

  return (
    <div className="space-y-6">

      {/* ══════ KPI Strip ══════ */}
      <SummarySectionCard title="Overview" subtitle="">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard label="Total Reports" value={kpis.total} icon={FileStack} accent="oklch(0.55 0.14 240)" />
          <KpiCard label="Branches" value={kpis.branches} icon={Shapes} accent="oklch(0.65 0.18 160)" />
          <KpiCard label="Airlines" value={kpis.airlines} icon={Plane} accent="oklch(0.6 0.14 240)" />
          <KpiCard label="Complaints" value={kpis.complaints} icon={AlertCircle} accent="oklch(0.6 0.18 25)" />
          <KpiCard label="Compliments" value={kpis.compliments} icon={CheckCircle2} accent="oklch(0.68 0.16 205)" />
          <KpiCard label="Open" value={kpis.open} icon={AlertCircle} accent="oklch(0.6 0.18 25)" />
          <KpiCard label="On Progress" value={kpis.onProgress} icon={Clock} accent="oklch(0.72 0.16 80)" />
          <KpiCard label="Closed" value={kpis.closed} icon={CheckCircle2} accent="oklch(0.55 0.18 145)" />
          <KpiCard
            label="Resolution Rate"
            value={`${kpis.resolutionRate.toFixed(1)}%`}
            icon={Activity}
            accent="oklch(0.5 0.18 160)"
            progress={kpis.resolutionRate}
          />
        </div>
      </SummarySectionCard>

      {/* ══════ Report by Staff Joumpa ══════ */}
      <SummarySectionCard title="Report by Staff Joumpa" subtitle="Joumpa Handling Report based on Staff feedback">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">

          {/* Left column: Monthly + Remarks Case + Pie */}
          <div className="md:col-span-3 flex flex-col gap-5">
            {/* Monthly Report */}
            <ChartCard title="Monthly Report" accent="oklch(0.65 0.18 160)">
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, monthlyData.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={monthlyData} margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="month" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="val" name="Count" fill="oklch(0.65 0.18 160)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="val" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>

            {/* Remarks Case Distribution */}
            <ChartCard title="Remarks Case Distribution" accent="oklch(0.6 0.14 240)">
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                <div style={{ height: Math.max(200, remarksCaseData.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={remarksCaseData} margin={{ top: 4, right: 40, left: 40, bottom: 4 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} width={110} interval={0} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="val" name="Count" fill="oklch(0.6 0.14 240)" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="val" position="right" style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>

            {/* Report Category Pie */}
            <ChartCard title="Report Category" accent="oklch(0.7 0.2 330)">
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="h-[180px] sm:h-[220px] w-full shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportCategoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} strokeWidth={0} paddingAngle={2}>
                        {reportCategoryData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
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
            </ChartCard>
          </div>

          {/* Right column: Pivot Table */}
          <div className="md:col-span-9 flex flex-col">
            <HeatmapTableCard title="Report Category by Airlines" subtitle="Remarks Case / Record Count" accent="oklch(0.55 0.14 240)">
              {(() => {
                const renderedCols = remarksCaseCols.slice(0, 5);
                const colMax = renderedCols.map(c => Math.max(...rcByAirlines.map((r: any) => r[c] || 0), 1));
                const grandTotals = renderedCols.map(c => rcByAirlines.reduce((s: number, r: any) => s + (r[c] || 0), 0));
                const grandTotalAll = rcByAirlines.reduce((s: number, r: any) => s + r.total, 0);
                return (
                  <div className="overflow-x-auto">
                    <div className="max-h-[240px] overflow-y-auto">
                      <table className="w-full text-xs min-w-[340px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-black border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                            {renderedCols.map(c => (
                              <th key={c} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{c}</th>
                            ))}
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Grand Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rcByAirlines.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800 whitespace-nowrap">{row.branch}</td>
                              <td className="py-1.5 px-2 text-gray-800">{row.airlines}</td>
                              {renderedCols.map((c, idx) => {
                                const v = row[c] || 0;
                                const color = heatColor(v, colMax[idx]);
                                return (
                                  <td key={c} className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
                                    {v || '-'}
                                  </td>
                                );
                              })}
                              <td className="py-1.5 px-2 text-center font-bold">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <table className="w-full text-xs min-w-[340px] border-t-2 border-gray-300">
                      <tbody>
                        <tr className="bg-gray-100 font-bold">
                          <td className="py-1.5 px-2 text-gray-800">Grand total</td>
                          <td className="py-1.5 px-2 text-gray-800"></td>
                          {renderedCols.map((c, idx) => (
                            <td key={c} className="py-1.5 px-2 text-center text-gray-800">{grandTotals[idx]}</td>
                          ))}
                          <td className="py-1.5 px-2 text-center text-gray-800">{grandTotalAll}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </HeatmapTableCard>
          </div>
        </div>
      </SummarySectionCard>

      {/* ══════ Landslide Root Cause Section ══════ */}
      <SummarySectionCard title="Landside Area Root Cause" subtitle="Aggregated root cause identification for Landside / Terminal Area reports">
        <div className="space-y-5">
          <ChartCard title="Landside Area" accent="oklch(0.65 0.18 160)">
            <CategoryBarList data={landsideRootIds.map(d => ({ name: d.name, value: d.value }))} color="oklch(0.65 0.18 160)" />
          </ChartCard>
        </div>
      </SummarySectionCard>

      {/* ══════ Case Classification + Heatmaps ══════ */}
      <SummarySectionCard title="Breakdown of Identified Causes" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ChartCard title="Case Classification" accent="oklch(0.6 0.18 25)">
            <CategoryBarList data={caseClassificationData.map(d => ({ name: d.name, value: d.value }))} color="oklch(0.6 0.18 25)" />
          </ChartCard>

          <div className="flex flex-col gap-5">
            {/* Branch Heatmap */}
            <HeatmapTableCard title="Breakdown by Branch" accent="oklch(0.55 0.14 240)">
              {(() => {
                const cols = heatmapData.branchRc.cols;
                const colMaxes = cols.map(c => Math.max(...heatmapData.branchRc.data.map((r: any) => r[c] || 0), 1));
                return (
                  <div className="overflow-x-auto">
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="w-full text-xs min-w-[340px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-black border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Identification of Root</th>
                            {cols.map(c => (
                              <th key={c} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmapData.branchRc.data.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800" title={row.cls}>{row.cls}</td>
                              {cols.map((c, idx) => {
                                const color = heatColor(row[c] || 0, colMaxes[idx]);
                                return (
                                  <td key={c} className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
                                    {(row[c] || 0) === 0 ? '-' : row[c]}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </HeatmapTableCard>

            {/* Airline Heatmap */}
            <HeatmapTableCard title="Breakdown by Airlines" accent="oklch(0.7 0.2 330)">
              {(() => {
                const renderedCols = heatmapData.airlineRc.cols.slice(0, 5);
                const colMaxes = renderedCols.map(c => Math.max(...heatmapData.airlineRc.data.map((r: any) => r[c] || 0), 1));
                return (
                  <div className="overflow-x-auto">
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="w-full text-xs min-w-[340px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-black border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Identification of Root</th>
                            {renderedCols.map(c => (
                              <th key={c} className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmapData.airlineRc.data.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium text-gray-800" title={row.cls}>{row.cls}</td>
                              {renderedCols.map((c, idx) => {
                                const color = heatColor(row[c] || 0, colMaxes[idx]);
                                return (
                                  <td key={c} className="py-1.5 px-2 text-center font-medium" style={{ backgroundColor: color.bg, color: color.fg }}>
                                    {(row[c] || 0) === 0 ? '-' : row[c]}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </HeatmapTableCard>
          </div>
        </div>
      </SummarySectionCard>

      {/* ══════ Area Grid ══════ */}
      <SummarySectionCard title="Area Breakdown" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { title: 'Landside Area', labelCol: 'Terminal Area', data: areaData.land, accent: 'oklch(0.65 0.18 160)' },
            { title: 'Airside Area', labelCol: 'Apron Area', data: areaData.apron, accent: 'oklch(0.6 0.18 25)' },
            { title: 'General Service', labelCol: 'General Service', data: areaData.general, accent: 'oklch(0.68 0.16 205)' },
          ].map((area, idx) => (
            <HeatmapTableCard key={idx} title={area.title} accent={area.accent}>
              {(() => {
                const maxTotal = area.data[0]?.total || 1;
                return (
                  <div className="overflow-x-auto">
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="w-full text-xs min-w-[340px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-black border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">{area.labelCol}</th>
                            <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Case Classification</th>
                            <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {area.data.map((row: any, i: number) => {
                            const color = heatColor(row.total, maxTotal);
                            return (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-1.5 px-2 font-medium text-gray-800" title={row.cat}>{row.cat}</td>
                                <td className="py-1.5 px-2 text-gray-700" title={row.class}>{row.class}</td>
                                <td className="py-1.5 px-2 text-center font-bold" style={{ backgroundColor: color.bg, color: color.fg }}>
                                  {row.total}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </HeatmapTableCard>
          ))}
        </div>
      </SummarySectionCard>

      {/* ══════ Area Pie + Detail Root Cause ══════ */}
      <SummarySectionCard title="Area Distribution Detail" subtitle="">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">

          <div className="md:col-span-3">
            <ChartCard title="Report Category" accent="oklch(0.7 0.2 330)">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={reportCategoryAreaData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={65}
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {reportCategoryAreaData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
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
            </ChartCard>
          </div>

          <div className="md:col-span-9">
            <HeatmapTableCard title="Landside Area - Detail Root Cause Identification" accent="oklch(0.6 0.18 25)">
              <div className="overflow-x-auto">
                <div className="max-h-[240px] overflow-y-auto">
                  <table className="w-full text-xs min-w-[760px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-100 text-black border-b border-gray-300">
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Branch</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Airlines</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Category</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Area</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Issue Caused</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Breakdown Caused</th>
                        <th className="text-left py-2 px-3 font-black uppercase tracking-widest text-[9px]">Root Caused</th>
                        <th className="text-center py-2 px-2 font-black uppercase tracking-widest text-[9px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {landsideDetailData.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-gray-800 whitespace-nowrap">{row.stations?.code || row.branch || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{row.airlines || row.airline || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700">{row.category || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700">{row.area || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700">{row.issue_caused || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700">{row.breakdown_caused || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700">{row.root_caused || row.identification_of_root || '-'}</td>
                          <td className="py-1.5 px-2 text-center">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.65_0.18_160_/_0.15)] text-[10px] font-black text-gray-700">1</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </HeatmapTableCard>
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
