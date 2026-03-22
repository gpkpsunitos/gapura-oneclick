import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

const ALLOWED_FIELDS: Record<string, { key: string }> = {
  hub: { key: 'hub' },
  branch: { key: 'branch' },
  airline: { key: 'airline' }, // Maps to 'airlines' in schema but 'airline' in some contexts, let's check
  airlines: { key: 'airlines' },
  main_category: { key: 'category' }, // Maps to 'category' in schema
  category: { key: 'category' },
  area: { key: 'area' },
  target_division: { key: 'target_division' },
  severity: { key: 'severity' },
  status: { key: 'status' },
  station_code: { key: 'station_code' },
  reporting_branch: { key: 'reporting_branch' },
  airline_type: { key: 'jenis_maskapai' }, // Maps to 'jenis_maskapai'
  jenis_maskapai: { key: 'jenis_maskapai' }
};

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fieldsParam = searchParams.get('fields');

    const requestedFields = fieldsParam
      ? fieldsParam.split(',').filter(f => ALLOWED_FIELDS[f] || ALLOWED_FIELDS[f.trim()])
      : Object.keys(ALLOWED_FIELDS);

    // Fetch all reports from Google Sheets (cached)
    const reports = await reportsService.getReports();

    const results: Record<string, string[]> = {};

    requestedFields.forEach(field => {
      const config = ALLOWED_FIELDS[field] || ALLOWED_FIELDS[field.trim()];
      if (!config) return;

      const key = config.key;
      
      // Extract unique values
      const values = new Set<string>();
      
      reports.forEach(r => {
        // @ts-ignore
        const val = r[key];
        if (val && typeof val === 'string' && val.trim() !== '') {
          values.add(val.trim());
        }
      });

      results[field] = Array.from(values).sort();
    });

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('Filter options error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
