# Customer Feedback Detail Charts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 18 custom-tailored detail chart pages for the Customer Feedback Dashboard, each optimized for its specific analytical context with relevant KPIs, visualizations, and data tables.

**Architecture:** Create dedicated detail page components for each chart type, with custom KPI calculations, context-specific visualizations using Recharts, and comprehensive data tables. Reuse existing components where possible (InvestigativeTable, DataTableWithPagination) while building chart-specific visualization components. Each detail page receives context via URL params (sourceSheet, originSlug, filterCriteria).

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Recharts, TailwindCSS, existing query processor for data fetching

---

## Phase 1: Core Charts (Priority)

### Task 1: Enhance Report by Case Category Detail

**Files:**
- Modify: `components/charts/report-by-case-category/ReportByCaseCategoryDetail.tsx`
- Modify: `components/charts/report-by-case-category/data.ts`
- Test: Manual testing with embed dashboard

**Step 1: Add new KPI calculations to data.ts**

Add after existing fetchCategoryBreakdown:

```typescript
export interface CategoryKPIs {
  totalReports: number;
  mostAffectedBranch: { name: string; count: number };
  topAirline: { name: string; count: number };
  avgResolutionTime: number;
}

export async function fetchCategoryKPIs(filters: FilterParams): Promise<CategoryKPIs> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  // Calculate KPIs
  const totalReports = reports.length;

  // Most affected branch
  const branchCounts = new Map<string, number>();
  reports.forEach((r: any) => {
    const branch = r.branch || 'Unknown';
    branchCounts.set(branch, (branchCounts.get(branch) || 0) + 1);
  });
  const mostAffectedBranch = Array.from(branchCounts.entries())
    .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  // Top airline
  const airlineCounts = new Map<string, number>();
  reports.forEach((r: any) => {
    const airline = r.airline || r.airlines || 'Unknown';
    airlineCounts.set(airline, (airlineCounts.get(airline) || 0) + 1);
  });
  const topAirline = Array.from(airlineCounts.entries())
    .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  // Avg resolution time (placeholder - calculate from created_at to closed_at if available)
  const avgResolutionTime = 0; // TODO: Calculate when status/timestamp data available

  return {
    totalReports,
    mostAffectedBranch: { name: mostAffectedBranch[0], count: mostAffectedBranch[1] },
    topAirline: { name: topAirline[0], count: topAirline[1] },
    avgResolutionTime,
  };
}
```

**Step 2: Add severity distribution fetch function**

```typescript
export interface SeverityDistribution {
  category: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function fetchSeverityByCategory(filters: FilterParams): Promise<SeverityDistribution[]> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  // Group by category and severity
  const categoryMap = new Map<string, { critical: number; high: number; medium: number; low: number }>();

  reports.forEach((r: any) => {
    const category = r.main_category || r.category || 'Unknown';
    const severity = (r.severity || 'Low').toLowerCase();

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { critical: 0, high: 0, medium: 0, low: 0 });
    }

    const counts = categoryMap.get(category)!;
    if (severity.includes('critical')) counts.critical++;
    else if (severity.includes('high')) counts.high++;
    else if (severity.includes('medium')) counts.medium++;
    else counts.low++;
  });

  return Array.from(categoryMap.entries()).map(([category, counts]) => ({
    category,
    ...counts,
  }));
}
```

**Step 3: Update ReportByCaseCategoryDetail to use new KPIs**

In `ReportByCaseCategoryDetail.tsx`, add state and fetch:

```typescript
const [kpis, setKpis] = useState<CategoryKPIs | null>(null);
const [severityData, setSeverityData] = useState<SeverityDistribution[]>([]);

useEffect(() => {
  async function loadKPIs() {
    const kpiData = await fetchCategoryKPIs(filters);
    setKpis(kpiData);

    const sevData = await fetchSeverityByCategory(filters);
    setSeverityData(sevData);
  }
  loadKPIs();
}, [filters]);
```

**Step 4: Add new KPI cards section**

