
import { after, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { REPORT_STATUS } from '@/lib/constants/report-status';
import { reportsService } from '@/lib/services/reports-service';
import { notifyNewRecordEmail, notifyNewReport } from '@/lib/notifications';
import { persistReportMetadata } from '@/lib/report-persistence';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { bumpSyncVersion } from '@/lib/sync-state';
import { purgeDashboardSnapshots, purgeExpiredDashboardSnapshots } from '@/lib/dashboard-cache';
import { linkEvidenceFilesToReport, normalizeEvidenceSubmissionId, validateEvidenceForReport } from '@/lib/evidence-files';

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
    'airlines',
    'airline',
    'flight_number',
    'aircraft_reg',
    'jenis_maskapai',
    'route',
    'root_caused',
    'action_taken',
    'preventive_action',
    'delay_code',
    'delay_duration',
    'case_classification',
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickReportFields(report: any, fields: readonly string[]) {
    const picked: Record<string, unknown> = {};
    for (const field of fields) {
        if (report[field] !== undefined) {
            picked[field] = report[field];
        }
    }
    return picked;
}

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

        const role = String(payload.role).trim().toUpperCase();
        const userEmail = String(payload.email || '').trim().toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userFullName = String((payload as any).full_name || '').trim().toLowerCase();
        const url = new URL(request.url);
        const unfiltered = url.searchParams.get('unfiltered') === '1';
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200);
        const cursor = decodeCursor(url.searchParams.get('cursor'));
        const fieldsParam = url.searchParams.get('fields');
        const requestedFields = fieldsParam
            ? fieldsParam.split(',').map((field) => field.trim()).filter(Boolean)
            : [...DEFAULT_REPORT_SUMMARY_FIELDS];

        const userStationId = payload.station_id;

        const isDivisionOrPartner = role.startsWith('DIVISI_') || role.startsWith('PARTNER_');
        const adminBypass = role === 'SUPER_ADMIN' || role === 'ANALYST';
        // Only SUPER_ADMIN/ANALYST may see company-wide unfiltered data.
        // Division/partner roles must stay scoped to their own target_division
        // below, even when unfiltered=1 is passed.
        const bypassFiltering = unfiltered && adminBypass;

        if (bypassFiltering) {
            const reports = await reportsService.getReports({
                fields: requestedFields as unknown as string[],
                source: 'sync',
            });
            return NextResponse.json(reports, {
                headers: {
                    'Cache-Control': 'private, no-store, max-age=0',
                    'Vary': 'Cookie'
                }
            });
        } else {
            let query = supabaseAdmin
                .from('ground_handling_irregularity_report')
                .select(requestedFields.join(','))
                .order('created_at', { ascending: false })
                .order('id', { ascending: false });

            if (role === 'STAFF_CABANG' || role === 'CABANG' || role === 'EMPLOYEE') {
                const safeEmail = userEmail ? `"${userEmail.replace(/"/g, '""')}"` : null;
                const safeName = userFullName ? `"${userFullName.replace(/"/g, '""')}"` : null;
                const orFilters = [
                    `user_id.eq.${payload.id}`,
                    safeEmail ? `reporter_email.eq.${safeEmail}` : null,
                    safeName ? `reporter_name.eq.${safeName}` : null,
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
                    'Cache-Control': 'private, no-store, max-age=0',
                    'Vary': 'Cookie'
                }
            });
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

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
            evidence_file_ids,
            evidence_submission_id,
            evidence_meta,

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

            airline,
            route,
            root_cause,
            action_taken,
            reporter_name,
            area_category,

            delay_code,
            delay_duration,

            station_code,
            hub,
            airline_type,
            jenis_maskapai,
            report_content,
            reporting_branch,
            week_in_month,
            reporter_email,
            form_submitted_at,
            form_completed_at,

            terminal_area_category,
            apron_area_category,
            general_category,
            case_classification,
            preventive_action,
            gse_available_requirement,
            gse_motorized,
            gse_non_motorized,
            category_case_gse,
        } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
        }

        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('unit_id')
            .eq('id', payload.id)
            .single();

        const areaKey = String(area || '').trim().toUpperCase().replace(/\s+AREA$/, '');
        const submissionId = normalizeEvidenceSubmissionId(evidence_submission_id);
        const evidenceValidation = await validateEvidenceForReport({
            evidenceFileIds: evidence_file_ids,
            evidenceUrls: evidence_urls || evidence_url,
            submissionId,
            mode: 'internal',
            userId: payload.id,
            reporterEmail: reporter_email || payload.email || null,
            requireLedger: true,
        });
        if (evidenceValidation.urls.length === 0) {
            return NextResponse.json({ error: 'Evidence wajib diunggah sebelum laporan dikirim' }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reportData: any = {
            user_id: payload.id,
            title,
            description,
            location: location || null,
            station_id: station_id || payload.station_id || null,
            unit_id: userData?.unit_id || null,
            location_id: location_id || null,
            incident_type_id: incident_type_id || null,
            severity: severity || 'low',
            flight_number: flight_number || null,
            aircraft_reg: aircraft_reg || null,
            gse_number: gse_number || null,
            evidence_url: evidenceValidation.urls[0] || null,
            evidence_urls: evidenceValidation.urls,
            evidence_file_ids: evidenceValidation.evidenceFileIds,
            evidence_submission_id: submissionId,
            evidence_meta: evidence_meta || null,
            status: REPORT_STATUS.OPEN,

            date_of_event: incident_date || null,
            event_date: incident_date || null,
            incident_time: incident_time || null,
            area: area || null,
            specific_location: specific_location || null,
            category: main_category || null,
            irregularity_complain_category: sub_category || incident_type_id || null,
            immediate_action: immediate_action || null,
            priority: priority || 'medium',
            is_flight_related: is_flight_related || false,
            is_gse_related: is_gse_related || false,

            airlines: airline || null,
            airline: airline || null,
            route: route || null,
            root_caused: root_cause || null,
            action_taken: action_taken || null,
            reporter_name: reporter_name || null,
            delay_code: delay_code || null,
            delay_duration: delay_duration || null,

            station_code: station_code || null,
            hub: null,

            jenis_maskapai: airline_type || jenis_maskapai || null,
            report: report_content || description || null,
            reporting_branch: reporting_branch || null,
            week_in_month: week_in_month || null,
            reporter_email: reporter_email || null,
            form_submitted_at: form_submitted_at || null,
            form_completed_at: form_completed_at || null,

            branch: station_code || null, 

            terminal_area_category: terminal_area_category || (areaKey === 'TERMINAL' ? area_category || null : null),
            apron_area_category: apron_area_category || (areaKey === 'APRON' ? area_category || null : null),
            general_category: general_category || (areaKey === 'GENERAL' || areaKey === 'CARGO' ? area_category || null : null),
            case_classification: case_classification || null,
            preventive_action: preventive_action || null,

            gse_available_requirement: gse_available_requirement || null,
            gse_motorized: gse_motorized || null,
            gse_non_motorized: gse_non_motorized || null,
            category_case_gse: category_case_gse || (areaKey === 'GSE' ? area_category || null : null),
        };
        if (areaKey === 'GSE') reportData.is_gse_related = true;

        if (!reportData.reporter_email && payload.email) {
            reportData.reporter_email = payload.email;
        }

        try {
            const resolvedHub = await reportsService.resolveHubForStation(reportData.station_code || reportData.station_id);
            if (resolvedHub) reportData.hub = resolvedHub;
        } catch {}
        const newReport = await reportsService.createReport(reportData);

        try {
            await linkEvidenceFilesToReport({
                evidenceFileIds: evidenceValidation.evidenceFileIds,
                submissionId,
                reportSheetId: newReport.original_id || newReport.sheet_id || null,
                reportId: newReport.id || null,
            });
        } catch (linkError) {
            console.error('[REPORTS_API] Evidence link failed, deleting created sheet row:', linkError);
            await reportsService.deleteReport(newReport.original_id || newReport.sheet_id || newReport.id).catch((deleteError) => {
                console.warn('[REPORTS_API] Rollback delete failed:', deleteError);
            });
            throw linkError;
        }

        await Promise.all([
            persistReportMetadata(newReport, { userId: payload.id }).catch((persistError) => {
                console.warn('[REPORTS_API] Metadata persistence failed (non-blocking):', persistError);
            }),
            notifyNewRecordEmail(newReport, 'internal').catch((notificationError) => {
                console.warn('[REPORTS_API] New-record notification failed:', notificationError);
            }),
        ]);

        const targetDivision = newReport.target_division || newReport.esklasi_divisi;
        if (targetDivision) {
            notifyNewReport(
                String(newReport.id || newReport.original_id || ''),
                targetDivision,
                newReport.title || newReport.report || 'Untitled report',
                String(newReport.priority || 'medium'),
                newReport.sla_deadline || ''
            ).catch((notificationError) => {
                console.warn('[REPORTS_API] Division new-report notification failed:', notificationError);
            });
        }

        after(async () => {
            try {
                const state = await bumpSyncVersion('reports');
                await purgeDashboardSnapshots({ maxSyncVersion: Number(state.sync_version) });
                await purgeExpiredDashboardSnapshots();
            } catch (syncStateError) {
                console.warn('[REPORTS_API] Post-create cache invalidation failed:', syncStateError);
            }
        });

        return NextResponse.json({ success: true, message: 'Report submitted successfully', data: newReport });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
