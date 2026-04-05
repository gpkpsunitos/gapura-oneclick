'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Gauge, Plane, ShieldAlert } from 'lucide-react';
import { AnalyticsMetricCard } from '@/components/dashboard/analytics-metric-card';
import {
  AnalyticsSection,
  AnalyticsSectionLoading,
  AnalyticsSourceStrip,
  AnalyticsUnavailable,
} from '@/components/dashboard/analytics-source-strip';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { SeverityDistributionChart } from '@/components/chart-detail/custom-charts/SeverityDistributionChart';
import { getShortcutSourceConfig } from '@/lib/op-shortcut-source-matrix';
import type { AnalyticsRuntimeStatus } from '@/lib/op-shortcut-source-matrix';
import {
  fetchAnalyticsReports,
  normalizeSeverity,
  normalizeStatus,
  pickAirline,
  pickBranch,
} from '@/lib/op-shortcut-analytics';

type ReportRow = {
  id: string;
  severity?: string;
  status?: string;
  airlines?: string;
  airline?: string;
  branch?: string;
  reporting_branch?: string;
  hub?: string;
  created_at?: string;
  date_of_event?: string;
  target_division?: string;
};

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

interface EntityDetail {
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  severity_distribution: Partial<Record<RiskLevel, number>>;
  issue_categories: string[];
  total_issues?: number;
}

interface RiskSummary {
  last_updated: string;
  airline_risks: Record<RiskLevel, number>;
  branch_risks: Record<RiskLevel, number>;
  hub_risks: Record<RiskLevel, number>;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
  airline_details: EntityDetail[];
  branch_details: EntityDetail[];
  hub_details: EntityDetail[];
  cached?: boolean;
  stale?: boolean;
  generatedAt?: string;
  sourceSyncAt?: string | null;
}

const SOURCE_CONFIG = getShortcutSourceConfig('riskSeverity');

function toSeverityChartData(map: Record<string, number>) {
  const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;
  return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => ({
    severity,
    count: map[severity] || 0,
    percentage: ((map[severity] || 0) / total) * 100,
  }));
}