Replace or enhance existing KPI row:

```typescript
{kpis && (
  <div className="grid grid-cols-4 gap-4 mb-6">
    <KPICard
      title="Total Reports"
      value={kpis.totalReports.toLocaleString('id-ID')}
      color="blue"
    />
    <KPICard
      title="Most Affected Branch"
      value={kpis.mostAffectedBranch.name}
      subtitle={`${kpis.mostAffectedBranch.count} reports`}
      color="red"
    />
    <KPICard
      title="Top Airline"
      value={kpis.topAirline.name}
      subtitle={`${kpis.topAirline.count} reports`}
      color="yellow"
    />
    <KPICard
      title="Avg Resolution Time"
      value={kpis.avgResolutionTime > 0 ? `${kpis.avgResolutionTime}h` : 'N/A'}
      color="green"
    />
  </div>
)}
```

**Step 5: Add Severity Distribution Chart**

```typescript
{severityData.length > 0 && (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <h3 className="text-lg font-bold mb-4">Severity Distribution by Category</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={severityData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
        <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
        <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
        <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}
```

**Step 6: Test manually**

1. Navigate to `/embed/custom/customer-feedback-main`
2. Click on "Report by Case Category" chart detail button
3. Verify new KPI cards appear
4. Verify severity distribution chart shows
5. Test with different filters (hub, branch, date range)
6. Test with CGO source sheet

**Step 7: Commit**

Changes ready for commit (user will handle git separately)

---

### Task 2: Enhance Branch Report Detail

**Files:**
- Modify: `components/charts/branch-report/BranchReportDetail.tsx`
- Modify: `components/charts/branch-report/data.ts`

**Step 1: Add Branch KPIs data functions**

In `components/charts/branch-report/data.ts`:

```typescript
export interface BranchKPIs {
  totalBranches: number;
  topPerformer: { name: string; count: number };
  worstPerformer: { name: string; count: number };
  avgReportsPerBranch: number;
  momChange: number; // Month-over-month change percentage
}

export async function fetchBranchKPIs(filters: FilterParams): Promise<BranchKPIs> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  // Count by branch
  const branchCounts = new Map<string, number>();
  reports.forEach((r: any) => {
    const branch = r.branch || 'Unknown';
    branchCounts.set(branch, (branchCounts.get(branch) || 0) + 1);
  });

  const branches = Array.from(branchCounts.entries()).sort((a, b) => a[1] - b[1]);
  const totalBranches = branches.length;
  const topPerformer = branches[0] || ['None', 0]; // Lowest count = best performer
  const worstPerformer = branches[branches.length - 1] || ['None', 0]; // Highest count = worst
  const avgReportsPerBranch = totalBranches > 0 ? reports.length / totalBranches : 0;

  // TODO: Calculate MoM change when date filtering is implemented
  const momChange = 0;

  return {
    totalBranches,
    topPerformer: { name: topPerformer[0], count: topPerformer[1] },
    worstPerformer: { name: worstPerformer[0], count: worstPerformer[1] },
    avgReportsPerBranch: Math.round(avgReportsPerBranch),
    momChange,
  };
}
```

**Step 2: Add Branch Category Distribution function**

```typescript
export interface BranchCategoryData {
  branch: string;
  irregularity: number;
  complaint: number;
  compliment: number;
}

export async function fetchBranchCategoryDistribution(filters: FilterParams): Promise<BranchCategoryData[]> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const branchMap = new Map<string, { irregularity: number; complaint: number; compliment: number }>();

  reports.forEach((r: any) => {
    const branch = r.branch || 'Unknown';
    const category = (r.main_category || r.category || '').toLowerCase();

    if (!branchMap.has(branch)) {
      branchMap.set(branch, { irregularity: 0, complaint: 0, compliment: 0 });
    }

    const counts = branchMap.get(branch)!;
    if (category.includes('irregularity')) counts.irregularity++;
    else if (category.includes('complaint')) counts.complaint++;
    else if (category.includes('compliment')) counts.compliment++;
  });

  return Array.from(branchMap.entries())
    .map(([branch, counts]) => ({ branch, ...counts }))
    .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment));
}
```

