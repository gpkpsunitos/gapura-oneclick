import "server-only";
import { reportsService } from '@/lib/services/reports-service';
import type { QueryDefinition } from '@/types/builder';
import type { Report } from '@/types';
import { processQuery } from '@/lib/engine/query-processor';

interface QueryContext {
  canViewAll: boolean;
  userStationCode: string | null;
  preloadedReports?: Report[];
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export async function executeQuery(query: QueryDefinition, context: QueryContext): Promise<QueryResult> {
  const source = (query.source || 'reports').toLowerCase();
  const startTime = Date.now();

  if (source === 'reports') {
    // 1. Fetch all data from Sheets (use preloaded if available)
    const reports = context.preloadedReports || await reportsService.getReports();
    
    // 1.5 Apply Security Filter (RBAC)
    let accessibleReports = reports;
    if (!context.canViewAll) {
      if (context.userStationCode) {
        accessibleReports = reports.filter(r => r.branch === context.userStationCode);
      } else {
        accessibleReports = [];
      }
    }
    
    // Delegate to pure query processor
    const result = processQuery(query, accessibleReports);
    
    return {
      ...result,
      executionTimeMs: Date.now() - startTime
    };
  }

  throw new Error(`Source '${source}' is not supported with Google Sheets backend.`);
}
