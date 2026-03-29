import { after, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { REPORT_STATUS } from '@/lib/constants/report-status';
import { reportsService } from '@/lib/services/reports-service';
import { notifyNewRecordEmail } from '@/lib/notifications';
import { persistReportMetadata } from '@/lib/report-persistence';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { bumpSyncVersion } from '@/lib/sync-state';
import { purgeDashboardSnapshots, purgeExpiredDashboardSnapshots } from '@/lib/dashboard-cache';

const DEFAULT_REPORT_SUMMARY_FIELDS = [
    'id',
    'sheet_id',
    'title',
    'description',
    'status',
    'severity',
    'priority',
    'created_at',
    'updated_at',
    'date_of_event',
    'station_id',
    'station_code',
    'branch',
    'hub',
    'target_division',
    'reporter_name',
    'reporter_email',
    'airlines',
    'airline',
    'flight_number',
    'reference_number',
    'area',
    'category',
    'main_category',
    'irregularity_complain_category',
    'evidence_url',
    'evidence_urls',
] as const;

type ReportSummaryRow = {
    id: string | number | null;
    created_at: string | null;
    [key: string]: unknown;
};

function encodeCursor(createdAt: string, id: string): string {
    return Buffer.from(JSON.stringify({ createdAt, id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
    if (!cursor) return null;
    try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (!parsed?.createdAt || !parsed?.id) return null;
        return {
            createdAt: String(parsed.createdAt),
            id: String(parsed.id),
        };
    } catch {
        return null;
    }
}

function pickReportFields(report: any, fields: readonly string[]) {
    const picked: Record<string, unknown> = {};
    for (const field of fields) {
        if (report[field] !== undefined) {
            picked[field] = report[field];
        }
    }
    return picked;
}

// GET reports for an employee
export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();
        const userEmail = String(payload.email || '').trim().toLowerCase();
        const userFullName = String((payload as any).full_name || '').trim().toLowerCase();
        const url = new URL(request.url);
        const unfiltered = url.searchParams.get('unfiltered') === '1';
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200);
        const cursor = decodeCursor(url.searchParams.get('cursor'));
        const fieldsParam = url.searchParams.get('fields');
        const requestedFields = fieldsParam
            ? fieldsParam.split(',').map((field) => field.trim()).filter(Boolean)
            : [...DEFAULT_REPORT_SUMMARY_FIELDS];

        // Get user's station_id from database for role-based filtering
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('station_id')
            .eq('id', payload.id)
            .single();

        const userStationId = userData?.station_id;

        const isDivisionOrPartner = role.startsWith('DIVISI_') || role.startsWith('PARTNER_');
        const adminBypass = role === 'SUPER_ADMIN' || role === 'ANALYST';
        const bypassFiltering = unfiltered && (isDivisionOrPartner || adminBypass);

        if (bypassFiltering) {
            console.log(`[REPORTS_API] Unfiltered mode active for role: ${role}`);
            const reports = await reportsService.getReports();
            return NextResponse.json(reports, {
                headers: {
                    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
                    'Vary': 'Cookie'
                }
            });
        } else {
            let query = supabaseAdmin
                .from('reports_sync')
                .select(requestedFields.join(','))
                .order('created_at', { ascending: false })
                .order('id', { ascending: false });

            if (role === 'STAFF_CABANG' || role === 'CABANG' || role === 'EMPLOYEE') {
                const orFilters = [
                    `user_id.eq.${payload.id}`,
                    userEmail ? `reporter_email.eq.${userEmail}` : null,
                    userFullName ? `reporter_name.eq.${userFullName}` : null,
                ].filter(Boolean).join(',');
                if (orFilters) {
                    query = query.or(orFilters);
                } else {
                    query = query.eq('user_id', payload.id);
                }
            } else if (role === 'MANAGER_CABANG' && userStationId) {
                query = query.eq('station_id', userStationId);
            } else if (role === 'MANAGER_CABANG') {
                query = query.eq('id', '__no-match__');
            } else if (isDivisionOrPartner) {
                const division = role.split('_')[1];
                query = query.eq('target_division', division);
            }

            if (cursor) {
                query = query.lt('created_at', cursor.createdAt);
            }

            const { data: rows, error } = await query.limit(limit + 1);
            if (error) {
                throw error;
            }

            const safeRows = (rows || []) as unknown as ReportSummaryRow[];
            const hasMore = safeRows.length > limit;
            const slicedRows = hasMore ? safeRows.slice(0, limit) : safeRows;
            const reports = slicedRows.map((report) => pickReportFields(report, requestedFields));
            const nextCursor = hasMore && slicedRows.length > 0
                ? encodeCursor(String(slicedRows[slicedRows.length - 1].created_at || ''), String(slicedRows[slicedRows.length - 1].id))
                : null;

            return NextResponse.json({
                reports,
                pagination: {
                    limit,
                    nextCursor,
                    hasMore,
                },
            }, {
                headers: {
                    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
                    'Vary': 'Cookie'
                }
            });
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST create a new report
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            description,
            location,
            station_id,
            location_id,
            incident_type_id,
            severity,
            flight_number,
            aircraft_reg,
            gse_number,
            evidence_url,
            evidence_urls,
            evidence_meta,
            // New fields
            incident_date,
            incident_time,
            area,
            specific_location,
            main_category,
            sub_category,
            immediate_action,
            priority,
            is_flight_related,
            is_gse_related,
            // New Screenshot Fields
            airline,
            route,
            root_cause,
            action_taken,
            reporter_name,
            area_category,
            // Delay fields
            delay_code,
            delay_duration,
            // CSV-aligned fields
            station_code,
            hub,
            airline_type,
            jenis_maskapai, // from client wizard
            report_content,
            reporting_branch,
            week_in_month,
            reporter_email,
            form_submitted_at,
            form_completed_at,
            // Area-specific category columns (from client wizard)
            terminal_area_category,
            apron_area_category,
            general_category,
        } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Judul dan deskripsi wajib diisi' }, { status: 400 });
        }

        // Get user's station and unit from their profile (Supabase)
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('station_id, unit_id')
            .eq('id', payload.id)
            .single();

        const areaKey = String(area || '').trim().toUpperCase().replace(/\s+AREA$/, '');
        // Construct report object for Google Sheets
        const reportData: any = {
            user_id: payload.id,
            title,
            description,
            location: location || null,
            station_id: station_id || userData?.station_id || null,
            unit_id: userData?.unit_id || null,
            location_id: location_id || null,
            incident_type_id: incident_type_id || null,
            severity: severity || 'low',
            flight_number: flight_number || null,
            aircraft_reg: aircraft_reg || null,
            gse_number: gse_number || null,
            evidence_url: evidence_url || (evidence_urls && evidence_urls.length > 0 ? evidence_urls[0] : null),
            evidence_urls: evidence_urls || (evidence_url ? [evidence_url] : []) || [],
            evidence_meta: evidence_meta || null,
            status: REPORT_STATUS.OPEN,
            // Insert new fields
            // Sheets expect "date_of_event" header, map from incident_date
            date_of_event: incident_date || null,
            event_date: incident_date || null, // keep legacy alias for compatibility
            incident_time: incident_time || null,
            area: area || null,
            specific_location: specific_location || null,
            category: main_category || null,
            irregularity_complain_category: sub_category || incident_type_id || null,
            immediate_action: immediate_action || null,
            priority: priority || 'medium',
            is_flight_related: is_flight_related || false,
            is_gse_related: is_gse_related || false,
            // Insert New Fields
            airlines: airline || null,
            airline: airline || null,
            route: route || null,
            root_caused: root_cause || null,
            action_taken: action_taken || null,
            reporter_name: reporter_name || null,
            delay_code: delay_code || null,
            delay_duration: delay_duration || null,
            // CSV-aligned fields
            station_code: station_code || null,
            hub: null,
            // Support both airline_type and jenis_maskapai from client
            jenis_maskapai: airline_type || jenis_maskapai || null,
            report: report_content || description || null,
            reporting_branch: reporting_branch || null,
            week_in_month: week_in_month || null,
            reporter_email: reporter_email || null,
            form_submitted_at: form_submitted_at || null,
            form_completed_at: form_completed_at || null,
            // Ensure branch is populated if possible
            branch: station_code || null, 
            // Area-specific categories (ensure write to appropriate columns)
            terminal_area_category: terminal_area_category || (areaKey === 'TERMINAL' ? area_category || null : null),
            apron_area_category: apron_area_category || (areaKey === 'APRON' ? area_category || null : null),
            general_category: general_category || (areaKey === 'GENERAL' ? area_category || null : null),
        };

        // Ensure reporter_email always captured for filtering fallback
        if (!reportData.reporter_email && payload.email) {
            reportData.reporter_email = payload.email;
        }
        // Resolve HUB mapping using "HUB" sheet when available
        try {
            const resolvedHub = await reportsService.resolveHubForStation(reportData.station_code || reportData.station_id);
            if (resolvedHub) reportData.hub = resolvedHub;
        } catch {}
        const newReport = await reportsService.createReport(reportData);

        await persistReportMetadata(newReport, { userId: payload.id }).catch((persistError) => {
            console.warn('[REPORTS_API] Metadata persistence failed (non-blocking):', persistError);
        });

        await notifyNewRecordEmail(newReport, 'internal').catch((notificationError) => {
            console.warn('[REPORTS_API] New-record notification failed:', notificationError);
        });

        after(async () => {
            try {
                const state = await bumpSyncVersion('reports');
                await purgeDashboardSnapshots({ maxSyncVersion: Number(state.sync_version) });
                await purgeExpiredDashboardSnapshots();
            } catch (syncStateError) {
                console.warn('[REPORTS_API] Post-create cache invalidation failed:', syncStateError);
            }
        });

        return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