**Step 3: Update BranchReportDetail component**

Add state and fetching:

```typescript
const [kpis, setKpis] = useState<BranchKPIs | null>(null);
const [categoryDist, setCategoryDist] = useState<BranchCategoryData[]>([]);

useEffect(() => {
  async function loadData() {
    const kpiData = await fetchBranchKPIs(filters);
    setKpis(kpiData);

    const catData = await fetchBranchCategoryDistribution(filters);
    setCategoryDist(catData);
  }
  loadData();
}, [filters]);
```

**Step 4: Add enhanced KPI cards (5 cards)**

```typescript
{kpis && (
  <div className="grid grid-cols-5 gap-4 mb-6">
    <KPICard title="Total Branches" value={kpis.totalBranches} color="blue" />
    <KPICard
      title="Top Performer"
      value={kpis.topPerformer.name}
      subtitle={`${kpis.topPerformer.count} reports`}
      color="green"
    />
    <KPICard
      title="Worst Performer"
      value={kpis.worstPerformer.name}
      subtitle={`${kpis.worstPerformer.count} reports`}
      color="red"
    />
    <KPICard
      title="Avg Reports/Branch"
      value={kpis.avgReportsPerBranch}
      color="yellow"
    />
    <KPICard
      title="MoM Change"
      value={kpis.momChange > 0 ? `+${kpis.momChange}%` : `${kpis.momChange}%`}
      trend={kpis.momChange}
      color="blue"
    />
  </div>
)}
```

**Step 5: Add Category Distribution Stacked Bar Chart**

```typescript
{categoryDist.length > 0 && (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <h3 className="text-lg font-bold mb-4">Category Distribution per Branch</h3>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={categoryDist.slice(0, 10)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="branch" type="category" width={100} />
        <Tooltip />
        <Legend />
        <Bar dataKey="irregularity" stackId="a" fill="#4ade80" name="Irregularity" />
        <Bar dataKey="complaint" stackId="a" fill="#0ea5e9" name="Complaint" />
        <Bar dataKey="compliment" stackId="a" fill="#facc15" name="Compliment" />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}
```

**Step 6: Test**

1. Navigate to Branch Report detail page
2. Verify 5 KPI cards display correctly
3. Verify category distribution chart shows top 10 branches
4. Test filtering by hub, airlines
5. Verify CGO context works

**Step 7: Commit**

Changes ready for commit.

---

### Task 3: Enhance Airlines Report Detail

**Files:**
- Modify: `components/charts/airline-report/AirlineReportDetail.tsx`
- Create: `components/charts/airline-report/data.ts`

**Step 1: Create data.ts for Airlines Report**

