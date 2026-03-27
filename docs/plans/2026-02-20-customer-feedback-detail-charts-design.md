# Customer Feedback Detail Charts - Custom Tailored Design

**Date:** 2026-02-20
**Author:** Claude Code
**Status:** Design Approved

## Overview

This document outlines the design for enhancing all detail chart pages across the Customer Feedback Dashboard (5 pages, 32+ unique charts). Each detail page will be custom-tailored to its chart's specific context, providing relevant KPIs, visualizations, and data tables.

## Design Principle

**Custom Tailored Approach**: Each chart type gets a unique detail page optimized for its specific analytical purpose, rather than using a generic template.

## User Requirements

1. ✅ Visualizations that are highly relevant to each chart's context
2. ✅ Comprehensive data tables with all important dimensions
3. ✅ Contextual KPI cards tailored to each chart type
4. ✅ Dynamic filters that adapt to the chart context
5. ✅ Multi-dimensional breakdowns: Time, Severity, Status, Location

## Chart Inventory & Detail Pages

### Page 1: Case Category (Landside/Airside) - 7 Charts
### Page 2: Detail Category (Landside/Airside) - 6 Charts
### Page 3: Detail Report (Pivot Tables) - 6 Charts
### Page 4: CGO Overview - 7 Charts
### Page 5: CGO Detail - 6 Charts

**Total: 32 unique charts → 18 unique detail page types**

---

## Detail Page Designs

### 1. Report by Case Category Detail

**Chart Context:** Analysis of Irregularity vs Complaint vs Compliment

**Route:** `/dashboard/charts/report-by-case-category/detail`

**KPI Cards (4):**
- Total Reports (by selected category)
- Most Affected Branch
- Top Contributing Airline
- Avg Resolution Time

**Visualizations:**
1. Category Breakdown Donut (main chart replica)
2. Monthly Trend Line (category over time)
3. Severity Distribution Bar (Critical/High/Medium/Low per category)
4. Geographic Heatmap (Branch × Category)
5. Airlines Impact Table (Top 10 airlines per category)

**Data Table Columns:**
- Date, Category, Severity, Status, Branch, Airline, Description, Action Taken

**Data Queries:**
- Category distribution by main_category
- Monthly trend: GROUP BY date_of_event (month), main_category
- Severity breakdown: GROUP BY main_category, severity
- Branch-Category matrix: GROUP BY branch, main_category
- Airline impact: GROUP BY airline, main_category ORDER BY count DESC LIMIT 10

---

### 2. Branch Report Detail

**Chart Context:** Branch performance analysis & ranking

**Route:** `/dashboard/charts/branch-report/detail`

**KPI Cards (5):**
- Total Branches
- Top Performer (lowest reports)
- Worst Performer (highest reports)
- Avg Reports per Branch
- Month-over-Month Change

**Visualizations:**
1. Branch Ranking Bar (sorted by report count)
2. Branch Trend Over Time (line chart, top 5 branches)
3. Category Distribution per Branch (stacked bar)
4. Severity Heatmap (Branch × Severity Level)
5. Status Progress Chart (Open/In Progress/Closed per branch)

**Data Table Columns:**
- Branch, Total Reports, Irregularity Count, Complaint Count, Compliment Count, Avg Response Time, Status Summary

**Data Queries:**
- Branch ranking: GROUP BY branch ORDER BY count DESC
- Branch trend: GROUP BY branch, date_of_event (month)
- Category per branch: GROUP BY branch, main_category
- Severity matrix: GROUP BY branch, severity
- Status breakdown: GROUP BY branch, status

---

### 3. Airlines Report Detail

**Chart Context:** Airline-specific performance & issue tracking

**Route:** `/dashboard/charts/airline-report/detail`

**KPI Cards (5):**
- Total Airlines Tracked
- Top Airline (most reports)
- Best Performing Airline
- Avg Reports per Airline
- Compliment Ratio (compliments / total reports)