export default function OPRiskSeverity() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [realLoading, setRealLoading] = useState(true);
  const [realError, setRealError] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<AnalyticsRuntimeStatus>();

  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalyticsRuntimeStatus>();

  useEffect(() => {
    let active = true;

    async function loadReal() {
      try {
        setRealLoading(true);
        setRealError(null);
        const response = await fetchAnalyticsReports<ReportRow>(
          {},
          ['id', 'severity', 'status', 'airlines', 'airline', 'branch', 'reporting_branch', 'hub', 'created_at', 'date_of_event', 'target_division']
        );
        if (!active) return;
        setReports(response.reports || []);
        setRealStatus({
          lastSyncAt: response.timestamp,
          count: response.count,
        });
      } catch (loadError) {
        if (!active) return;
        setRealError(loadError instanceof Error ? loadError.message : 'Gagal memuat data real');
      } finally {
        if (active) setRealLoading(false);
      }
    }

    async function loadAi() {
      try {
        setAiLoading(true);
        setAiError(null);
        const response = await fetch('/api/ai/risk/summary', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as RiskSummary;
        if (!active) return;
        setRiskSummary(payload);
        setAiStatus({
          cached: payload.cached,
          stale: payload.stale,
          generatedAt: payload.generatedAt,
          sourceSyncAt: payload.sourceSyncAt,
        });
      } catch (loadError) {
        if (!active) return;
        setAiError(loadError instanceof Error ? loadError.message : 'Gagal memuat ringkasan AI');
      } finally {
        if (active) setAiLoading(false);
      }
    }

    loadReal();
    loadAi();

    return () => {
      active = false;
    };
  }, []);

  const realSeverityMap = useMemo(() => {
    return reports.reduce<Record<string, number>>((accumulator, report) => {
      const severity = normalizeSeverity(report.severity);
      accumulator[severity] = (accumulator[severity] || 0) + 1;
      return accumulator;
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  }, [reports]);

  const realStatusData = useMemo(() => {
    const counts = reports.reduce<Record<string, number>>((accumulator, report) => {
      const status = normalizeStatus(report.status);
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, { OPEN: 0, PROGRESS: 0, CLOSED: 0 });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const topBranches = useMemo(() => {
    const branchMap = new Map<string, number>();
    reports.forEach((report) => {
      const branch = pickBranch(report);
      branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });
    return Array.from(branchMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const topAirlines = useMemo(() => {
    const airlineMap = new Map<string, number>();
    reports.forEach((report) => {
      const airline = pickAirline(report);
      airlineMap.set(airline, (airlineMap.get(airline) || 0) + 1);
    });
    return Array.from(airlineMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [reports]);

  const affectedHubs = useMemo(() => {
    return new Set(reports.map((report) => report.hub).filter(Boolean)).size;
  }, [reports]);

  const aiBranchChart = useMemo(() => {
    return (riskSummary?.branch_details || [])
      .slice()
      .sort((left, right) => right.risk_score - left.risk_score)
      .slice(0, 8)
      .map((entry) => ({
        name: entry.name,
        riskScore: Math.round(entry.risk_score * 10) / 10,
        issues: entry.total_issues || 0,
      }));
  }, [riskSummary]);

  const aiAirlineChart = useMemo(() => {
    return (riskSummary?.airline_details || [])
      .slice()
      .sort((left, right) => right.risk_score - left.risk_score)
      .slice(0, 8)
      .map((entry) => ({
        name: entry.name,
        riskScore: Math.round(entry.risk_score * 10) / 10,
        issues: entry.total_issues || 0,
      }));
  }, [riskSummary]);

  const aiHubSeverity = useMemo(() => toSeverityChartData(riskSummary?.hub_risks || {}), [riskSummary]);
  const aiBranchSeverity = useMemo(() => toSeverityChartData(riskSummary?.branch_risks || {}), [riskSummary]);
  const aiAirlineSeverity = useMemo(() => toSeverityChartData(riskSummary?.airline_risks || {}), [riskSummary]);

  const topRiskLevel = useMemo(() => {
    return (riskSummary?.branch_details || []).slice().sort((left, right) => right.risk_score - left.risk_score)[0];
  }, [riskSummary]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <AnalyticsSourceStrip
        title="Risk & Severity"
        description="Pisahkan eksposur real dari laporan aktual dan scoring risiko AI. Chart real menggambarkan volume aktual, sedangkan chart AI menggambarkan penilaian risiko model."
        realSource={SOURCE_CONFIG.realSource}
        realStatus={realStatus}
        aiSource={SOURCE_CONFIG.aiSource}
        aiStatus={aiStatus}
      />

      <AnalyticsSection
        title="Eksposur Severity Aktual"
        description="Data real di bawah ini dihitung langsung dari laporan aktual pada dataset utama melalui `/api/reports/analytics`."
        variant="real"
      >
        {realError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{realError}</div> : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <AnalyticsMetricCard icon={Gauge} label="Total Reports" value={reports.length.toLocaleString('id-ID')} caption="Volume kasus aktual" tone="real" />
          <AnalyticsMetricCard icon={AlertTriangle} label="High + Critical" value={((realSeverityMap.HIGH || 0) + (realSeverityMap.CRITICAL || 0)).toLocaleString('id-ID')} caption="Kasus severity tinggi" tone="real" />
          <AnalyticsMetricCard icon={Building2} label="Affected Hubs" value={affectedHubs.toLocaleString('id-ID')} caption="Hub aktif pada dataset" tone="real" />
          <AnalyticsMetricCard icon={ShieldAlert} label="Open Cases" value={(realStatusData.find((entry) => entry.name === 'OPEN')?.value || 0).toLocaleString('id-ID')} caption="Status masih open" tone="real" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <SeverityDistributionChart data={toSeverityChartData(realSeverityMap)} title="Severity Aktual" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <ResponsivePieChart data={realStatusData} title="Distribusi Status" donut showLegend percentageLabels height="h-[280px]" />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black text-slate-900">Top Airlines by Volume</h3>
              <p className="text-xs text-slate-600">Volume riil kasus severity menurut maskapai.</p>
            </div>
            <ResponsiveBarChart data={topAirlines} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[280px]" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Top Branches by Volume</h3>
            <p className="text-xs text-slate-600">Branch exposure chart dari data real, tanpa bobot AI.</p>
          </div>
          <ResponsiveBarChart data={topBranches} xAxisKey="name" dataKeys={['count']} showLegend={false} height="h-[320px]" />
        </div>

        {realLoading ? <div className="mt-4 text-sm text-slate-500">Memuat data real...</div> : null}
      </AnalyticsSection>

      <AnalyticsSection
        title="Skor Risiko dari AI"
        description="Layer AI diambil melalui proxy internal `/api/ai/risk/summary`. Metrik ini tidak dicampur dengan volume real; fungsinya untuk prioritisasi dan profiling risiko."
        variant="ai"
      >
        {aiError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{aiError}</div>
        ) : aiLoading ? (
          <AnalyticsSectionLoading
            variant="ai"
            title="Memuat skor risiko AI"
            description="Pipeline AI sedang menghitung severity distribution, ranking branch, dan ranking airline."
            cards={4}
            panels={5}
          />
        ) : riskSummary ? (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <AnalyticsMetricCard icon={Plane} label="Airlines Scored" value={(riskSummary.total_airlines || 0).toLocaleString('id-ID')} caption="Entitas yang di-score AI" tone="ai" />
              <AnalyticsMetricCard icon={Building2} label="Branches Scored" value={(riskSummary.total_branches || 0).toLocaleString('id-ID')} caption="Cabang dengan skor AI" tone="ai" />
              <AnalyticsMetricCard icon={ShieldAlert} label="Hubs Scored" value={(riskSummary.total_hubs || 0).toLocaleString('id-ID')} caption="Hub dalam model AI" tone="ai" />
              <AnalyticsMetricCard icon={Gauge} label="Top Risk Branch" value={topRiskLevel?.name || '-'} caption={topRiskLevel ? `Score ${topRiskLevel.risk_score.toFixed(2)}` : 'Belum ada skor'} tone="ai" />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <SeverityDistributionChart data={aiAirlineSeverity} title="Severity AI: Airlines" />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <SeverityDistributionChart data={aiBranchSeverity} title="Severity AI: Branches" />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <SeverityDistributionChart data={aiHubSeverity} title="Severity AI: Hubs" />
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">Top Risky Branches</h3>
                  <p className="text-xs text-slate-600">Skor AI tertinggi berdasarkan severity distribution dan frekuensi kasus.</p>
                </div>
                <ResponsiveBarChart data={aiBranchChart} xAxisKey="name" dataKeys={['riskScore', 'issues']} height="h-[320px]" />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">Top Risky Airlines</h3>
                  <p className="text-xs text-slate-600">Skor AI tertinggi per maskapai, dipisahkan dari volume real.</p>
                </div>
                <ResponsiveBarChart data={aiAirlineChart} xAxisKey="name" dataKeys={['riskScore', 'issues']} height="h-[320px]" />
              </div>
            </div>
          </>
        ) : (
          <AnalyticsUnavailable
            title="Analitik risiko AI belum tersedia"
            description="Proxy AI tidak mengembalikan payload risiko yang valid, jadi section ini belum bisa menampilkan scoring risiko."
          />
        )}
      </AnalyticsSection>
    </div>
  );
}