```typescript
export interface AirlineKPIs {
  totalAirlines: number;
  topAirline: { name: string; count: number };
  bestPerformer: { name: string; count: number };
  avgReportsPerAirline: number;
  complimentRatio: number; // Percentage of compliments
}

export async function fetchAirlineKPIs(filters: any): Promise<AirlineKPIs> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const airlineCounts = new Map<string, { total: number; compliments: number }>();

  reports.forEach((r: any) => {
    const airline = r.airline || r.airlines || 'Unknown';
    const category = (r.main_category || r.category || '').toLowerCase();

    if (!airlineCounts.has(airline)) {
      airlineCounts.set(airline, { total: 0, compliments: 0 });
    }

    const counts = airlineCounts.get(airline)!;
    counts.total++;
    if (category.includes('compliment')) counts.compliments++;
  });

  const airlines = Array.from(airlineCounts.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.total - a.total);

  const totalAirlines = airlines.length;
  const topAirline = airlines[0] || { name: 'None', total: 0, compliments: 0 };
  const bestPerformer = airlines.sort((a, b) => a.total - b.total)[0] || { name: 'None', total: 0 };
  const avgReportsPerAirline = totalAirlines > 0 ? reports.length / totalAirlines : 0;
  const totalCompliments = airlines.reduce((sum, a) => sum + a.compliments, 0);
  const complimentRatio = reports.length > 0 ? (totalCompliments / reports.length) * 100 : 0;

  return {
    totalAirlines,
    topAirline: { name: topAirline.name, count: topAirline.total },
    bestPerformer: { name: bestPerformer.name, count: bestPerformer.total },
    avgReportsPerAirline: Math.round(avgReportsPerAirline),
    complimentRatio: Math.round(complimentRatio),
  };
}

export interface AirlineCategoryData {
  airline: string;
  irregularity: number;
  complaint: number;
  compliment: number;
}

export async function fetchAirlineCategoryBreakdown(filters: any): Promise<AirlineCategoryData[]> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const airlineMap = new Map<string, { irregularity: number; complaint: number; compliment: number }>();

  reports.forEach((r: any) => {
    const airline = r.airline || r.airlines || 'Unknown';
    const category = (r.main_category || r.category || '').toLowerCase();

    if (!airlineMap.has(airline)) {
      airlineMap.set(airline, { irregularity: 0, complaint: 0, compliment: 0 });
    }

    const counts = airlineMap.get(airline)!;
    if (category.includes('irregularity')) counts.irregularity++;
    else if (category.includes('complaint')) counts.complaint++;
    else if (category.includes('compliment')) counts.compliment++;
  });

  return Array.from(airlineMap.entries())
    .map(([airline, counts]) => ({ airline, ...counts }))
    .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
    .slice(0, 10);
}
```

**Step 2: Update AirlineReportDetail.tsx**

Add imports and state:

```typescript
import { fetchAirlineKPIs, fetchAirlineCategoryBreakdown, AirlineKPIs, AirlineCategoryData } from './data';

const [kpis, setKpis] = useState<AirlineKPIs | null>(null);
const [categoryData, setCategoryData] = useState<AirlineCategoryData[]>([]);

useEffect(() => {
  async function loadData() {
    const kpiData = await fetchAirlineKPIs(filters);
    setKpis(kpiData);

    const catData = await fetchAirlineCategoryBreakdown(filters);
    setCategoryData(catData);
  }
  loadData();
}, [filters]);
```

**Step 3: Add 5 KPI cards**

```typescript
{kpis && (
  <div className="grid grid-cols-5 gap-4 mb-6">
    <KPICard title="Total Airlines" value={kpis.totalAirlines} color="blue" />
    <KPICard
      title="Top Airline"
      value={kpis.topAirline.name}
      subtitle={`${kpis.topAirline.count} reports`}
      color="red"
    />
    <KPICard
      title="Best Performer"
      value={kpis.bestPerformer.name}
      subtitle={`${kpis.bestPerformer.count} reports`}
      color="green"
    />
    <KPICard title="Avg Reports/Airline" value={kpis.avgReportsPerAirline} color="yellow" />
    <KPICard title="Compliment Ratio" value={`${kpis.complimentRatio}%`} color="green" />
  </div>
)}
```

**Step 4: Add Category Breakdown Chart**

```typescript
{categoryData.length > 0 && (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <h3 className="text-lg font-bold mb-4">Top 10 Airlines - Category Breakdown</h3>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={categoryData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="airline" type="category" width={120} />
        <Tooltip />
        <Legend />
        <Bar dataKey="irregularity" stackId="a" fill="#4ade80" name="Irregularity" />
        <Bar dataKey="complaint" stackId="a" fill="#0ea5e9" name="Complaint" />
        <Bar dataKey="compliment" stackId="a" fill="#facc15" name="Compliment" />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}
```

**Step 5: Test**

1. Navigate to Airlines Report detail
2. Verify 5 KPI cards
3. Verify top 10 airlines chart
4. Test with filters

**Step 6: Commit**

Changes ready.

---

### Task 4: Enhance Monthly Report Detail

