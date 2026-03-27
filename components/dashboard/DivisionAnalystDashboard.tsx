'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { RefreshCw, Loader2, Search, Filter, ChevronDown, AlertTriangle, Link as LinkIcon, ExternalLink, Copy, X } from 'lucide-react';

import { ResponsiveHeader } from '@/components/dashboard/analyst/ResponsiveHeader';
import { ResponsiveStatsGrid } from '@/components/dashboard/analyst/ResponsiveStatsGrid';
import { ReportsTableSection } from '@/components/dashboard/analyst/ReportsTableSection';
import { ReportsList } from '@/components/dashboard/analyst/ReportsList';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { CustomerFeedbackFilterModal } from '@/components/dashboard/analyst/CustomerFeedbackFilterModal';
import { TriageModal } from '@/components/dashboard/analyst/TriageModal';
import { AISummaryKPICards } from '@/components/dashboard/ai-summary';

import { exportToExcel as doExportExcel, exportToPDF as doExportPDF } from '@/lib/analyst-export';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Report, AnalyticsData, ComparisonData } from '@/types';
import { calculateComparisonData } from '@/lib/utils/comparison-utils';
import type { DivisionConfig } from '@/components/dashboard/AnalyticsDashboard';

const AnalystCharts = dynamic(
  () => import('@/components/dashboard/analyst/AnalystCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{
            borderColor: 'var(--surface-4)',
            borderTopColor: 'var(--brand-primary)',
          }}
        />
      </div>
    ),
  }
);


interface DivisionAnalystDashboardProps {
  division: DivisionConfig;
  enforceDivisionScope?: boolean;
}