**Visualizations:**
1. Airline Ranking Bar (sorted by volume)
2. Airline Trend Timeline (top 10 airlines over months)
3. Category Breakdown per Airline (Irregularity/Complaint/Compliment stacked)
4. Geographic Distribution (Airlines × Branch heatmap)
5. Issue Type Analysis (Top issues per airline)

**Data Table Columns:**
- Airline, Flight Number, Date, Category, Branch, Issue Description, Status, Resolution

**Data Queries:**
- Airline ranking: GROUP BY airline ORDER BY count DESC
- Airline trend: GROUP BY airline, date_of_event (month) LIMIT 10 airlines
- Category per airline: GROUP BY airline, main_category
- Airline-Branch matrix: GROUP BY airline, branch
- Top issues: GROUP BY airline, description/category

---

### 4. Monthly Report Detail

**Chart Context:** Time series analysis & trend forecasting

**Route:** `/dashboard/charts/monthly-report/detail`

**KPI Cards (4):**
- Current Month Total
- Previous Month Total
- Month-over-Month % Change
- Highest Peak Month

**Visualizations:**
1. Monthly Trend Line (full timeline with trend line)
2. Year-over-Year Comparison Bar
3. Seasonal Pattern Analysis (heatmap by month × year)
4. Category Trend Lines (Irregularity, Complaint, Compliment separately)
5. Monthly Branch Distribution (stacked area chart)

**Data Table Columns:**
- Month, Total Reports, Irregularity, Complaint, Compliment, Top Branch, Top Airline, Avg Response Time

**Data Queries:**
- Monthly trend: GROUP BY date_of_event (month) ORDER BY date ASC
- YoY comparison: Compare same month across years
- Seasonal pattern: GROUP BY EXTRACT(month), EXTRACT(year)
- Category trends: GROUP BY date_of_event (month), main_category
- Branch distribution: GROUP BY date_of_event (month), branch

---

### 5. Category by Area Detail

**Chart Context:** Geographic/operational area analysis

**Route:** `/dashboard/charts/category-by-area/detail`

**KPI Cards (4):**
- Total Areas
- Highest Volume Area
- Most Critical Area (by severity)
- Area Coverage %

**Visualizations:**
1. Area Distribution Donut (Landside/Airside/Terminal/Apron/General)
2. Category Breakdown per Area (stacked bar)
3. Severity Heatmap (Area × Severity)
4. Area Trend Over Time (line chart per area)
5. Branch Distribution per Area (nested donut)

**Data Table Columns:**
- Area, Sub-Category, Branch, Date, Category, Severity, Status, Description

**Data Queries:**
- Area distribution: GROUP BY area
- Category per area: GROUP BY area, main_category
- Severity matrix: GROUP BY area, severity
- Area trend: GROUP BY area, date_of_event (month)
- Branch-Area: GROUP BY area, branch

---

### 6. Case Category by Branch Detail

**Chart Context:** Cross-dimensional analysis (Branch × Category)

**Route:** `/dashboard/charts/case-category-by-branch/detail`

**KPI Cards (4):**
- Total Branch-Category Combinations
- Most Problematic Pair
- Best Performing Pair
- Overall Coverage %

**Visualizations:**
1. Interactive Pivot Heatmap (Branch rows × Category columns)
2. Top 10 Branch-Category Pairs (bar chart)
3. Trend Analysis (selected pair over time)
4. Severity Distribution (for selected pair)
5. Drill-down Tree Map (hierarchical view)

**Data Table Columns:**
- Branch, Category, Count, Percentage, Avg Severity, Status Summary, Top Issue

**Data Queries:**
- Pivot data: GROUP BY branch, main_category
- Top pairs: GROUP BY branch, main_category ORDER BY count DESC LIMIT 10
- Pair trend: WHERE branch = ? AND main_category = ? GROUP BY date_of_event (month)
- Severity for pair: WHERE branch = ? AND main_category = ? GROUP BY severity

