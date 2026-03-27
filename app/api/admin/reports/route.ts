import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { validateStatusTransition, getTimestampFieldForStatus, getUserFieldForStatus } from '@/lib/utils/validate-transition';
import { reportsService } from '@/lib/services/reports-service';

// Ensure Turbopack doesn't expect static manifests for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

// Reference data cache — stations/users change infrequently
// Complexity: Time O(1) per lookup | Space O(stations + users)
interface RefCache<T> { data: T; ts: number }
const REF_CACHE_TTL = 1000 * 60 * 10; // 10 minutes
let stationsCache: RefCache<Array<{ id: string; code: string; name: string }>> | null = null;
let usersCache: RefCache<Array<{ id: string; full_name: string; email: string }>> | null = null;

async function getCachedStations() {
  if (stationsCache && Date.now() - stationsCache.ts < REF_CACHE_TTL) {
    return stationsCache.data;
  }
  const { data } = await supabase.from('stations').select('id, code, name');
  const result = data ?? [];
  stationsCache = { data: result, ts: Date.now() };
  return result;
}

async function getCachedUsers() {
  if (usersCache && Date.now() - usersCache.ts < REF_CACHE_TTL) {
    return usersCache.data;
  }
  const { data } = await supabase.from('users').select('id, full_name, email');
  const result = data ?? [];
  usersCache = { data: result, ts: Date.now() };
  return result;
}



// GET all reports (from Google Sheets via shared service)
export async function GET(request: Request) {
    const startTime = Date.now();
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifySession(token) : null;

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const station = searchParams.get('station');
        const search = searchParams.get('search');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        let targetDivision = searchParams.get('target_division');
        const sourceParam = searchParams.get('source'); // 'sheets' | 'sync' | null

        // Fetch using the shared service with optional source control
        const allReports = await reportsService.getReports({ source: (sourceParam === 'sheets' || sourceParam === 'sync') ? (sourceParam as any) : 'auto' }); 
        let filteredData = allReports;

        // Filter: Status
        if (status && status !== 'all') {
            filteredData = filteredData.filter(r => r.status === status);
        }

        // Filter: Station (Branch)
        if (station && station !== 'all') {
            // Note: matching strict code
            filteredData = filteredData.filter(r => r.station_id === station || r.branch === station);
        }

        // Normalize role for consistent checking
        const role = payload.role ? String(payload.role).trim().toUpperCase() : '';

        // Filter: Target Division (query param only — no role-based override)
        if (targetDivision && targetDivision !== 'all') {
            filteredData = filteredData.filter(r => r.target_division === targetDivision);
        }

        // Filter: Search
        if (search) {
            const q = search.toLowerCase();
            filteredData = filteredData.filter(r => 
                r.title?.toLowerCase().includes(q) || 
                r.description?.toLowerCase().includes(q) ||
                r.id?.toLowerCase().includes(q)
            );
        }

        // Filter: Date Range
        if (from) {
            const fromDate = new Date(from).getTime();
            filteredData = filteredData.filter(r => new Date(r.created_at).getTime() >= fromDate);
        }
        if (to) {
            const toDate = new Date(to).getTime();
            filteredData = filteredData.filter(r => new Date(r.created_at).getTime() <= toDate);
        }

        const duration = Date.now() - startTime;
        console.log(`[API] GET /admin/reports - Found ${filteredData.length}/${allReports.length} reports in ${duration}ms (Role: ${role}, Division: ${targetDivision})`);

        return NextResponse.json(filteredData);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 });
    }
}

// PATCH to update report status
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { reportId, action, userId, notes, resolution_evidence_url } = body;

        if (!reportId || !action) {
            return NextResponse.json({ error: 'reportId dan action wajib diisi' }, { status: 400 });
        }

        // Get current report
        const report = await reportsService.getReportById(reportId);

        if (!report) {
            return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
        }

        // Get user role
        let userRole = body.userRole;
        if (!userRole && userId) {
            const { data: user } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();
            userRole = user?.role;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Role pengguna tidak ditemukan' }, { status: 400 });
        }

        // Validate transition
        const validation = validateStatusTransition(report.status, action, userRole);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 403 });
        }

        const newStatus = validation.newStatus!;
        const updateData: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
        };

        // Set timestamp field for the transition
        const timestampField = getTimestampFieldForStatus(newStatus);
        if (timestampField) {
            updateData[timestampField] = new Date().toISOString();
        }

        // Set user field for the transition
        const userField = getUserFieldForStatus(newStatus);
        if (userField && userId) {
            updateData[userField] = userId;
        }

        // Add notes if provided
        if (notes) {
            if (action === 'verify') {
                updateData.validation_notes = notes;
            } else if (action === 'close') {
                updateData.investigator_notes = notes;
            } else if (action === 'reopen') {
                updateData.manager_notes = notes;
            }
        }

        // Add resolution evidence URL if provided
        if (resolution_evidence_url) {
            updateData.resolution_evidence_url = resolution_evidence_url;
        }

        // If reopening, clear resolved timestamps
        if (action === 'reopen') {
            updateData.resolved_at = null;
            updateData.resolved_by = null;
        }

        const updatedReport = await reportsService.updateReport(reportId, updateData);

        if (!updatedReport) {
             return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, newStatus });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
    }
}