**Files:**
- Modify: `components/charts/monthly-report/MonthlyReportDetail.tsx`
- Create: `components/charts/monthly-report/data.ts`

**Step 1: Create data.ts**

```typescript
export interface MonthlyKPIs {
  currentMonthTotal: number;
  previousMonthTotal: number;
  momChange: number;
  highestPeakMonth: { month: string; count: number };
}

export async function fetchMonthlyKPIs(filters: any): Promise<MonthlyKPIs> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  // Group by month
  const monthCounts = new Map<string, number>();
  reports.forEach((r: any) => {
    const date = new Date(r.date_of_event || r.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  });

  const sortedMonths = Array.from(monthCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const currentMonth = sortedMonths[sortedMonths.length - 1];
  const previousMonth = sortedMonths[sortedMonths.length - 2];

  const currentMonthTotal = currentMonth?.[1] || 0;
  const previousMonthTotal = previousMonth?.[1] || 0;
  const momChange = previousMonthTotal > 0
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    : 0;

  const highestPeak = sortedMonths.sort((a, b) => b[1] - a[1])[0];

  return {
    currentMonthTotal,
    previousMonthTotal,
    momChange: Math.round(momChange),
    highestPeakMonth: {
      month: highestPeak?.[0] || 'N/A',
      count: highestPeak?.[1] || 0
    },
  };
}

export interface MonthlyTrendData {
  month: string;
  total: number;
  irregularity: number;
  complaint: number;
  compliment: number;
}

export async function fetchMonthlyTrendByCategory(filters: any): Promise<MonthlyTrendData[]> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.hub && filters.hub !== 'all') params.append('hub', filters.hub);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const monthMap = new Map<string, { total: number; irregularity: number; complaint: number; compliment: number }>();

  reports.forEach((r: any) => {
    const date = new Date(r.date_of_event || r.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const category = (r.main_category || r.category || '').toLowerCase();

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
    }

    const counts = monthMap.get(monthKey)!;
    counts.total++;
    if (category.includes('irregularity')) counts.irregularity++;
    else if (category.includes('complaint')) counts.complaint++;
    else if (category.includes('compliment')) counts.compliment++;
  });

  return Array.from(monthMap.entries())
    .map(([month, counts]) => ({ month, ...counts }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
```

**Step 2: Update MonthlyReportDetail.tsx**

```typescript
import { fetchMonthlyKPIs, fetchMonthlyTrendByCategory, MonthlyKPIs, MonthlyTrendData } from './data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const [kpis, setKpis] = useState<MonthlyKPIs | null>(null);
const [trendData, setTrendData] = useState<MonthlyTrendData[]>([]);

useEffect(() => {
  async function loadData() {
    const kpiData = await fetchMonthlyKPIs(filters);
    setKpis(kpiData);

    const trend = await fetchMonthlyTrendByCategory(filters);
    setTrendData(trend);
  }
  loadData();
}, [filters]);
```

**Step 3: Add 4 KPI cards**

```typescript
{kpis && (
  <div className="grid grid-cols-4 gap-4 mb-6">
    <KPICard
      title="Current Month"
      value={kpis.currentMonthTotal}
      color="blue"
    />
    <KPICard
      title="Previous Month"
      value={kpis.previousMonthTotal}
      color="gray"
    />
    <KPICard
      title="MoM Change"
      value={`${kpis.momChange > 0 ? '+' : ''}${kpis.momChange}%`}
      trend={kpis.momChange}
      color={kpis.momChange > 0 ? 'red' : 'green'}
    />
    <KPICard
      title="Highest Peak"
      value={kpis.highestPeakMonth.month}
      subtitle={`${kpis.highestPeakMonth.count} reports`}
      color="yellow"
    />
  </div>
)}
```

**Step 4: Add Category Trend Lines Chart**