---

### 7. Case Category by Airlines Detail

**Chart Context:** Cross-dimensional analysis (Airline × Category)

**Route:** `/dashboard/charts/case-category-by-airline/detail`

**KPI Cards (4):**
- Total Airline-Category Combinations
- Most Frequent Pair
- Critical Pairs (high severity)
- Improvement Rate

**Visualizations:**
1. Interactive Pivot Heatmap (Airline rows × Category columns)
2. Top 10 Airline-Category Pairs (horizontal bar)
3. Pair Trend Analysis (over time)
4. Flight-Specific Breakdown (for selected airline)
5. Geographic Distribution (where issues occur)

**Data Table Columns:**
- Airline, Category, Count, Branches Affected, Avg Response Time, Status, Recent Issues

**Data Queries:**
- Pivot data: GROUP BY airline, main_category
- Top pairs: GROUP BY airline, main_category ORDER BY count DESC LIMIT 10
- Pair trend: WHERE airline = ? AND main_category = ? GROUP BY date_of_event (month)
- Branch distribution: WHERE airline = ? AND main_category = ? GROUP BY branch

---

### 8. Case Report by Area Detail (Grid/Pivot)

**Chart Context:** Multi-dimensional geographic analysis (Branch × Airline × Area)

**Route:** `/dashboard/charts/pivot-report/detail` (enhanced for area context)

**KPI Cards (5):**
- Total Area Coverage
- Highest Density Area
- Most Affected Branch
- Most Frequent Airline
- Critical Zones Count

**Visualizations:**
1. Interactive 3D Grid (Branch × Area with drill-down to Airlines)
2. Density Heatmap (color-coded by volume)
3. Area Distribution Bar (Terminal/Apron/Landside/Airside)
4. Temporal Pattern (area activity by time of day/week)
5. Hotspot Analysis (identify problem zones)

**Data Table Columns:**
- Branch, Airlines, Area, Sub-Area, Count, Severity, Peak Hours, Status, Issues

**Data Queries:**
- 3D pivot: GROUP BY branch, area, airline
- Density map: GROUP BY area ORDER BY count DESC
- Area distribution: GROUP BY area
- Temporal pattern: GROUP BY area, EXTRACT(hour), EXTRACT(dow)
- Hotspot: WHERE severity IN ('Critical', 'High') GROUP BY branch, area

---

### 9. Terminal Area Category Detail

**Chart Context:** Deep dive into Terminal-specific issues

**Route:** `/dashboard/charts/terminal-area-category/detail`

**KPI Cards (4):**
- Total Terminal Reports
- Most Common Terminal Issue
- Critical Terminal Issues
- Terminal Avg Response Time

**Visualizations:**
1. Terminal Category Breakdown (horizontal bar by sub-category)
2. Terminal-Branch Matrix (which terminals in which branches)
3. Terminal Issue Trend (monthly pattern)
4. Severity Distribution (Terminal categories by severity)
5. Airline Impact (which airlines affected most in terminal area)

**Data Table Columns:**
- Date, Terminal Category, Sub-Category, Branch, Airline, Severity, Issue Description, Action Taken, Status

**Data Queries:**
- WHERE area = 'Terminal Area' OR terminal_area_category IS NOT NULL
- Category breakdown: GROUP BY terminal_area_category
- Branch matrix: GROUP BY terminal_area_category, branch
- Trend: GROUP BY terminal_area_category, date_of_event (month)
- Airline impact: GROUP BY terminal_area_category, airline

---

### 10. Apron Area Category Detail

**Chart Context:** Apron/airside operational issue analysis

**Route:** `/dashboard/charts/apron-area-category/detail`

**KPI Cards (4):**
- Total Apron Reports
- Most Common Apron Issue
- Critical Apron Issues
- Apron Avg Response Time

