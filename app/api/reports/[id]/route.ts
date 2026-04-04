/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengambil (GET) dan mengupdate (PATCH) laporan berdasarkan ID
 * Mendukung otorisasi berdasarkan role user dan komentar sistem
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { persistReportMetadata } from '@/lib/report-persistence';

/**
 * Menangani request GET untuk mengambil laporan berdasarkan ID
 * Fetch laporan lengkap dengan semua data terkait termasuk user dan komentar
 * @param request - Request object
 * @param params - Route parameters berisi ID laporan
 * @returns Response JSON berisi data laporan yang diperkaya dengan user dan komentar
 * @throws {Error} Jika laporan tidak ditemukan atau user tidak memiliki akses
 * @example
 * ```http
 * GET /api/reports/uuid-here
 * ```
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Fetch report from Google Sheets
        const report = await reportsService.getReportById(id);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Authorization check: Ensure users can only access reports they're permitted to see
        if (payload.role === 'STAFF_CABANG') {
            // STAFF_CABANG can only access their own reports
            if (report.user_id !== payload.id) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        } else if (payload.role === 'MANAGER_CABANG') {
            if (report.station_id !== payload.station_id) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }
        // Other roles (ANALYST, OS, ADMIN, etc.) have full access

        const commentIds = [id, report.original_id].filter((val): val is string => !!val);

        const [userResult, commentsResult] = await Promise.all([
            report.user_id && !report.user_id.includes('!')
                ? supabase.from('users').select('id, full_name, email').eq('id', report.user_id).single()
                : Promise.resolve({ data: null }),
            supabaseAdmin
                .from('report_comments')
                .select(`
                    id,
                    content,
                    created_at,
                    is_system_message,
                    sheet_id,
                    users:user_id (
                        full_name
                    )
                `)
                .in('report_id', commentIds)
                .order('created_at', { ascending: true }),
        ]);

        const user = userResult?.data;
        const comments = commentsResult?.data;

        // Enrich report using data from Sheets and User profile
        const enrichedReport = {
            ...report,
            users: user || (report.reporter_name ? { full_name: report.reporter_name } : null),
            comments: comments || [],
            // Legacy / Frontend compatibility
            user: user || (report.reporter_name ? { full_name: report.reporter_name } : null),
            station: report.stations ? { ...report.stations, id: report.station_id } : undefined,
        };

        return NextResponse.json(enrichedReport);
    } catch (error) {
        console.error('Error in GET /api/reports/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Menangani request PATCH untuk mengupdate laporan berdasarkan ID
 * Mendukung update field-field tertentu dan pembuatan komentar sistem otomatis
 * untuk dispatch dan perubahan status
 * @param request - Request object berisi data update di body JSON
 * @param params - Route parameters berisi ID laporan
 * @returns Response JSON dengan status sukses dan data laporan yang diupdate
 * @throws {Error} Jika terjadi kesalahan saat mengupdate laporan
 * @example
 * ```json
 * {
 *   "status": "ON PROGRESS",
 *   "priority": "high",
 *   "action_taken": "Laporan sedang dalam proses investigasi"
 * }
 * ```
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
        
        // Define allowed fields to update
        const {
            title,
            description,
            severity,
            status,
            evidence_urls,
            flight_number,
            aircraft_reg,
            gse_number,
            category,
            priority,
            location,
            station_id,
            action_taken,
            root_cause,
            preventive_action,
            reporter_name,
            attachments,
            // Triage
            primary_tag,
            sub_category_note,
            target_division,
            is_dispatch, // New flag for dispatch action
            route,
            airline,
            area,
            date_of_event,
            branch,
        } = body;

        const updates: any = {};

        // Normalize status to canonical value
        const normalizeStatus = (val: unknown) => {
            if (!val) return val;
            let up = String(val).trim().toUpperCase().replace(/_/g, ' ');
            if (up === 'SELESAI' || up === 'CLOSED') {
                return 'CLOSED';
            } else if (up === 'MENUNGGU FEEDBACK' || up === 'OPEN' || up === 'BARU' || up === 'MENUNGGU' || up === 'ACTIVE') {
                return 'OPEN';
            } else if (up === 'SUDAH DIVERIFIKASI' || up === 'ON PROGRESS') {
                return 'ON PROGRESS';
            }
            return up;
        };

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (severity !== undefined) updates.severity = severity;
        if (status !== undefined) updates.status = normalizeStatus(status);
        if (evidence_urls !== undefined) updates.evidence_urls = evidence_urls;
        if (flight_number !== undefined) updates.flight_number = flight_number;
        if (aircraft_reg !== undefined) updates.aircraft_reg = aircraft_reg;
        if (gse_number !== undefined) updates.gse_number = gse_number;
        if (category !== undefined) updates.category = category;
        if (priority !== undefined) updates.priority = priority;
        if (location !== undefined) updates.location = location;
        if (station_id !== undefined) updates.station_id = station_id;
        if (action_taken !== undefined) updates.action_taken = action_taken;
        if (root_cause !== undefined) updates.root_caused = root_cause;
        if (preventive_action !== undefined) updates.preventive_action = preventive_action;
        if (reporter_name !== undefined) updates.reporter_name = reporter_name;
        if (attachments !== undefined) updates.attachments = attachments;
        
        // Triage
        if (primary_tag !== undefined) updates.primary_tag = primary_tag;
        if (sub_category_note !== undefined) updates.sub_category_note = sub_category_note;
        if (target_division !== undefined) updates.target_division = target_division;

        // Additional Fields
        if (route !== undefined) updates.route = route;
        if (airline !== undefined) updates.airline = airline;
        if (area !== undefined) updates.area = area;
        if (date_of_event !== undefined) updates.date_of_event = date_of_event;
        if (branch !== undefined) updates.branch = branch;

        // Perform the update in Google Sheets
        const updatedReport = await reportsService.updateReport(id, updates);

        if (!updatedReport) {
             return NextResponse.json({ error: 'Report not found or update failed' }, { status: 404 });
        }

        // --- DISPATCH LOGIC: Create system comment in Supabase ---
        if (is_dispatch && (primary_tag || target_division)) {
            try {
                const dispatchMsg = `Laporan telah di-dispatch ke divisi ${target_division || 'Terkait'} dengan kategori ${primary_tag || 'Umum'}${sub_category_note ? `: ${sub_category_note}` : ''}`;
                
                await supabaseAdmin.from('report_comments').insert({
                    report_id: updatedReport.id || id, // Always use the UUID for report_id
                    user_id: payload.id,
                    content: dispatchMsg,
                    is_system_message: true,
                    sheet_id: updatedReport.original_id || id // Use original_id (Sheet!row_N) for sheet_id
                });
            } catch (dispatchErr) {
                console.warn('[Dispatch] Failed to create system comment:', dispatchErr);
            }
        }
        
        // --- STATUS CHANGE LOGIC: Create system comment in Supabase ---
        if (updates.status !== undefined) {
            try {
                const statusMsg = `Status laporan diubah ke ${updates.status}${updates.action_taken ? ` — Catatan: ${updates.action_taken}` : ''}`;
                await supabaseAdmin.from('report_comments').insert({
                    report_id: updatedReport.id || id,
                    user_id: payload.id,
                    content: statusMsg,
                    is_system_message: true,
                    sheet_id: updatedReport.original_id || id
                });
            } catch (statusErr) {
                console.warn('[Status] Failed to create system comment:', statusErr);
            }
        }

        await persistReportMetadata(updatedReport, {
            userId: updatedReport.user_id || payload.id,
        }).catch((syncErr) => {
            console.warn('[Supabase] PATCH sync error:', syncErr);
        });

        try {
            const { bumpSyncVersion } = await import('@/lib/sync-state');
            const { purgeDashboardSnapshots, purgeExpiredDashboardSnapshots } = await import('@/lib/dashboard-cache');
            const state = await bumpSyncVersion('reports');
            await purgeDashboardSnapshots({ maxSyncVersion: Number(state.sync_version) });
            await purgeExpiredDashboardSnapshots();
        } catch (cacheErr) {
            console.warn('[REPORTS_PATCH] Cache invalidation failed:', cacheErr);
        }

        return NextResponse.json({ success: true, data: updatedReport });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
    }
}
