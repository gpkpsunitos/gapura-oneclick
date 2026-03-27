// lib/utils/entity-analytics.ts

import { EntityStats, AirlineStats, RouteStats, HubStats, FlightStats, FilterState } from '@/types/entity-analytics';

/**
 * Extract dan aggregate entities dari batch analysis results
 */
export function processEntityData(results: any[]): EntityStats {
  const airlines = new Map<string, AirlineStats>();
  const routes = new Map<string, RouteStats>();
  const hubs = new Map<string, HubStats>();
  const flightNumbers = new Map<string, FlightStats>();

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalPredictionDays = 0;

  results.forEach(result => {
    const airline = result.originalData?.airline || 'Unknown Airline';
    const route = result.originalData?.route || 'Unknown Route';
    const hub = result.originalData?.hub || 'Unknown Hub';
    const flightNumber = result.originalData?.flightNumber || 'N/A';
    const severity = result.classification?.severity || 'Low';
    const predictedDays = result.prediction?.predictedDays || 0;

    // Count severities
    if (severity === 'Critical') criticalCount++;
    else if (severity === 'High') highCount++;
    else if (severity === 'Medium') mediumCount++;
    else lowCount++;

    totalPredictionDays += predictedDays;

    // Process airlines
    if (!airlines.has(airline)) {
      airlines.set(airline, {
        name: airline,
        count: 0,
        severityBreakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        topRoutes: [],
        avgPredictionDays: 0,
        lastIncident: null,
        reports: []
      });
    }
    const airlineStats = airlines.get(airline)!;
    airlineStats.count++;
    airlineStats.severityBreakdown[severity] = (airlineStats.severityBreakdown[severity] || 0) + 1;
    airlineStats.reports.push(result);
    if (!airlineStats.topRoutes.includes(route)) {
      airlineStats.topRoutes.push(route);
    }
    const incidentDate = result.originalData?.date ? new Date(result.originalData.date) : null;
    if (incidentDate && (!airlineStats.lastIncident || incidentDate > airlineStats.lastIncident)) {
      airlineStats.lastIncident = incidentDate;
    }

    // Process routes
    if (!routes.has(route)) {
      const [from, to] = route.split('-');
      routes.set(route, {
        route,
        from: from || route,
        to: to || route,
        count: 0,
        criticalRate: 0,
        severityBreakdown: {
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0
        },
        primaryIssueType: '',
        lastIncident: null,
        reports: []
      });
    }
    const routeStats = routes.get(route)!;
    routeStats.count++;
    routeStats.severityBreakdown[severity] = (routeStats.severityBreakdown[severity] || 0) + 1;
    routeStats.reports.push(result);
    const routeDate = result.originalData?.date ? new Date(result.originalData.date) : null;
    if (routeDate && (!routeStats.lastIncident || routeDate > routeStats.lastIncident)) {
      routeStats.lastIncident = routeDate;
    }
    const issueType = result.originalData?.issueType || result.classification?.issueType || '';
    if (issueType && !routeStats.primaryIssueType) {
      routeStats.primaryIssueType = issueType;
    }

    // Process hubs
    if (!hubs.has(hub)) {
      hubs.set(hub, {
        name: hub,
        count: 0,
        percentage: 0,
        severityBreakdown: {},
        topIssueCategory: '',
        topAirlines: [],
        reports: []
      });
    }
    const hubStats = hubs.get(hub)!;
    hubStats.count++;
    hubStats.severityBreakdown[severity] = (hubStats.severityBreakdown[severity] || 0) + 1;
    hubStats.reports.push(result);
    if (!hubStats.topAirlines.includes(airline)) {
      hubStats.topAirlines.push(airline);
    }
    const category = result.originalData?.category || '';
    if (category && !hubStats.topIssueCategory) {
      hubStats.topIssueCategory = category;
    }

    // Process flight numbers
    if (flightNumber !== 'N/A') {
      if (!flightNumbers.has(flightNumber)) {
        flightNumbers.set(flightNumber, {
          flightNumber,
          airline,
          count: 0,
          avgPredictionDays: 0,
          reports: []
        });
      }
      const flightStats = flightNumbers.get(flightNumber)!;
      flightStats.count++;
      flightStats.reports.push(result);
    }
  });

  // Calculate averages and percentages
  const totalReports = results.length;

  airlines.forEach(stats => {
    stats.avgPredictionDays = stats.reports.reduce((sum, r) => sum + (r.prediction?.predictedDays || 0), 0) / stats.reports.length;
  });

  routes.forEach(stats => {
    const criticalAndHigh = (stats.severityBreakdown?.Critical || 0) + (stats.severityBreakdown?.High || 0);
    stats.criticalRate = stats.count > 0 ? (criticalAndHigh / stats.count) * 100 : 0;
  });

  hubs.forEach(stats => {
    stats.percentage = totalReports > 0 ? (stats.count / totalReports) * 100 : 0;
  });

  flightNumbers.forEach(stats => {
    stats.avgPredictionDays = stats.reports.reduce((sum, r) => sum + (r.prediction?.predictedDays || 0), 0) / stats.reports.length;
  });

  return {
    airlines,
    routes,
    hubs,
    flightNumbers,
    allReports: results,
    summary: {
      totalEntities: airlines.size + routes.size + hubs.size + flightNumbers.size,
      totalReports,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      avgPredictionDays: totalReports > 0 ? totalPredictionDays / totalReports : 0
    }
  };
}

/**
 * Filter entities berdasarkan kombinasi kriteria
 */
export function filterEntities(
  entityStats: EntityStats,
  filters: FilterState
): EntityStats {
  let filteredReports = [...entityStats.allReports];

  // Apply airline filter
  if (filters.airlines.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.airlines.includes(r.originalData?.airline || 'Unknown Airline')
    );
  }

  // Apply route filter
  if (filters.routes.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.routes.includes(r.originalData?.route || 'Unknown Route')
    );
  }

  // Apply hub filter
  if (filters.hubs.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.hubs.includes(r.originalData?.hub || 'Unknown Hub')
    );
  }

  // Apply severity filter
  if (filters.severities.length > 0) {
    filteredReports = filteredReports.filter(r =>
      filters.severities.includes(r.classification?.severity || 'Low')
    );
  }

  // Apply date range filter
  if (filters.dateRange) {
    filteredReports = filteredReports.filter(r => {
      const reportDate = r.originalData?.date ? new Date(r.originalData.date) : null;
      if (!reportDate) return false;
      return reportDate >= filters.dateRange!.start && reportDate <= filters.dateRange!.end;
    });
  }

  // Re-process filtered data
  return processEntityData(filteredReports);
}

/**
 * Get top N entities dari Map
 */
export function getTopEntities<T extends { count: number }>(
  entityMap: Map<string, T>,
  limit: number = 10
): T[] {
  return Array.from(entityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Translate severity ke Bahasa Indonesia
 */
export function translateSeverity(severity: string): string {
  const map: Record<string, string> = {
    'Critical': 'Kritis',
    'High': 'Tinggi',
    'Medium': 'Sedang',
    'Low': 'Rendah',
    'critical': 'Kritis',
    'high': 'Tinggi',
    'medium': 'Sedang',
    'low': 'Rendah'
  };
  return map[severity] || severity;
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
  };
  return map[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
}
