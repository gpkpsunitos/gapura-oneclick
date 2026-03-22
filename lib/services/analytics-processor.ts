import 'server-only';
import { Report } from '@/types';

/**
 * AnalyticsProcessor
 * 
 * Provides server-side aggregation for Intelligence dashboards to minimize client-side processing
 * and reduce network payload size by several orders of magnitude.
 */
export class AnalyticsProcessor {
  
  private static normalizeCategory(category: string | undefined): string | null {
    if (!category) return null;
    const normalized = category.toLowerCase();
    if (normalized.includes('irregular')) return 'Irregularity';
    if (normalized.includes('complain')) return 'Complaint';
    if (normalized.includes('compliment')) return 'Compliment';
    return null;
  }

  private static getMonthKey(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      let date: Date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, day] = dateStr.split('-').map(Number);
          date = new Date(y, m - 1, day);
      } else {
          date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  }

  private static isValidRootCause(value: string | undefined | null): boolean {
    const INVALID_CAUSE_VALUES = ['#n/a', 'unknown', 'nil', '-', '', 'null', 'none', 'na', 'n/a', 'tidak ada', 'belum diketahui'];
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    return !INVALID_CAUSE_VALUES.includes(normalized);
  }

  private static getBranch(report: Report): string {
    return report.branch || report.reporting_branch || report.station_code || 'Unknown';
    // Complexity: Time O(1) | Space O(1)
  }

  private static getHub(report: Report): string {
    return report.hub || 'Unknown';
    // Complexity: Time O(1) | Space O(1)
  }

  private static getAirline(report: Report): string {
    return report.airlines || report.airline || 'Unknown';
    // Complexity: Time O(1) | Space O(1)
  }

  /**
   * Aggregates data for the Report By Case Category dashboard
   * Complexity: Time O(N) | Space O(K) where N is reports count, K is unique categories/months
   */
  public static processCaseCategory(reports: Report[]) {
    const categoryMap = new Map<string, { count: number }>();
    const monthMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();
    const branchMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();
    const airlineMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number; total: number }>();
    const causeMap = new Map<string, { category: string; count: number }>();

    reports.forEach(report => {
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (!category) return;

      // Category Breakdown
      if (!categoryMap.has(category)) categoryMap.set(category, { count: 0 });
      categoryMap.get(category)!.count++;

      // Monthly Trend
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (monthKey) {
        if (!monthMap.has(monthKey)) monthMap.set(monthKey, { Irregularity: 0, Complaint: 0, Compliment: 0 });
        const mData = monthMap.get(monthKey)!;
        if (category === 'Irregularity') mData.Irregularity++;
        else if (category === 'Complaint') mData.Complaint++;
        else if (category === 'Compliment') mData.Compliment++;
      }

      // Branch Distribution
      const branch = this.getBranch(report);
      if (branch !== 'Unknown') {
        if (!branchMap.has(branch)) branchMap.set(branch, { Irregularity: 0, Complaint: 0, Compliment: 0 });
        const bData = branchMap.get(branch)!;
        if (category === 'Irregularity') bData.Irregularity++;
        else if (category === 'Complaint') bData.Complaint++;
        else if (category === 'Compliment') bData.Compliment++;
      }

      // Airline Distribution
      const airline = this.getAirline(report);
      if (airline !== 'Unknown') {
        if (!airlineMap.has(airline)) airlineMap.set(airline, { Irregularity: 0, Complaint: 0, Compliment: 0, total: 0 });
        const aData = airlineMap.get(airline)!;
        aData.total++;
        if (category === 'Irregularity') aData.Irregularity++;
        else if (category === 'Complaint') aData.Complaint++;
        else if (category === 'Compliment') aData.Compliment++;
      }

      // Root Causes
      const rootCause = report.root_caused;
      if (this.isValidRootCause(rootCause)) {
        const rcKey = `${rootCause}-${category}`;
        if (!causeMap.has(rcKey)) causeMap.set(rcKey, { category, count: 0 });
        causeMap.get(rcKey)!.count++;
      }
    });

    const totalCount = reports.length;

    // Format Outputs
    const categoryData = Array.from(categoryMap.entries()).map(([name, d]) => ({
      name,
      count: d.count,
      percentage: totalCount > 0 ? (d.count / totalCount) * 100 : 0,
      growth: 0 // Simplification: handle growth if needed in next version
    })).sort((a, b) => b.count - a.count);

    const trendData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([month, data]) => ({ month, ...data }));

    const branchData = Array.from(branchMap.entries())
      .map(([branch, data]) => ({ branch, ...data }))
      .sort((a, b) => b.Irregularity - a.Irregularity)
      .slice(0, 15);

    const airlineData = Array.from(airlineMap.entries())
      .map(([airline, data]) => ({ airline, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    const kpis = {
      totalReports: totalCount,
      mostAffectedBranch: branchData.length > 0 ? { name: branchData[0].branch, count: branchData[0].Irregularity + branchData[0].Complaint } : { name: '-', count: 0 },
      topAirline: airlineData.length > 0 ? { name: airlineData[0].airline, count: airlineData[0].total } : { name: '-', count: 0 },
      avgResolutionTime: 0
    };

    return {
      categoryData,
      trendData,
      branchData,
      airlineData,
      kpis
    };
  }

  /**
   * Aggregates data for the Monthly Report dashboard
   * Complexity: Time O(N) | Space O(M) where N is reports, M is unique months
   */
  public static processMonthlyReport(reports: Report[]) {
    const monthMap = new Map<string, { 
      total: number; 
      irregularity: number; 
      complaint: number; 
      compliment: number;
      prevMonthTotal?: number;
      prevYearTotal?: number;
    }>();
    
    reports.forEach(report => {
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (!monthKey) return;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
      }
      
      const data = monthMap.get(monthKey)!;
      data.total++;
      
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.irregularity++;
      else if (category === 'Complaint') data.complaint++;
      else if (category === 'Compliment') data.compliment++;
    });

    const sortedMonths = Array.from(monthMap.keys()).sort();
    
    // Calculate MoM and YoY for each month
    const summary = sortedMonths.map((month) => {
      const data = monthMap.get(month)!;
      
      const [year, monthNum] = month.split('-').map(Number);
      const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
      const prevYearNum = monthNum === 1 ? year - 1 : year;
      const prevMonthKey = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}`;
      const prevYearKey = `${year - 1}-${String(monthNum).padStart(2, '0')}`;
      
      const prevMonthData = monthMap.get(prevMonthKey);
      const prevYearData = monthMap.get(prevYearKey);
      
      const prevMonthTotal = prevMonthData?.total || 0;
      const prevYearTotal = prevYearData?.total || 0;
      
      return {
        month,
        total: data.total,
        irregularity: data.irregularity,
        complaint: data.complaint,
        compliment: data.compliment,
        irregularityRate: data.total > 0 ? (data.irregularity / data.total) * 100 : 0,
        netSentiment: (data.compliment + data.complaint) > 0 ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0,
        momGrowth: prevMonthTotal > 0 ? ((data.total - prevMonthTotal) / prevMonthTotal) * 100 : 0,
        yoyGrowth: prevYearTotal > 0 ? ((data.total - prevYearTotal) / prevYearTotal) * 100 : undefined,
        prevMonthTotal,
        prevYearTotal
      };
    });

    const current = summary[summary.length - 1];
    const previous = summary.length > 1 ? summary[summary.length - 2] : null;

    const kpis = {
      currentMonthTotal: current?.total || 0,
      previousMonthTotal: previous?.total || 0,
      momChange: previous && previous.total > 0 ? Math.round(((current.total - previous.total) / previous.total) * 100) : 0,
      highestPeakMonth: summary.reduce((max, m) => (m.total > max.count ? { month: m.month, count: m.total } : max), { month: '-', count: 0 })
    };

    // Rolling Average (3m, 6m)
    const rollingData = summary.map((m, idx) => {
      const prev3 = summary.slice(Math.max(0, idx - 2), idx + 1).map(v => v.total);
      const prev6 = summary.slice(Math.max(0, idx - 5), idx + 1).map(v => v.total);
      return {
        month: m.month,
        actual: m.total,
        rollingAvg3: prev3.reduce((s, v) => s + v, 0) / prev3.length,
        rollingAvg6: prev6.reduce((s, v) => s + v, 0) / prev6.length,
      };
    }).slice(-14);

    // Daily Trend (last 60 days)
    const dateMap = new Map<string, { total: number; Irregularity: number; Complaint: number }>();
    reports.forEach(report => {
      const d = new Date(report.date_of_event || report.created_at || '');
      if (isNaN(d.getTime())) return;
      const dateKeyFull = d.toISOString().split('T')[0];
      
      if (!dateMap.has(dateKeyFull)) dateMap.set(dateKeyFull, { total: 0, Irregularity: 0, Complaint: 0 });
      const data = dateMap.get(dateKeyFull)!;
      data.total++;
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.Irregularity++;
      else if (category === 'Complaint') data.Complaint++;
    });

    const dailyData = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-60)
      .map(([date, data]) => ({ date, ...data }));

    // Peak Day
    let peakCount = 0;
    let peakDate = '-';
    dateMap.forEach((data, date) => {
      if (data.total > peakCount) {
        peakCount = data.total;
        peakDate = date;
      }
    });
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = { 
      date: peakDate, 
      count: peakCount, 
      dayOfWeek: peakDate !== '-' ? days[new Date(peakDate).getDay()] : '-' 
    };

    // Dominant Branch & Airline
    const branchCounters = new Map<string, number>();
    const airlineCounters = new Map<string, number>();
    reports.forEach(r => {
      const b = this.getBranch(r);
      const a = this.getAirline(r);
      if (b !== 'Unknown') branchCounters.set(b, (branchCounters.get(b) || 0) + 1);
      if (a !== 'Unknown') airlineCounters.set(a, (airlineCounters.get(a) || 0) + 1);
    });

    const getDominant = (map: Map<string, number>, total: number) => {
      let topName = '-';
      let topCount = 0;
      map.forEach((c, n) => { if (c > topCount) { topCount = c; topName = n; } });
      return { name: topName, count: topCount, percent: total > 0 ? (topCount / total) * 100 : 0 };
    };

    return {
      summary,
      kpis,
      rollingData,
      dailyData,
      peakDay,
      dominantBranch: getDominant(branchCounters, reports.length),
      dominantAirline: getDominant(airlineCounters, reports.length),
      trend: summary.slice(-12)
    };
  }

  /**
   * Aggregates data for the Area Intelligence dashboard
   * Complexity: Time O(N) | Space O(A) where A is unique areas
   */
  public static processAreaReport(reports: Report[]) {
    const areaMap = new Map<string, { 
      total: number; 
      irregularity: number; 
      complaint: number; 
      compliment: number;
    }>();
    
    reports.forEach(report => {
      const area = report.area || 'Unknown';
      if (!areaMap.has(area)) areaMap.set(area, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
      const data = areaMap.get(area)!;
      data.total++;
      
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.irregularity++;
      else if (category === 'Complaint') data.complaint++;
      else if (category === 'Compliment') data.compliment++;
    });

    const totalCount = reports.length;
    const sortedAreas = Array.from(areaMap.entries())
      .map(([area, data]) => {
        const irregularityRate = data.total > 0 ? (data.irregularity / data.total) * 100 : 0;
        const netSentiment = (data.compliment + data.complaint) > 0 
          ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0;
        const riskIndex = (irregularityRate * 0.7) + (data.total > 0 ? (data.complaint / data.total * 30) : 0);
        
        return {
          area,
          ...data,
          rank: 0,
          contribution: totalCount > 0 ? (data.total / totalCount) * 100 : 0,
          irregularityRate,
          netSentiment,
          riskIndex
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Trend by month
    const monthMap = new Map<string, { total: number; Irregularity: number; Complaint: number }>();
    reports.forEach(report => {
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (!monthKey) return;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { total: 0, Irregularity: 0, Complaint: 0 });
      const data = monthMap.get(monthKey)!;
      data.total++;
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.Irregularity++;
      else if (category === 'Complaint') data.Complaint++;
    });

    const trendData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([month, data]) => ({ month, ...data }));

    return {
      areaData: sortedAreas,
      trendData,
      categoryData: sortedAreas.slice(0, 10).map(a => ({
        area: a.area,
        Irregularity: a.irregularity,
        Complaint: a.complaint,
        Compliment: a.compliment
      })),
      kpis: {
        totalReports: totalCount,
        areasTracked: areaMap.size,
        overallIrregRate: totalCount > 0 ? (reports.filter(r => this.normalizeCategory(r.main_category) === 'Irregularity').length / totalCount) * 100 : 0
      }
    };
  }

  /**
   * Aggregates data for the Airline Intelligence dashboard
   * Complexity: Time O(N) | Space O(L) where L is unique airlines
   */
  public static processAirlineReport(reports: Report[]) {
    const airlineMap = new Map<string, { 
      total: number; 
      irregularity: number; 
      complaint: number; 
      compliment: number;
    }>();
    
    reports.forEach(report => {
      const airline = this.getAirline(report);
      if (airline === 'Unknown') return;
      
      if (!airlineMap.has(airline)) airlineMap.set(airline, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
      const data = airlineMap.get(airline)!;
      data.total++;
      
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.irregularity++;
      else if (category === 'Complaint') data.complaint++;
      else if (category === 'Compliment') data.compliment++;
    });

    const totalCount = reports.length;
    const airlineSummaries = Array.from(airlineMap.entries())
      .map(([airline, data]) => {
        const total = data.total;
        return {
          airline,
          total,
          irregularity: data.irregularity,
          complaint: data.complaint,
          compliment: data.compliment,
          irregularityRate: total > 0 ? (data.irregularity / total) * 100 : 0,
          netSentiment: (data.compliment + data.complaint) > 0 ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0,
          riskIndex: (data.irregularity * 2) + data.complaint,
          rank: 0,
          contribution: totalCount > 0 ? (total / totalCount) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Monthly Trend
    const monthMap = new Map<string, { total: number; Irregularity: number; Complaint: number; Compliment: number }>();
    reports.forEach(report => {
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (!monthKey) return;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { total: 0, Irregularity: 0, Complaint: 0, Compliment: 0 });
      const data = monthMap.get(monthKey)!;
      data.total++;
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.Irregularity++;
      else if (category === 'Complaint') data.Complaint++;
      else if (category === 'Compliment') data.Compliment++;
    });

    const trendData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([month, data]) => ({ month, ...data }));

    return {
      airlineData: airlineSummaries,
      trendData,
      categoryData: airlineSummaries.slice(0, 10).map(a => ({
        airline: a.airline,
        Irregularity: a.irregularity,
        Complaint: a.complaint,
        Compliment: a.compliment
      })),
      categoryBreakdown: airlineSummaries.slice(0, 10).map(a => ({
        airline: a.airline,
        irregularity: a.irregularity,
        complaint: a.complaint,
        compliment: a.compliment
      })),
      kpis: {
        totalAirlines: airlineMap.size,
        topAirline: airlineSummaries.length > 0 ? { name: airlineSummaries[0].airline, count: airlineSummaries[0].total } : { name: '-', count: 0 },
        bestPerformer: airlineSummaries.length > 0 ? { name: airlineSummaries[airlineSummaries.length - 1].airline, count: airlineSummaries[airlineSummaries.length - 1].total } : { name: '-', count: 0 },
        avgReportsPerAirline: airlineMap.size > 0 ? Math.round(totalCount / airlineMap.size) : 0,
        complimentRatio: totalCount > 0 ? Math.round((Array.from(airlineMap.values()).reduce((sum, a) => sum + a.compliment, 0) / totalCount) * 100) : 0
      }
    };
  }

  /**
   * Aggregates data for the Hub Intelligence dashboard
   * Complexity: Time O(N) | Space O(H) where H is unique hubs
   */
  public static processHubReport(reports: Report[]) {
    const hubMap = new Map<string, { 
      total: number; 
      irregularity: number; 
      complaint: number; 
      compliment: number;
    }>();

    reports.forEach(report => {
      const hub = this.getHub(report);
      if (hub === 'Unknown') return;
      
      if (!hubMap.has(hub)) hubMap.set(hub, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
      const data = hubMap.get(hub)!;
      data.total++;
      
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.irregularity++;
      else if (category === 'Complaint') data.complaint++;
      else if (category === 'Compliment') data.compliment++;
    });

    const totalCount = reports.length;
    const hubSummaries = Array.from(hubMap.entries())
      .map(([hub, data]) => {
        const total = data.total;
        return {
          hub,
          total,
          irregularity: data.irregularity,
          complaint: data.complaint,
          compliment: data.compliment,
          irregularityRate: total > 0 ? (data.irregularity / total) * 100 : 0,
          netSentiment: (data.compliment + data.complaint) > 0 ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0,
          riskIndex: (data.irregularity * 2) + data.complaint,
          rank: 0,
          contribution: totalCount > 0 ? (total / totalCount) * 100 : 0,
          growth: 0
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Monthly Trend
    const monthMap = new Map<string, { total: number; Irregularity: number; Complaint: number }>();
    reports.forEach(report => {
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (!monthKey) return;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { total: 0, Irregularity: 0, Complaint: 0 });
      const data = monthMap.get(monthKey)!;
      data.total++;
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.Irregularity++;
      else if (category === 'Complaint') data.Complaint++;
    });

    const trendData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([month, data]) => ({ month, ...data }));

    // KPIs
    const totalHubs = hubMap.size;
    const sortedByCount = [...hubSummaries].sort((a, b) => a.total - b.total);
    const topPerformer = sortedByCount[0] || { hub: '-', total: 0 };
    const worstPerformer = sortedByCount[sortedByCount.length - 1] || { hub: '-', total: 0 };
    
    // Calculate MoM Change
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    let currentMonthCount = 0;
    let lastMonthCount = 0;
    
    reports.forEach(r => {
      const mk = this.getMonthKey(r.date_of_event || r.created_at);
      if (mk === currentMonthKey) currentMonthCount++;
      if (mk === lastMonthKey) lastMonthCount++;
    });
    
    const momChange = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

    return {
      hubData: hubSummaries,
      trendData,
      categoryDistribution: hubSummaries.slice(0, 10).map(b => ({
        hub: b.hub,
        irregularity: b.irregularity,
        complaint: b.complaint,
        compliment: b.compliment
      })),
      kpis: {
        totalHubs,
        topPerformer: { name: topPerformer.hub, count: topPerformer.total },
        worstPerformer: { name: worstPerformer.hub, count: worstPerformer.total },
        avgReportsPerHub: totalHubs > 0 ? Math.round(totalCount / totalHubs) : 0,
        momChange: Math.round(momChange * 10) / 10
      }
    };
  }

  /**
   * Aggregates data for the Branch Intelligence dashboard
   * Complexity: Time O(N) | Space O(B) where B is unique branches
   */
  public static processBranchReport(reports: Report[]) {
    const branchMap = new Map<string, { 
      total: number; 
      irregularity: number; 
      complaint: number; 
      compliment: number;
    }>();

    reports.forEach(report => {
      const branch = this.getBranch(report);
      if (branch === 'Unknown') return;
      
      if (!branchMap.has(branch)) branchMap.set(branch, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
      const data = branchMap.get(branch)!;
      data.total++;
      
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.irregularity++;
      else if (category === 'Complaint') data.complaint++;
      else if (category === 'Compliment') data.compliment++;
    });

    const totalCount = reports.length;
    const branchSummaries = Array.from(branchMap.entries())
      .map(([branch, data]) => {
        const total = data.total;
        return {
          branch,
          total,
          irregularity: data.irregularity,
          complaint: data.complaint,
          compliment: data.compliment,
          irregularityRate: total > 0 ? (data.irregularity / total) * 100 : 0,
          netSentiment: (data.compliment + data.complaint) > 0 ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0,
          riskIndex: (data.irregularity * 2) + data.complaint,
          rank: 0,
          contribution: totalCount > 0 ? (total / totalCount) * 100 : 0,
          growth: 0
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Monthly Trend
    const monthMap = new Map<string, { total: number; Irregularity: number; Complaint: number }>();
    reports.forEach(report => {
      const monthKey = this.getMonthKey(report.date_of_event || report.created_at);
      if (!monthKey) return;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { total: 0, Irregularity: 0, Complaint: 0 });
      const data = monthMap.get(monthKey)!;
      data.total++;
      const category = this.normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      if (category === 'Irregularity') data.Irregularity++;
      else if (category === 'Complaint') data.Complaint++;
    });

    const trendData = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([month, data]) => ({ month, ...data }));

    // KPIs
    const totalBranches = branchMap.size;
    const sortedByCount = [...branchSummaries].sort((a, b) => a.total - b.total);
    const topPerformer = sortedByCount[0] || { branch: '-', total: 0 };
    const worstPerformer = sortedByCount[sortedByCount.length - 1] || { branch: '-', total: 0 };
    
    // Calculate MoM Change
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    let currentMonthCount = 0;
    let lastMonthCount = 0;
    
    reports.forEach(r => {
      const mk = this.getMonthKey(r.date_of_event || r.created_at);
      if (mk === currentMonthKey) currentMonthCount++;
      if (mk === lastMonthKey) lastMonthCount++;
    });
    
    const momChange = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

    return {
      branchData: branchSummaries,
      trendData,
      categoryDistribution: branchSummaries.slice(0, 10).map(b => ({
        branch: b.branch,
        irregularity: b.irregularity,
        complaint: b.complaint,
        compliment: b.compliment
      })),
      kpis: {
        totalBranches,
        topPerformer: { name: topPerformer.branch, count: topPerformer.total },
        worstPerformer: { name: worstPerformer.branch, count: worstPerformer.total },
        avgReportsPerBranch: totalBranches > 0 ? Math.round(totalCount / totalBranches) : 0,
        momChange: Math.round(momChange * 10) / 10
      }
    };
  }
}