**Visualizations:**
1. Apron Category Breakdown (horizontal bar by sub-category)
2. Airline-Apron Correlation (which airlines have most apron issues)
3. Apron Issue Trend (daily/weekly patterns - operational times)
4. Safety-Critical Issues Tracker (urgent apron issues)
5. Branch Apron Performance (comparison across branches)

**Data Table Columns:**
- Date, Time, Apron Category, Sub-Category, Branch, Airline, Flight Number, Severity, Issue, Action Taken

**Data Queries:**
- WHERE area = 'Apron Area' OR apron_area_category IS NOT NULL
- Category breakdown: GROUP BY apron_area_category
- Airline correlation: GROUP BY apron_area_category, airline
- Temporal trend: GROUP BY apron_area_category, date_of_event, EXTRACT(hour)
- Safety issues: WHERE severity IN ('Critical', 'High') AND apron_area_category IS NOT NULL

---

### 11. General Category Detail

**Chart Context:** General/miscellaneous issues not in Terminal/Apron

**Route:** `/dashboard/charts/general-category/detail`

**KPI Cards (4):**
- Total General Reports
- Most Common General Issue
- General Area Coverage
- Resolution Rate

**Visualizations:**
1. General Category Breakdown (bar chart by sub-category)
2. Issue Type Distribution (pie/donut of general categories)
3. General Issue Trend (over time)
4. Branch General Performance (which branches have most general issues)
5. Recurring Issues Tracker (identify patterns)

**Data Table Columns:**
- Date, General Category, Sub-Category, Branch, Description, Severity, Status, Resolution Time

**Data Queries:**
- WHERE area = 'General' OR general_category IS NOT NULL
- Category breakdown: GROUP BY general_category
- Issue distribution: GROUP BY general_category
- Trend: GROUP BY general_category, date_of_event (month)
- Branch performance: GROUP BY general_category, branch
- Recurring: GROUP BY general_category, description HAVING count > threshold

---

### 12. HUB Report Detail ⚠️ NEW PAGE

**Chart Context:** Hub-level strategic analysis (CGK, SUB, etc.)

**Route:** `/dashboard/charts/hub-report/detail` (TO BE CREATED)

**KPI Cards (5):**
- Total Hubs
- Top Performing Hub
- Most Challenging Hub
- Hub Efficiency Score
- Inter-Hub Comparison Score

**Visualizations:**
1. Hub Distribution Map (geographic visualization if possible)
2. Hub Ranking Bar (sorted by total reports)
3. Hub Trend Comparison (multi-line chart, all hubs over time)
4. Hub Category Breakdown (stacked bar: Irregularity/Complaint/Compliment per hub)
5. Hub-Branch Hierarchy Tree (organizational view)
6. Hub-Airlines Matrix (heatmap of airlines operating at each hub)

**Data Table Columns:**
- Hub, Total Reports, Branches, Airlines Served, Irregularity %, Complaint %, Compliment %, Avg Response Time, Status

**Data Queries:**
- Hub ranking: GROUP BY hub ORDER BY count DESC
- Hub trend: GROUP BY hub, date_of_event (month)
- Category breakdown: GROUP BY hub, main_category
- Hub-Branch hierarchy: GROUP BY hub, branch
- Hub-Airlines matrix: GROUP BY hub, airline

---

### 13. Terminal Area by Branch Detail

**Chart Context:** Cross-analysis of Terminal categories across branches

**Route:** `/dashboard/charts/pivot-report/detail?context=terminal-branch`

**KPI Cards (3):**
- Total Branch-Terminal Pairs
- Most Problematic Combination
- Branch Coverage %

**Visualizations:**
1. Pivot Heatmap (Branch rows × Terminal Category columns)
2. Top 10 Pairs Bar Chart
3. Trend for Selected Pair (timeline)
4. Severity Breakdown (for selected pair)

**Data Table Columns:**
- Branch, Terminal Category, Count, Severity Distribution, Status Summary