```typescript
{trendData.length > 0 && (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <h3 className="text-lg font-bold mb-4">Category Trends Over Time</h3>
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="irregularity" stroke="#4ade80" strokeWidth={2} name="Irregularity" />
        <Line type="monotone" dataKey="complaint" stroke="#0ea5e9" strokeWidth={2} name="Complaint" />
        <Line type="monotone" dataKey="compliment" stroke="#facc15" strokeWidth={2} name="Compliment" />
        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" name="Total" />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}
```

**Step 5: Test**

1. Navigate to Monthly Report detail
2. Verify KPIs show current/previous month
3. Verify trend chart displays properly
4. Test date range filtering

**Step 6: Commit**

Changes ready.

---

## Phase 2: Area & Cross-Dimensional Charts

### Task 5: Create HUB Report Detail Page (NEW)

**Files:**
- Create: `app/dashboard/charts/hub-report/detail/page.tsx`
- Create: `components/charts/hub-report/HubReportDetail.tsx`
- Create: `components/charts/hub-report/data.ts`

**Step 1: Create page.tsx**

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import HubReportDetail from '@/components/charts/hub-report/HubReportDetail';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function HubReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';

  const [filters, setFilters] = useState<FilterState>({
    hub: 'all',
    branch: 'all',
    airlines: 'all',
    area: 'all',
    sourceSheet,
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const originSlug = searchParams.get('originSlug') || 'customer-feedback-main';
                router.push(`/embed/custom/${originSlug}`);
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-[#6b8e3d]"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">HUB Report</h1>
              <p className="text-xs text-gray-500">Hub-level strategic analysis & performance</p>
              <p className="text-[10px] font-semibold text-emerald-600 mt-1">Source: {filters.sourceSheet}</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.branch}
              onChange={(e) => setFilters(f => ({ ...f, branch: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Branches</option>
              <option value="Terminal 1">Terminal 1</option>
              <option value="Terminal 2">Terminal 2</option>
              <option value="Terminal 3">Terminal 3</option>
            </select>

            <select
              value={filters.airlines}
              onChange={(e) => setFilters(f => ({ ...f, airlines: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Airlines</option>
              <option value="Garuda">Garuda</option>
              <option value="Citilink">Citilink</option>
              <option value="Batik Air">Batik Air</option>
            </select>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <HubReportDetail filters={filters} />
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Create data.ts**

```typescript
export interface HubKPIs {
  totalHubs: number;
  topPerformer: { name: string; count: number };
  mostChallenging: { name: string; count: number };
  avgReportsPerHub: number;
}

export async function fetchHubKPIs(filters: any): Promise<HubKPIs> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const hubCounts = new Map<string, number>();
  reports.forEach((r: any) => {
    const hub = r.hub || 'Unknown';
    hubCounts.set(hub, (hubCounts.get(hub) || 0) + 1);
  });

  const hubs = Array.from(hubCounts.entries()).sort((a, b) => a[1] - b[1]);
  const totalHubs = hubs.length;
  const topPerformer = hubs[0] || ['None', 0];
  const mostChallenging = hubs[hubs.length - 1] || ['None', 0];
  const avgReportsPerHub = totalHubs > 0 ? reports.length / totalHubs : 0;

  return {
    totalHubs,
    topPerformer: { name: topPerformer[0], count: topPerformer[1] },
    mostChallenging: { name: mostChallenging[0], count: mostChallenging[1] },
    avgReportsPerHub: Math.round(avgReportsPerHub),
  };
}

export interface HubCategoryData {
  hub: string;
  irregularity: number;
  complaint: number;
  compliment: number;
}

export async function fetchHubCategoryBreakdown(filters: any): Promise<HubCategoryData[]> {
  const baseUrl = '/api/admin/reports';
  const params = new URLSearchParams();
  if (filters.sourceSheet) params.append('source_sheet', filters.sourceSheet);
  if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
  if (filters.airlines && filters.airlines !== 'all') params.append('airlines', filters.airlines);

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();
  const reports = data.reports || [];

  const hubMap = new Map<string, { irregularity: number; complaint: number; compliment: number }>();

  reports.forEach((r: any) => {
    const hub = r.hub || 'Unknown';
    const category = (r.main_category || r.category || '').toLowerCase();

    if (!hubMap.has(hub)) {
      hubMap.set(hub, { irregularity: 0, complaint: 0, compliment: 0 });
    }

    const counts = hubMap.get(hub)!;
    if (category.includes('irregularity')) counts.irregularity++;
    else if (category.includes('complaint')) counts.complaint++;
    else if (category.includes('compliment')) counts.compliment++;
  });

  return Array.from(hubMap.entries())
    .map(([hub, counts]) => ({ hub, ...counts }))
    .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment));
}
```

**Step 3: Create HubReportDetail.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { fetchHubKPIs, fetchHubCategoryBreakdown, HubKPIs, HubCategoryData } from './data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue';
}

function KPICard({ title, value, subtitle, color = 'blue' }: KPICardProps) {
  const colorClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      {subtitle && <div className="text-xs font-medium opacity-70 mt-1">{subtitle}</div>}
    </div>
  );
}

export default function HubReportDetail({ filters }: { filters: any }) {
  const [kpis, setKpis] = useState<HubKPIs | null>(null);
  const [categoryData, setCategoryData] = useState<HubCategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const kpiData = await fetchHubKPIs(filters);
      setKpis(kpiData);

      const catData = await fetchHubCategoryBreakdown(filters);
      setCategoryData(catData);
      setLoading(false);
    }
    loadData();
  }, [filters]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          <KPICard title="Total Hubs" value={kpis.totalHubs} color="blue" />
          <KPICard
            title="Top Performer"
            value={kpis.topPerformer.name}
            subtitle={`${kpis.topPerformer.count} reports`}
            color="green"
          />
          <KPICard
            title="Most Challenging"
            value={kpis.mostChallenging.name}
            subtitle={`${kpis.mostChallenging.count} reports`}
            color="red"
          />
          <KPICard
            title="Avg Reports/Hub"
            value={kpis.avgReportsPerHub}
            color="yellow"
          />
        </div>
      )}

      {/* Hub Ranking Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Hub Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hub" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="irregularity" stackId="a" fill="#4ade80" name="Irregularity" />
              <Bar dataKey="complaint" stackId="a" fill="#0ea5e9" name="Complaint" />
              <Bar dataKey="compliment" stackId="a" fill="#facc15" name="Compliment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Update routing in CustomDashboardContent.tsx**

In `resolveCustomerFeedbackDetailRoute`, add HUB case:

```typescript
if (titleLower.includes('hub report') || titleLower === 'hub') {
  return { path: '/dashboard/charts/hub-report/detail' };
}
```

**Step 5: Test**

1. Add a HUB Report chart to a test dashboard
2. Click detail button
3. Verify navigation to new HUB detail page
4. Verify KPIs and chart display

**Step 6: Commit**

Changes ready.

---

## Summary & Next Steps

This implementation plan covers:

✅ **Phase 1 Complete (4 tasks):**
1. Report by Case Category Detail - Enhanced
2. Branch Report Detail - Enhanced
3. Airlines Report Detail - Enhanced
4. Monthly Report Detail - Enhanced

✅ **Phase 2 Started (1 task):**
5. HUB Report Detail - NEW PAGE CREATED

**Remaining Tasks (13 detail pages):**
- Category by Area Detail
- Case Category by Branch Detail
- Case Category by Airlines Detail
- Case Report by Area Detail
- Terminal Area Category Detail
- Apron Area Category Detail
- General Category Detail
- 6 Pivot detail pages (Terminal/Apron/General by Branch/Airlines)

**Each remaining page follows the same pattern:**
1. Create/enhance data.ts with KPI and breakdown functions
2. Update detail component with new visualizations
3. Add contextual KPI cards
4. Test with filters and source sheet context

**Execution Options:**

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks
2. **Parallel Session (separate)** - Open new session with executing-plans skill for batch execution

Which approach would you like?
