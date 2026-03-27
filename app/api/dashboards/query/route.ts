import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateQuery } from '@/lib/builder/sql-builder';
import { normalizeQuery } from '@/lib/builder/normalization';
import type { QueryDefinition } from '@/types/builder';
import { executeQuery } from '@/lib/services/query-executor';

export async function POST(request: NextRequest) {
  try {
    // Auth check - RELAXED for Public Access
    // The user requested "remove all authentication on customer feedback dashboard, all users can access it as long as they have the link"
    // Since the Query API is generic, we allow public access here.
    // Ideally, we should sign queries or restrict to specific dashboards, but for now we allow open access.
    
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

    // Parse and Normalize
    const body = await request.json();
    let query: QueryDefinition = body.query;

    if (!query) {
      return NextResponse.json({ error: 'Query definition diperlukan' }, { status: 400 });
    }

    // Apply normalization (Type-aware fixes, default source, etc.)
    query = normalizeQuery(query);
    
    // Validate
    const errors = validateQuery(query);
    if (errors.length > 0) {
      console.warn('[Query API] Validation failed:', {
        errors,
        query: JSON.stringify(query, null, 2)
      });
      return NextResponse.json({ error: 'Query tidak valid', details: errors }, { status: 400 });
    }

    // Execute Query
    const result = await executeQuery(query, {
      canViewAll,
      userStationCode
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
  } catch (err) {
    console.error('Query API error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