**Data Queries:**
- WHERE terminal_area_category IS NOT NULL
- Pivot: GROUP BY branch, terminal_area_category
- Top pairs: GROUP BY branch, terminal_area_category ORDER BY count DESC LIMIT 10
- Trend: WHERE branch = ? AND terminal_area_category = ? GROUP BY date_of_event (month)

---

### 14. Apron Area by Branch Detail

**Chart Context:** Cross-analysis of Apron categories across branches

**Route:** `/dashboard/charts/pivot-report/detail?context=apron-branch`

**KPI Cards (3):**
- Total Branch-Apron Pairs
- Critical Combination
- Safety Alert Count

**Visualizations:**
1. Pivot Heatmap (Branch rows × Apron Category columns)
2. Top 10 Pairs Bar Chart
3. Operational Trend (time-based pattern)
4. Airline Impact (which airlines affected in specific branch-apron pairs)

**Data Table Columns:**
- Branch, Apron Category, Count, Peak Time, Severity, Airlines Affected

**Data Queries:**
- WHERE apron_area_category IS NOT NULL
- Pivot: GROUP BY branch, apron_area_category
- Safety alerts: WHERE severity IN ('Critical', 'High') GROUP BY branch, apron_area_category

---

### 15. General Category by Branch Detail

**Chart Context:** Cross-analysis of General categories across branches

**Route:** `/dashboard/charts/pivot-report/detail?context=general-branch`

**KPI Cards (3):**
- Total Branch-General Pairs
- Most Frequent Pair
- Resolution Efficiency

**Visualizations:**
1. Pivot Heatmap (Branch rows × General Category columns)
2. Top 10 Pairs Bar Chart
3. Trend Analysis
4. Recurring Pattern Detection

**Data Table Columns:**
- Branch, General Category, Count, Frequency, Avg Resolution Time

---

### 16. Terminal Area by Airlines Detail

**Chart Context:** Which airlines face which terminal issues

**Route:** `/dashboard/charts/pivot-report/detail?context=terminal-airline`

**KPI Cards (3):**
- Total Airline-Terminal Pairs
- Most Affected Airline
- Terminal Service Quality Score

**Visualizations:**
1. Pivot Heatmap (Airline rows × Terminal Category columns)
2. Airline Ranking (by terminal issues)
3. Trend Over Time
4. Branch Distribution (where these pairs occur)

**Data Table Columns:**
- Airline, Terminal Category, Count, Branches, Severity, Status

---

### 17. Apron Area by Airlines Detail

**Chart Context:** Airline-specific apron/operational issues

**Route:** `/dashboard/charts/pivot-report/detail?context=apron-airline`

**KPI Cards (3):**
- Total Airline-Apron Pairs
- Safety-Critical Pairs
- Operational Impact Score

**Visualizations:**
1. Pivot Heatmap (Airline rows × Apron Category columns)
2. Airline Apron Performance Ranking
3. Time-Based Trend (operational hours)
4. Safety Alert Tracker

**Data Table Columns:**
- Airline, Apron Category, Count, Flight Numbers, Severity, Time Pattern

---

### 18. General Category by Airlines Detail

**Chart Context:** Airline-specific general issues

**Route:** `/dashboard/charts/pivot-report/detail?context=general-airline`

**KPI Cards (3):**
- Total Airline-General Pairs
- Most Frequent Pair
- Service Quality Impact

**Visualizations:**
1. Pivot Heatmap (Airline rows × General Category columns)
2. Airline Ranking
3. Trend Analysis
4. Pattern Recognition

**Data Table Columns:**
- Airline, General Category, Count, Frequency, Resolution Rate

---

## Common Components Across All Detail Pages

### Filter Bar
All detail pages will have dynamic filters:
- Date Range (from/to)
- Hub (if applicable)
- Branch (if applicable)
- Airlines (if applicable)
- Area (if applicable)
- Source Sheet (NON CARGO / CGO)
- Severity (Critical/High/Medium/Low)
- Status (Open/In Progress/Closed)