export function DivisionAnalystDashboard({
  division,
  enforceDivisionScope = true,
}: DivisionAnalystDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | { from: string; to: string }>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [triageReport, setTriageReport] = useState<Report | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  const [cfLoading, setCfLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [savedDashboards, setSavedDashboards] = useState<any[]>([]);
  const [listFilter, setListFilter] = useState('all');
  const [listSeverity, setListSeverity] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);
  const view = searchParams.get('view') === 'reports' ? 'reports' : 'dashboard';
  const [showOSDashboardModal, setShowOSDashboardModal] = useState(false);
  const [osDashboardLink, setOsDashboardLink] = useState<string>('https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314');
  const [showOPDashboardModal, setShowOPDashboardModal] = useState(false);
  const [opDashboardLink, setOpDashboardLink] = useState<string>('https://lookerstudio.google.com/u/0/reporting/06d31553-08c6-42f3-81e6-1bc96356a854/page/tKISF');

  // Global Filters State
  const [globalFilters, setGlobalFilters] = useState<{
    hubs: string[];
    branches: string[];
    airlines: string[];
    categories: string[];
  }>({
    hubs: [],
    branches: [],
    airlines: [],
    categories: [],
  });

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (isRefresh) {
          await fetch('/api/reports/refresh', { method: 'POST' });
        }

        const [reportsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/reports'),
          fetch('/api/admin/analytics'),
        ]);

        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setReports(Array.isArray(data) ? data : []);
        }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }

        const dbRes = await fetch('/api/dashboards');
        if (dbRes.ok) {
          const data = await dbRes.json();
          setSavedDashboards(data.dashboards || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('os_dashboard_link') : null;
      if (saved) setOsDashboardLink(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('op_dashboard_link') : null;
      if (saved) setOpDashboardLink(saved);
    } catch {}
  }, []);

  const filteredReports = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    let cutoffDate: Date;
    let explicitEndDate: Date | null = null;

    if (typeof dateRange === 'object') {
      cutoffDate = new Date(dateRange.from);
      cutoffDate.setHours(0, 0, 0, 0);
      explicitEndDate = new Date(dateRange.to);
      explicitEndDate.setHours(23, 59, 59, 999);
    } else if (dateRange === 'all') {
      cutoffDate = new Date(0);
    } else if (dateRange === 'month') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }
    
    const endDate = explicitEndDate || today;
    const divisionCode = division.code.toUpperCase();

    const base = reports.filter((r) => {
      if (divisionCode && enforceDivisionScope && r.target_division !== divisionCode) return false;

      const dateStr = r.date_of_event || r.created_at;
      if (!dateStr) return false;
      
      let d: Date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, day] = dateStr.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(dateStr);
      }
      
      return d >= cutoffDate && d <= endDate;
    });

    let result = base;

    if (globalFilters.hubs.length > 0) {
      result = result.filter(r => globalFilters.hubs.includes(r.hub || ''));
    }
    if (globalFilters.branches.length > 0) {
      result = result.filter(r => {
        const branchCode = r.stations?.code || r.branch || '';
        return globalFilters.branches.includes(branchCode);
      });
    }
    if (globalFilters.airlines.length > 0) {
      result = result.filter(r => {
        const airlineCode = r.airlines || r.airline || '';
        return globalFilters.airlines.includes(airlineCode);
      });
    }
    if (globalFilters.categories.length > 0) {
      result = result.filter(r => globalFilters.categories.includes(r.main_category || ''));
    }

    return result;
  }, [reports, dateRange, globalFilters, division.code, enforceDivisionScope]);
  const listReports = useMemo(() => {
    const s = listSearch.toLowerCase();
    const divisionCode = division.code.toUpperCase();

    return reports.filter(r => {
      if (divisionCode && enforceDivisionScope && r.target_division !== divisionCode) return false;

      if (listFilter !== 'all' && r.status !== listFilter) return false;
      if (listSeverity !== 'all' && r.severity !== listSeverity) return false;
      if (!s) return true;
      return (r.title || '').toLowerCase().includes(s) ||
        (r.report || '').toLowerCase().includes(s) ||
        (r.location || '').toLowerCase().includes(s) ||
        (r.users?.full_name || r.reporter_name || '').toLowerCase().includes(s) ||
        (r.stations?.name || '').toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s) ||
        (r.reference_number || '').toLowerCase().includes(s) ||
        (r.flight_number || '').toLowerCase().includes(s);
    });
  }, [reports, listFilter, listSeverity, listSearch, division.code, enforceDivisionScope]);
  const setView = (v: 'dashboard' | 'reports') => {
    const basePath = `/dashboard/${division.code.toLowerCase()}`;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('view', v);
    router.replace(`${basePath}?${sp.toString()}`);
  };

  // Reset visible count when filter/search/view changes
  useEffect(() => {
    if (view === 'reports') {
      setVisibleCount(100);
    }
  }, [view, listFilter, listSeverity, listSearch]);

  const filteredStats = useMemo(() => {
    const total = filteredReports.length;
    const resolved = filteredReports.filter((r) => r.status === 'CLOSED').length;
    const pending = filteredReports.filter(
      (r) => r.status === 'OPEN'
    ).length;
    const highSeverity = filteredReports.filter(
      (r) => r.severity === 'high' || r.severity === 'urgent'
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, highSeverity, resolutionRate };
  }, [filteredReports]);

  const drilldownUrl = (type: string, value: string) =>
    `/dashboard/analyst/drilldown?type=${type}&value=${encodeURIComponent(
      value
    )}&period=${dateRange}`;

  // Filter options
  const availableOptions = useMemo(() => {
    const hubs = new Set<string>();
    const branches = new Set<string>();
    const airlines = new Set<string>();
    const categories = new Set<string>();

    reports.forEach((r) => {
      if (r.hub) hubs.add(r.hub);
      if (r.stations?.code) branches.add(r.stations.code);
      else if (r.branch) branches.add(r.branch);
      if (r.airlines) airlines.add(r.airlines);
      else if (r.airline) airlines.add(r.airline);
      if (r.main_category) categories.add(r.main_category);
    });

    return {
      hubs: Array.from(hubs).sort(),
      branches: Array.from(branches).sort(),
      airlines: Array.from(airlines).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [reports]);

  const handleCustomerFeedbackShortcut = useCallback(async () => {
    setCfLoading(true);
    try {
      const cachedSlug = localStorage.getItem('cf_dashboard_slug');

      if (cachedSlug) {
        const checkRes = await fetch(`/api/dashboards?slug=${cachedSlug}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.dashboards?.length > 0) {
            router.push(`/embed/custom/${cachedSlug}`);
            return;
          }
        }
        localStorage.removeItem('cf_dashboard_slug');
      }

      const res = await fetch('/api/dashboards/customer-feedback-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Failed to generate dashboard');

      const data = await res.json();
      if (data.dashboard?.slug) {
        localStorage.setItem('cf_dashboard_slug', data.dashboard.slug);
        router.push(`/embed/custom/${data.dashboard.slug}`);
      } else {
        throw new Error('No slug returned');
      }
    } catch (err) {
      console.error('Customer Feedback shortcut error:', err);
      alert('Gagal membuka Customer Feedback Dashboard. Silakan coba lagi.');
    } finally {
      setCfLoading(false);
    }
  }, [router]);

  const existingFolders = useMemo(
    () =>
      Array.from(
        new Set(
          savedDashboards
            .map((d) => d.folder)
            .filter((f): f is string => !!f)
        )
      ),
    [savedDashboards]
  );

  const handleApplyFilter = async (filterData: any) => {
    setFilterLoading(true);
    try {
      const res = await fetch('/api/dashboards/customer-feedback-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData),
      });

      if (!res.ok) throw new Error('Failed to generate dashboard');

      const data = await res.json();
      if (data.dashboard?.slug) {
        router.push(`/embed/custom/${data.dashboard.slug}`);
      }
    } catch (err) {
      console.error('Filter apply error:', err);
      alert('Gagal menerapkan filter');
    } finally {
      setFilterLoading(false);
      setShowFilterModal(false);
    }
  };

  const handleTriageSubmit = async (data: {
    primary_tag: string;
    sub_category_note: string;
    target_division: string;
  }) => {
    if (!triageReport) return;

    try {
      const res = await fetch(`/api/reports/${triageReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_tag: data.primary_tag,
          sub_category_note: data.sub_category_note,
          target_division: data.target_division,
          status: 'OPEN',
        }),
      });

      if (!res.ok) throw new Error('Failed to update report');

      await fetchData(true);
      setIsTriageOpen(false);
      setTriageReport(null);
    } catch (error) {
      console.error('Triage update failed:', error);
      alert('Gagal update laporan');
    }
  };

  const exportToExcel = async () => {
    setExporting('excel');
    try {
      await doExportExcel({ reports, filteredReports, analytics, dateRange });
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    try {
      await doExportPDF({ reports, filteredReports, analytics, dateRange });
    } finally {
      setExporting(null);
    }
  };

  const handleStatClick = (type: string) => {
    switch (type) {
      case 'total':
        router.push(drilldownUrl('severity', 'all'));
        break;
      case 'resolved':
        router.push(drilldownUrl('status', 'CLOSED'));
        break;
      case 'pending':
        router.push(drilldownUrl('status', 'OPEN'));
        break;
      case 'high':
        router.push(drilldownUrl('severity', 'high'));
        break;
    }
  };

  const caseCategoryData = useMemo(() => {
    const irregularity = filteredReports.filter(
      (r) => r.category === 'Irregularity'
    ).length;
    const complaint = filteredReports.filter(
      (r) => r.category === 'Complaint'
    ).length;
    const compliment = filteredReports.filter(
      (r) => r.category === 'Compliment'
    ).length;
    return [
      { name: 'Irregularity', value: irregularity, fill: '#10b981' },
      { name: 'Complaint', value: complaint, fill: '#ec4899' },
      { name: 'Compliment', value: compliment, fill: '#06b6d4' },
    ];
  }, [filteredReports]);

  const branchReportData = useMemo(() => {
    const stations: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const station = r.stations?.code || 'Unknown';
      stations[station] = (stations[station] || 0) + 1;
    });
    return Object.entries(stations)
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredReports]);

  const monthlyReportData = useMemo(() => {
    const dataMap = new Map<
      string,
      { irregularity: number; complaint: number; compliment: number; date: Date }
    >();

    filteredReports.forEach((r) => {
      const dateStr = r.date_of_event || r.created_at;
      if (!dateStr) return;
      
      let d: Date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, day] = dateStr.split('-').map(Number);
          d = new Date(y, m - 1, day);
      } else {
          d = new Date(dateStr);
      }
      
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          irregularity: 0,
          complaint: 0,
          compliment: 0,
          date: d,
        });
      }
      const entry = dataMap.get(key)!;

      if (r.category === 'Irregularity') entry.irregularity++;
      else if (r.category === 'Complaint') entry.complaint++;
      else if (r.category === 'Compliment') entry.compliment++;
    });

    return Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => ({
        month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', {
          month: 'short',
        })}`,
        irregularity: val.irregularity,
        complaint: val.complaint,
        compliment: val.compliment,
      }))
      .slice(-14);
  }, [filteredReports]);

  const categoryByAreaData = useMemo(() => {
    const areas: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const raw = (r.area || '').toString().trim().toLowerCase();
      let area: string | null = null;
      if (raw.includes('terminal')) area = 'Terminal Area';
      else if (raw.includes('apron')) area = 'Apron Area';
      else if (raw.includes('general')) area = 'General';

      if (area) {
        areas[area] = (areas[area] || 0) + 1;
      }
    });
    const sorted = Object.entries(areas)
      .map(([area, count]) => ({ name: area, value: count }))
      .sort((a, b) => b.value - a.value);
    const fills = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    return sorted.map((item, i) => ({ ...item, fill: fills[i % fills.length] }));
  }, [filteredReports]);

  const categoryByBranchData = useMemo(() => {
    const branchData: Record<
      string,
      { irregularity: number; complaint: number; compliment: number }
    > = {};
    filteredReports.forEach((r) => {
      const branch = r.stations?.code || 'Unknown';
      if (!branchData[branch])
        branchData[branch] = { irregularity: 0, complaint: 0, compliment: 0 };
      if (r.category === 'Irregularity') branchData[branch].irregularity++;
      else if (r.category === 'Complaint') branchData[branch].complaint++;
      else if (r.category === 'Compliment') branchData[branch].compliment++;
    });
    return Object.entries(branchData)
      .map(([branch, data]) => ({ branch, ...data }))
      .sort(
        (a, b) =>
          b.irregularity +
          b.complaint +
          b.compliment -
          (a.irregularity + a.complaint + a.compliment)
      )
      .slice(0, 10);
  }, [filteredReports]);

  const areaSubCategoryData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};

    filteredReports.forEach((r) => {
      const raw = (r.area || '').toString().trim().toLowerCase();
      let area: string | null = null;
      if (raw.includes('terminal')) area = 'Terminal Area';
      else if (raw.includes('apron')) area = 'Apron Area';
      else if (raw.includes('general')) area = 'General';

      if (!area) return;
      const subCat = r.category || 'Uncategorized';

      if (!dataMap[area]) dataMap[area] = {};
      dataMap[area][subCat] = (dataMap[area][subCat] || 0) + 1;
    });

    return Object.entries(dataMap).map(([area, counts]) => ({
      area,
      ...counts,
    }));
  }, [filteredReports]);

  const categoryByAirlinesData = useMemo(() => {
    const airlinesData: Record<
      string,
      { irregularity: number; complaint: number; compliment: number }
    > = {};
    filteredReports.forEach((r) => {
      const airline = r.airlines || 'Unknown';
      if (!airlinesData[airline])
        airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
      if (r.category === 'Irregularity') airlinesData[airline].irregularity++;
      else if (r.category === 'Complaint') airlinesData[airline].complaint++;
      else if (r.category === 'Compliment') airlinesData[airline].compliment++;
    });
    return Object.entries(airlinesData)
      .map(([airline, data]) => ({ airline, ...data }))
      .sort(
        (a, b) =>
          b.irregularity +
          b.complaint +
          b.compliment -
          (a.irregularity + a.complaint + a.compliment)
      )
      .slice(0, 8);
  }, [filteredReports]);

  const topReportersData = useMemo(() => {
    const reporterMap: Record<
      string,
      { name: string; station: string; count: number }
    > = {};
    filteredReports.forEach((r) => {
      const name = r.users?.full_name || r.reporter_name || 'Unknown';
      const station = r.stations?.code || r.branch || '-';
      const key = name;
      if (!reporterMap[key]) reporterMap[key] = { name, station, count: 0 };
      reporterMap[key].count++;
    });
    return Object.values(reporterMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredReports]);

  const monthlyComparisonData = useMemo(() => {
    const dataMap = new Map<
      string,
      { masuk: number; selesai: number; date: Date }
    >();

    filteredReports.forEach((r) => {
      const dateStrCreated = r.date_of_event || r.created_at;
      if (dateStrCreated) {
        let dCreated: Date;
        if (typeof dateStrCreated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStrCreated)) {
            const [y, m, day] = dateStrCreated.split('-').map(Number);
            dCreated = new Date(y, m - 1, day);
        } else {
            dCreated = new Date(dateStrCreated);
        }

        if (!isNaN(dCreated.getTime())) {
          const keyCreated = `${dCreated.getFullYear()}-${String(
            dCreated.getMonth() + 1
          ).padStart(2, '0')}`;
          if (!dataMap.has(keyCreated))
            dataMap.set(keyCreated, { masuk: 0, selesai: 0, date: dCreated });
          dataMap.get(keyCreated)!.masuk++;
        }
      }

      if (r.resolved_at) {
        const dResolved = new Date(r.resolved_at);
        if (!isNaN(dResolved.getTime())) {
          const keyResolved = `${dResolved.getFullYear()}-${String(
            dResolved.getMonth() + 1
          ).padStart(2, '0')}`;
          if (!dataMap.has(keyResolved))
            dataMap.set(keyResolved, { masuk: 0, selesai: 0, date: dResolved });
          dataMap.get(keyResolved)!.selesai++;
        }
      }
    });

    return Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => {
        const rate = val.masuk > 0 ? Math.round((val.selesai / val.masuk) * 100) : 0;
        return {
          month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', {
            month: 'short',
          })}`,
          masuk: val.masuk,
          selesai: val.selesai,
          rate,
        };
      })
      .slice(-14);
  }, [filteredReports]);

  const hubDistributionData = useMemo(() => {
    const hubMap: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const hub = r.hub || 'Unknown';
      hubMap[hub] = (hubMap[hub] || 0) + 1;
    });
    return Object.entries(hubMap)
      .map(([hub, count]) => ({ hub, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredReports]);

  const resolutionByBranchData = useMemo(() => {
    const branchMap: Record<string, { total: number; resolved: number }> = {};
    filteredReports.forEach((r) => {
      const branch = r.stations?.code || r.branch || 'Unknown';
      if (!branchMap[branch]) branchMap[branch] = { total: 0, resolved: 0 };
      branchMap[branch].total++;
      if (r.status === 'CLOSED') branchMap[branch].resolved++;
    });
    return Object.entries(branchMap)
      .map(([branch, data]) => ({
        branch,
        total: data.total,
        resolved: data.resolved,
        rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredReports]);

  const caseReportByAreaData = useMemo(() => {
    const branchMap: Record<string, Record<string, { terminal: number; apron: number; general: number }>> = {};
    filteredReports.forEach((r) => {
      const branch = r.branch || r.stations?.code || 'Unknown';
      const airline = (r.airlines || (r as any).airline || 'Unknown').trim() || 'Unknown';
      const area = (r.area || '').toLowerCase();
      if (!branchMap[branch]) branchMap[branch] = {};
      if (!branchMap[branch][airline]) branchMap[branch][airline] = { terminal: 0, apron: 0, general: 0 };
      if (area.includes('terminal')) branchMap[branch][airline].terminal++;
      else if (area.includes('apron')) branchMap[branch][airline].apron++;
      else if (area.includes('general')) branchMap[branch][airline].general++;
    });
    return Object.entries(branchMap)
      .map(([branch, airlineData]) => {
        const airlines = Object.entries(airlineData)
          .map(([name, c]) => ({
            name,
            terminal: c.terminal,
            apron: c.apron,
            general: c.general,
            total: c.terminal + c.apron + c.general,
          }))
          .sort((a, b) => b.total - a.total);
        return {
          branch,
          airlines,
          totalTerminal: Object.values(airlineData).reduce((s, v) => s + v.terminal, 0),
          totalApron: Object.values(airlineData).reduce((s, v) => s + v.apron, 0),
          totalGeneral: Object.values(airlineData).reduce((s, v) => s + v.general, 0),
          grandTotal: Object.values(airlineData).reduce((s, v) => s + v.terminal + v.apron + v.general, 0),
        };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }, [filteredReports]);

  const terminalAreaCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const rawArea = (r.area || '').toString().trim().toLowerCase();
      if (!rawArea.includes('terminal')) return;
      const cat = (r as any).terminal_area_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  const apronAreaCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const rawArea = (r.area || '').toString().trim().toLowerCase();
      if (!rawArea.includes('apron')) return;
      const cat = (r as any).apron_area_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  const generalCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const rawArea = (r.area || '').toString().trim().toLowerCase();
      if (!rawArea.includes('general')) return;
      const cat = (r as any).general_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  const caseClassificationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const cat = (r as any).case_classification as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  // MoM / YoY comparison data
  const comparisonData = useMemo(() => {
    return calculateComparisonData(filteredReports);
  }, [filteredReports]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{
            borderColor: 'var(--surface-4)',
            borderTopColor: 'var(--brand-primary)',
          }}
        />
        <p className="text-sm text-[var(--text-muted)] mt-4 uppercase tracking-widest font-bold">
          Loading {division.name} Dashboard...
        </p>
      </div>
    );
  }

  const isOSAnalyst = user?.division === 'OS' && user?.role === 'ANALYST';
  const hasAllReportsAccess = division.code === 'OS' || isOSAnalyst;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
          linear-gradient(90deg, oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
          radial-gradient(circle at 0% 0%, oklch(0.65 0.18 160 / 0.08) 0%, transparent 40%),
          radial-gradient(circle at 100% 100%, oklch(0.58 0.2 162 / 0.06) 0%, transparent 40%)
        `,
        backgroundSize: '24px 24px, 24px 24px, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 0 0, 0 0, 0 0',
        backgroundColor: 'var(--surface-0)',
      }}
    >
      <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-24 pt-0 px-3 sm:px-4 md:px-6 w-full max-w-none">
        <PresentationSlide className="!p-3 sm:!p-4 md:!p-5 !min-h-0 !bg-[var(--surface-1)] !shadow-sm !border !border-[var(--surface-3)] rounded-xl sm:rounded-2xl md:rounded-[24px] !overflow-visible">
          <ResponsiveHeader
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRefresh={() => fetchData(true)}
            refreshing={refreshing}
            onCustomerFeedback={division.code === 'OP' ? undefined : handleCustomerFeedbackShortcut}
            cfLoading={division.code === 'OP' ? false : cfLoading}
            onFilterClick={division.code === 'OP' ? undefined : () => setShowFilterModal(true)}
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            exporting={exporting}
            divisionDashboardLabel={division.code === 'OP' ? 'Dashboard OP' : undefined}
            onOpenDivisionDashboard={division.code === 'OP' ? () => setShowOPDashboardModal(true) : undefined}
            onSwitchDivision={() => router.push('/dashboard/eskalasi/select')}
          />
          <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            {hasAllReportsAccess && (
              <button
                onClick={() => setView('reports')}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all ${view === 'reports' ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <span className="truncate max-w-[140px] sm:max-w-none">Semua Laporan</span>
              </button>
            )}
          </div>
          {view === 'dashboard' && division.code === 'OS' && (
            <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => router.push('/dashboard/os/joumpa')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <span className="truncate">JOUMPA</span>
              </button>
              <button
                onClick={() => setShowOSDashboardModal(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-teal-700 to-cyan-700 text-white shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <LinkIcon className="shrink-0 sm:w-4 sm:h-4" />
                <span className="truncate">Dashboard OS</span>
              </button>
              <button
                onClick={() => window.open('https://lookerstudio.google.com/u/0/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_qqvwkh1hsd', '_blank')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span className="truncate">Survey</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/os/sla')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                <span className="truncate">SLA</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/os/wsn')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><rect x="3" y="3" width="7" height="9" rx="1"/><path d="M14 3h7v5h-7z"/><path d="M14 12h7v9h-7z"/></svg>
                <span className="truncate">WSN</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/os/handbook')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M20 22H6.5A2.5 2.5 0 0 1 4 19.5V6"/><path d="M20 15V2H6.5A2.5 2.5 0 0 0 4 4.5V6"/><path d="M8 6h8"/></svg>
                <span className="truncate">Handbook</span>
              </button>
              <button
                onClick={() => window.open('https://lookerstudio.google.com/u/6/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_uyfwmq7usd', '_blank')}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 active:scale-95 flex-1 sm:flex-none justify-center min-w-0 sm:min-w-[160px] whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-4 sm:h-4"><path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7z"/><path d="M3 7V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.4.6L12 5"/></svg>
                <span className="truncate">Tentang OS</span>
              </button>
            </div>
          )}
          {view === 'dashboard' && division.code === 'OT' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/dashboard/ot/complaint-by-category')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2v4"/><path d="M8 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Complaint per Category</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/ot/risk-severity')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21 18-8-14-8 14Z"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Risk & Severity</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/ot/case-status')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Status Case</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/ot/gse')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">GSE Dashboard</span>
              </button>
            </div>
          )}
          {view === 'dashboard' && division.code === 'OP' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/dashboard/op/complaint-by-category')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2v4"/><path d="M8 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Complaint per Category</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/risk-severity')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21 18-8-14-8 14Z"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Risk & Severity</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/irregularity-complaint-top-cases')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Top Irregularity & Complaint</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/root-cause-dominant')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Root Cause Dominan</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/case-status')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Status Case</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/sla-compliance')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">SLA Compliance</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/cargo-irregularity')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><path d="M14 3h7v5h-7z"/><path d="M14 12h7v9h-7z"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Logistik Irregularity</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/joumpa')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Joumpa Handling</span>
              </button>
            </div>
          )}
          {division.code === 'UQ' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  router.push('/dashboard/charts/report-by-case-category/detail?hideFilters=true&sourcePage=uq')
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2v4"/><path d="M8 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Complaint per Category</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/risk-severity')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21 18-8-14-8 14Z"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Risk & Severity</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/op/case-status')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Risk of Case</span>
              </button>
              <button
                onClick={() =>
                  router.push('/dashboard/charts/monthly-report/detail?hideFilters=true&sourcePage=uq')
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Monitoring Efektivitas</span>
              </button>
              <button
                onClick={() =>
                  router.push('/dashboard/charts/category-by-area/detail?hideFilters=true&sourcePage=uq')
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:scale-95 min-w-[160px] h-12 sm:h-auto whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <span className="truncate max-w-[150px] sm:max-w-none">Monitoring Kesesuaian Standar</span>
              </button>
            </div>
          )}
          {view === 'reports' && (
            <div className="mt-6">
              <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari laporan..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 w-full lg:w-auto">
                    <div className="relative min-w-[150px]">
                      <select
                        value={listFilter}
                        onChange={(e) => setListFilter(e.target.value)}
                        className="w-full h-12 pl-10 pr-8 appearance-none bg-gray-50 rounded-xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-[11px] uppercase tracking-wide text-slate-600"
                      >
                        <option value="all">Semua Status</option>
                        <option value="OPEN">Open</option>
                        <option value="ON PROGRESS">On Progress</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500" />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <div className="relative min-w-[150px]">
                      <select
                        value={listSeverity}
                        onChange={(e) => setListSeverity(e.target.value)}
                        className="w-full h-12 pl-10 pr-8 appearance-none bg-gray-50 rounded-xl border border-transparent hover:bg-gray-100 transition-colors outline-none font-bold text-[11px] uppercase tracking-wide text-slate-600"
                      >
                        <option value="all">Semua Severity</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      onClick={() => fetchData(true)}
                      disabled={refreshing}
                      className="h-12 w-12 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-slate-500 transition-all active:scale-95"
                    >
                      <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </PresentationSlide>

        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-2">
              <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
                <ResponsiveStatsGrid
                  stats={filteredStats}
                  onStatClick={handleStatClick}
                  compact
                />
              </PresentationSlide>
            </div>
            <div className="lg:col-span-3">
              <ReportsTableSection
                reports={filteredReports}
                dateRange={dateRange}
                onViewReport={setSelectedReport}
                onTriageReport={(report) => {
                  setTriageReport(report);
                  setIsTriageOpen(true);
                }}
                drilldownUrl={drilldownUrl}
              />
            </div>
          </div>
        )}
        {view === 'reports' && (
          <div className="max-w-[1700px] mx-auto w-full">
            {/* AI Summary KPI Cards */}
            <div className="mb-6">
              <AISummaryKPICards showHeader={true} hideActionIntelligence={true} />
            </div>
            
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full animate-pulse bg-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Daftar Laporan</h2>
              </div>
              <p className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-3)] px-3 py-1 rounded-full uppercase tracking-tighter">
                {listReports.length} laporan
              </p>
            </div>
            <ReportsList
              reports={listReports.slice(0, visibleCount)}
              onReportClick={setSelectedReport}
              loading={loading || refreshing}
              disableAnimation={visibleCount > 150 || listReports.length > 150}
            />
            {listReports.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisibleCount((c) => Math.min(c + 300, listReports.length))}
                  className="px-6 py-3 rounded-2xl text-sm font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--surface-4)] active:scale-95 transition-all"
                >
                  Tampilkan 300 lagi ({visibleCount}/{listReports.length})
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <AnalystCharts
            analytics={analytics}
            caseCategoryData={caseCategoryData}
            branchReportData={branchReportData}
            monthlyReportData={monthlyReportData}
            categoryByAreaData={categoryByAreaData}
            categoryByBranchData={categoryByBranchData}
            areaSubCategoryData={areaSubCategoryData}
            categoryByAirlinesData={categoryByAirlinesData}
            topReportersData={topReportersData}
            monthlyComparisonData={monthlyComparisonData}
            hubDistributionData={hubDistributionData}
            resolutionByBranchData={resolutionByBranchData}
            filteredReports={filteredReports}
            caseReportByAreaData={caseReportByAreaData}
            terminalAreaCategoryData={terminalAreaCategoryData}
            apronAreaCategoryData={apronAreaCategoryData}
            generalCategoryData={generalCategoryData}
            caseClassificationData={caseClassificationData}
            comparisonData={comparisonData}
            onDrilldown={(url) => router.push(url)}
            drilldownUrl={drilldownUrl}
            globalFilters={globalFilters}
            setGlobalFilters={setGlobalFilters}
            availableOptions={availableOptions}
          />
        )}

        {showOPDashboardModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOPDashboardModal(false)} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in border border-[var(--surface-3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <LinkIcon size={18} /> Dashboard OP
                </h3>
                <button onClick={() => setShowOPDashboardModal(false)} className="p-2 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                Ubah, salin, atau buka tautan Dashboard OP (Google Looker Studio).
              </p>
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-[var(--text-muted)]">Link Dashboard</label>
                <input
                  type="text"
                  value={opDashboardLink}
                  onChange={(e) => setOpDashboardLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                  placeholder="https://lookerstudio.google.com/..."
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(opDashboardLink);
                      } catch {}
                    }}
                    className="flex-1 py-3.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold rounded-xl hover:bg-[var(--surface-3)] transition-all text-[13px] flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Salin Link
                  </button>
                  <button
                    onClick={() => window.open(opDashboardLink, '_blank')}
                    className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-[13px] flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> Buka
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('op_dashboard_link', opDashboardLink);
                      } catch {}
                      setShowOPDashboardModal(false);
                    }}
                    className="flex-1 py-3.5 bg-[var(--brand-primary)] text-white font-bold rounded-xl hover:bg-[var(--brand-primary-hover,#2563eb)] active:scale-[0.98] transition-all text-[13px]"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      const saved = typeof window !== 'undefined' ? localStorage.getItem('op_dashboard_link') : null;
                      setOpDashboardLink(saved || 'https://lookerstudio.google.com/u/0/reporting/06d31553-08c6-42f3-81e6-1bc96356a854/page/tKISF');
                    }}
                    className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[13px]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showOSDashboardModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOSDashboardModal(false)} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in border border-[var(--surface-3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <LinkIcon size={18} /> Dashboard OS
                </h3>
                <button onClick={() => setShowOSDashboardModal(false)} className="p-2 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                Ubah, salin, atau buka tautan Dashboard OS (Google Looker Studio).
              </p>
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-[var(--text-muted)]">Link Dashboard</label>
                <input
                  type="text"
                  value={osDashboardLink}
                  onChange={(e) => setOsDashboardLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                  placeholder="https://lookerstudio.google.com/..."
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(osDashboardLink);
                      } catch {}
                    }}
                    className="flex-1 py-3.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold rounded-xl hover:bg-[var(--surface-3)] transition-all text-[13px] flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Salin Link
                  </button>
                  <button
                    onClick={() => window.open(osDashboardLink, '_blank')}
                    className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-[13px] flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> Buka
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('os_dashboard_link', osDashboardLink);
                      } catch {}
                      setShowOSDashboardModal(false);
                    }}
                    className="flex-1 py-3.5 bg-[var(--brand-primary)] text-white font-bold rounded-xl hover:bg-[var(--brand-primary-hover,#2563eb)] active:scale-[0.98] transition-all text-[13px]"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      const saved = typeof window !== 'undefined' ? localStorage.getItem('os_dashboard_link') : null;
                      setOsDashboardLink(saved || 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314');
                    }}
                    className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[13px]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          userRole={`DIVISI_${division.code}` as any}
        />

        <CustomerFeedbackFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilter}
          loading={filterLoading}
          availableHubs={availableOptions.hubs}
          availableBranches={availableOptions.branches}
          availableAirlines={availableOptions.airlines}
          availableCategories={availableOptions.categories}
          existingFolders={existingFolders}
        />

        <TriageModal
          isOpen={isTriageOpen}
          onClose={() => {
            setIsTriageOpen(false);
            setTriageReport(null);
          }}
          report={triageReport}
          onSubmit={handleTriageSubmit}
        />
      </div>
    </div>
  );
}
