import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateQuery } from '@/lib/builder/sql-builder';
import { normalizeQuery } from '@/lib/builder/normalization';
import type { QueryDefinition } from '@/types/builder';
import { executeQuery } from '@/lib/services/query-executor';
import { reportsService } from '@/lib/services/reports-service';

const MAX_BATCH_SIZE = 30;

export async function POST(request: NextRequest) {
  try {
    // Auth check - RELAXED for Public Access
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    let canViewAll = true; // Default to true to allow public access to all data
    let userStationCode: string | null = null;

    // Optional: Parse session if present just for context, but don't block
    if (session) {
        const payload = await verifySession(session);
        if (payload) {
             // We could extract user info here if needed for audit, 
             // but we maintain canViewAll = true for everyone.
        }
    }

    const body = await request.json();
    const queries: { id: string; query: QueryDefinition }[] = body.queries;

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'queries array diperlukan' }, { status: 400 });
    }

    if (queries.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Maksimal ${MAX_BATCH_SIZE} queries per batch` }, { status: 400 });
    }

    // Normalize all queries first
    const normalizedQueries = queries.map(q => ({
      ...q,
      query: normalizeQuery(q.query)
    }));

    // Validate all normalized queries
    for (const q of normalizedQueries) {
      const errors = validateQuery(q.query);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: `Query "${q.id}" tidak valid`, details: errors },
          { status: 400 }
        );
      }
    }

    // Optimization: Fetch reports ONCE if any query needs them
    const needsReports = normalizedQueries.some(q => (q.query.source || 'reports').toLowerCase() === 'reports');
    const preloadedReports = needsReports ? await reportsService.getReports() : undefined;

    // Execute all queries in parallel
    const startTime = Date.now();
    
    const results = await Promise.all(
      normalizedQueries.map(async (q) => {
        try {
          const result = await executeQuery(q.query, {
            canViewAll,
            userStationCode,
            preloadedReports
          });
          return { id: q.id, ...result };
        } catch (err) {
          return { 
            id: q.id, 
            error: err instanceof Error ? err.message : 'Unknown error', 
            columns: [], 
            rows: [], 
            rowCount: 0,
            executionTimeMs: 0
          };
        }
      })
    );

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({ results, executionTimeMs }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('Batch Query API error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
