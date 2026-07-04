import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { validateStatusTransition, getTimestampFieldForStatus, getUserFieldForStatus } from '@/lib/utils/validate-transition';
import { reportsService } from '@/lib/services/reports-service';
import { notifyReportClosedEmail } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

interface RefCache<T> { data: T; ts: number }
const REF_CACHE_TTL = 1000 * 60 * 10;
let stationsCache: RefCache<Array<{ id: string; code: string; name: string }>> | null = null;
let usersCache: RefCache<Array<{ id: string; full_name: string; email: string }>> | null = null;

async function getCachedStations() {
  if (stationsCache && Date.now() - stationsCache.ts < REF_CACHE_TTL) {
    return stationsCache.data;
  }
  const { data } = await supabaseAdmin.from('stations').select('id, code, name');
  const result = data ?? [];
  stationsCache = { data: result, ts: Date.now() };
  return result;
}

async function getCachedUsers() {
  if (usersCache && Date.now() - usersCache.ts < REF_CACHE_TTL) {
    return usersCache.data;
  }
  const { data } = await supabaseAdmin.from('users').select('id, full_name, email');
  const result = data ?? [];
  usersCache = { data: result, ts: Date.now() };
  return result;
}

function normalizeStationValue(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function statusToAction(status: unknown): string | null {
    const normalized = String(status || '').trim().toUpperCase().replace(/_/g, ' ');

    if (normalized === 'ON PROGRESS') return 'update_progress';
    if (normalized === 'CLOSED') return 'close';
    if (normalized === 'OPEN') return 'reopen';

    return null;
}

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
        const sourceParam = searchParams.get('source');

        const source: 'sheets' | 'sync' = sourceParam === 'sheets' ? 'sheets' : 'sync';
        const allReports = await reportsService.getReports({
            source,
            filters: status && status !== 'all' ? { status } : undefined,
        });
        const role = String(payload.role || '').trim().toUpperCase();
        const managerStationValues = new Set<string>();

        if (role === 'MANAGER_CABANG') {
            const stationId = String(payload.station_id || '').trim();
            if (!stationId) {
                return NextResponse.json([], {
                    headers: { 'Cache-Control': 'private, no-cache' },
                });
            }

            managerStationValues.add(normalizeStationValue(stationId));
            const { data: stationRow } = await supabaseAdmin
                .from('stations')
                .select('id, code, name')
                .eq('id', stationId)
                .single();

            if (stationRow) {
                managerStationValues.add(normalizeStationValue(stationRow.id));
                managerStationValues.add(normalizeStationValue(stationRow.code));
                managerStationValues.add(normalizeStationValue(stationRow.name));
            }
        }

        const filterByStatus = status && status !== 'all';
        const filterByStation = role !== 'MANAGER_CABANG' && station && station !== 'all';
        const filterBySearch = !!search;
        const filterByFrom = !!from;
        const filterByTo = !!to;
        const q = search?.toLowerCase();
        const fromMs = from ? new Date(from).getTime() : 0;
        const toMs = to ? new Date(to).getTime() : 0;

        const filteredData = allReports.filter(r => {
            if (filterByStatus && r.status !== status) return false;
            if (managerStationValues.size > 0) {
                const reportStationValues = [
                    r.station_id,
                    r.station_code,
                    r.branch,
                    r.reporting_branch,
                    r.kode_cabang,
                    r.stations?.code,
                    r.stations?.name,
                ].map(normalizeStationValue).filter(Boolean);
                if (!reportStationValues.some((value) => managerStationValues.has(value))) return false;
            }
            if (filterByStation && r.station_id !== station && r.branch !== station) return false;
            if (filterBySearch && !(
                r.title?.toLowerCase().includes(q!) ||
                r.description?.toLowerCase().includes(q!) ||
                r.id?.toLowerCase().includes(q!)
            )) return false;
            if (filterByFrom && new Date(r.created_at).getTime() < fromMs) return false;
            if (filterByTo && new Date(r.created_at).getTime() > toMs) return false;
            return true;
        });

        const duration = Date.now() - startTime;

        return NextResponse.json(filteredData, {
            headers: { 'Cache-Control': 'private, no-cache' },
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value ?? null;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifySession(token);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const {
            reportId,
            action,
            status,
            notes,
            resolution_evidence_url,
            final_remarks,
            kps_remarks,
            remarks_by,
        } = body;
        const requestedAction = action || statusToAction(status);

        if (!reportId || !requestedAction) {
            return NextResponse.json({ error: 'reportId dan action/status wajib diisi' }, { status: 400 });
        }

        const report = await reportsService.getReportById(reportId);

        if (!report) {
            return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
        }

        const userRole = session.role;
        const userId = session.id;

        if (!userRole) {
            return NextResponse.json({ error: 'Role pengguna tidak ditemukan' }, { status: 400 });
        }

        const validation = validateStatusTransition(report.status, requestedAction, userRole);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 403 });
        }

        const newStatus = validation.newStatus!;
        const finalRemarksValue = String(kps_remarks ?? final_remarks ?? notes ?? '').trim();
        const remarksByValue = String(remarks_by ?? '').trim();

        if (requestedAction === 'close' && (!finalRemarksValue || !remarksByValue)) {
            return NextResponse.json(
                { error: 'Final Remarks dan Remarks By wajib diisi sebelum menutup laporan' },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
        };

        const timestampField = getTimestampFieldForStatus(newStatus);
        if (timestampField) {
            updateData[timestampField] = new Date().toISOString();
        }

        const userField = getUserFieldForStatus(newStatus);
        if (userField && userId) {
            updateData[userField] = userId;
        }

        if (notes) {
            if (requestedAction === 'verify' || requestedAction === 'update_progress') {
                updateData.validation_notes = notes;
            } else if (requestedAction === 'close') {
                updateData.investigator_notes = notes;
            } else if (requestedAction === 'reopen') {
                updateData.manager_notes = notes;
            }
        }

        if (requestedAction === 'close') {
            updateData.kps_remarks = finalRemarksValue;
            updateData.remarks_by = remarksByValue;
        }

        if (resolution_evidence_url) {
            updateData.resolution_evidence_url = resolution_evidence_url;
        }

        if (requestedAction === 'reopen') {
            updateData.resolved_at = null;
            updateData.resolved_by = null;
        }

        const updatedReport = await reportsService.updateReport(reportId, updateData);

        if (!updatedReport) {
             return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
        }

        if (
            newStatus === 'CLOSED' &&
            String(report.status || '').toUpperCase() !== 'CLOSED'
        ) {
            notifyReportClosedEmail(updatedReport).catch((notificationError) => {
                console.warn('[ADMIN_REPORTS] Report closed notification failed:', notificationError);
            });
        }

        return NextResponse.json({ success: true, newStatus });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
    }
}