**Filter Behavior:**
- Filters inherited from main dashboard are pre-applied
- Filtered dashboards (hideFilters=true) lock certain filters
- Filters apply to all visualizations and data tables on the page

### Header Section
Standard header for all detail pages:
- Back button (returns to origin dashboard with context)
- Page title (chart name)
- Subtitle/description (chart context)
- Source sheet indicator (NON CARGO / CGO)
- Filtered view indicator (if applicable)

### Data Table Features
All data tables include:
- Pagination (50 rows per page)
- Sortable columns
- Column filtering
- Export to Excel/CSV
- Row selection
- Responsive design

---

## Technical Architecture

### Data Fetching Strategy

**Query Structure:**
```typescript
interface DetailQuery {
  baseFilters: QueryFilter[];     // Date, source_sheet, etc.
  contextFilters: QueryFilter[];  // Chart-specific filters
  dimensions: Dimension[];         // GROUP BY fields
  measures: Measure[];             // Aggregations
  sorts: Sort[];
  limit: number;
}
```

**Example for Branch Report:**
```typescript
const branchRankingQuery = {
  source: 'reports',
  dimensions: [{ table: 'reports', field: 'branch', alias: 'branch' }],
  measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
  filters: [...baseFilters],
  sorts: [{ field: 'count', direction: 'desc' }],
  limit: 10000
};
```

### Component Structure

Each detail page will have:
```
/app/dashboard/charts/[chart-name]/detail/
  ├── page.tsx                    # Main page wrapper (filters, header)
  └── /components/charts/[chart-name]/
      ├── [ChartName]Detail.tsx   # Main detail component
      ├── [ChartName]KPIs.tsx     # KPI cards
      ├── [ChartName]Charts.tsx   # Custom visualizations
      └── data.ts                 # Data fetching logic
```

### Reusable Components

Create shared components:
- `KPICard.tsx` - Reusable KPI card component
- `DetailHeader.tsx` - Standard detail page header
- `FilterBar.tsx` - Dynamic filter bar
- `DataTableWithPagination.tsx` - Enhanced data table (already exists)
- `TrendChart.tsx` - Reusable trend visualization
- `PivotHeatmap.tsx` - Interactive pivot table/heatmap

---

## Implementation Priority

### Phase 1: Core Charts (Week 1)
1. Report by Case Category Detail
2. Branch Report Detail
3. Airlines Report Detail
4. Monthly Report Detail

### Phase 2: Area & Cross-Dimensional (Week 2)
5. Category by Area Detail
6. Case Category by Branch Detail
7. Case Category by Airlines Detail
8. Case Report by Area Detail

### Phase 3: Specialized Categories (Week 3)
9. Terminal Area Category Detail
10. Apron Area Category Detail
11. General Category Detail
12. **HUB Report Detail (NEW PAGE)**

### Phase 4: Pivot Detail Pages (Week 4)
13. Terminal Area by Branch Detail
14. Apron Area by Branch Detail
15. General Category by Branch Detail
16. Terminal Area by Airlines Detail
17. Apron Area by Airlines Detail
18. General Category by Airlines Detail

---

## Success Metrics

1. **Completeness:** All 18 detail page types implemented
2. **Performance:** Page load < 2 seconds with cached data
3. **Usability:** Users can drill down from any main chart to detailed analysis
4. **Consistency:** All pages follow the same header/filter/layout pattern
5. **Flexibility:** Filters work correctly across all dimensions

---

## Next Steps

1. ✅ Design approved
2. ⏭️ Create implementation plan
3. ⏭️ Build Phase 1 components
4. ⏭️ Test with real data
5. ⏭️ Deploy and iterate

---

## Notes

- Each detail page is optimized for its specific analytical purpose
- All pages respect source_sheet context (NON CARGO vs CGO)
- Filter inheritance from main dashboard ensures consistent user experience
- Data tables provide comprehensive raw data access for power users
- KPIs provide at-a-glance insights for quick decision making
