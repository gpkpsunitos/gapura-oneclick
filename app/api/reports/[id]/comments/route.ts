/**
 * @file
 * 
 * File ini berisi API route untuk mengelola komentar laporan
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { UserRole } from '@/types';
import { reportsService } from '@/lib/services/reports-service';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Mengecek apakah pengguna memiliki akses ke komentar laporan
 * 
 * @param reportId - ID laporan yang akan dicek aksesnya
 * @param userId - ID pengguna yang melakukan permintaan
 * @param role - Role pengguna untuk menentukan tingkat akses
 * @returns Promise<boolean> - true jika pengguna memiliki akses, false jika tidak
 * @throws Tidak melempar error, mengembalikan false jika terjadi error
 */
async function canAccessReportComments(reportId: string, userId: string, role: UserRole, stationId?: string): Promise<boolean> {
    // 1. High-level admins always have access
    const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'DIVISI_ESKALASI', 'DIVISI_OS', 'ANALYST', 'DIVISI_OP'];
    if (GLOBAL_ACCESS_ROLES.includes(role)) {
        return true;
    }

    // 2. MANAGER_CABANG can access all station reports
    if (role === 'MANAGER_CABANG') {
        // Handle Google Sheets ID format (e.g. "NON CARGO!row_2")
        if (reportId.includes('!')) {
            return true; // Sheet reports - ownership check done at page level
        }

        // Fetch both report and user station
        // Fetch both report and user station in parallel
        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('station_id')
            .eq('id', reportId)
            .single();

        if (!report) return false;
        return report.station_id === stationId;
    }

    // 3. STAFF_CABANG can only access their own reports
    if (role === 'STAFF_CABANG') {
        if (reportId.includes('!')) {
            return true; // Sheet reports - ownership check done at page level
        }

        const { data: report, error } = await supabaseAdmin
            .from('reports')
            .select('user_id')
            .eq('id', reportId)
            .single();

        if (error || !report) return false;
        return report.user_id === userId;
    }

    return false;
}

/**
 * GET /api/reports/[id]/comments
 * 
 * Mengambil semua komentar untuk laporan tertentu beserta informasi pengguna
 * Menggunakan Admin Client untuk mengabaikan RLS, dengan pengecekan autentikasi manual
 * 
 * @param request - Objek request HTTP
 * @param params - Parameter route berisi ID laporan
 * @returns Promise<NextResponse> - Response JSON berisi daftar komentar atau error
 * @throws Mengembalikan 401 jika tidak terautentikasi
 * @throws Mengembalikan 403 jika tidak memiliki akses
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: reportId } = await params;
        
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        /* 
           Authorization Check
           If reportId includes '!', it is a Google Sheet report.
           We allow access if the user has a valid session and an appropriate role.
           More granular ownership checks are performed at the report detail level.
         */
        if (!reportId.includes('!')) {
            const hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole, payload.station_id as string);
            if (!hasAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const report = await reportsService.getReportById(reportId);

        // Fetch comments using Admin Client
        // Search by both UUID and original Sheets ID (original_id) for transition compatibility
        const commentIds = [reportId, report?.original_id].filter((val): val is string => !!val);
        const { data, error } = await supabaseAdmin
            .from('report_comments')
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                sheet_id,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .in('report_id', commentIds)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in GET /api/reports/[id]/comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/reports/[id]/comments
 * 
 * Menambahkan komentar baru ke laporan
 * Menggunakan Admin Client untuk mengabaikan RLS, dengan pengecekan autentikasi manual
 * 
 * @param request - Objek request HTTP dengan body berisi konten dan lampiran komentar
 * @param params - Parameter route berisi ID laporan
 * @returns Promise<NextResponse> - Response JSON berisi komentar yang dibuat atau error
 * @throws Mengembalikan 401 jika tidak terautentikasi
 * @throws Mengembalikan 403 jika tidak memiliki akses
 * @throws Mengembalikan 400 jika konten atau lampiran tidak diberikan
 * @throws Mengembalikan 404 jika laporan tidak ditemukan
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id: reportId } = await params;
        
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
        const { content, attachments = [] } = body;

        // Validate: content is required unless there are attachments
        if (!content?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: 'Content or attachments required' }, { status: 400 });
        }

        const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'DIVISI_ESKALASI', 'DIVISI_OS', 'ANALYST', 'DIVISI_OP'];
        
        let hasAccess = false;
        // 1) Global roles can always comment
        if (GLOBAL_ACCESS_ROLES.includes(payload.role as UserRole)) {
            hasAccess = true;
        } else {
            // 2) Branch roles: reuse the same access logic as GET
            if (reportId.includes('!')) {
                // Sheet-sourced report: allow for authenticated branch roles
                hasAccess = (payload.role === 'MANAGER_CABANG' || payload.role === 'STAFF_CABANG');
            } else {
                hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole, payload.station_id as string);
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch report data to get the stable UUID and original_id (sheet_id)
        const report = await reportsService.getReportById(reportId);
        
        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const stableUuid = report.id;
        const sheetId = report?.original_id || null;

        // Insert comment using Admin Client
        // We always use the stable UUID in report_id for consistency and realtime compatibility
        const { data: comment, error: insertError } = await supabaseAdmin
            .from('report_comments')
            .insert({
                report_id: stableUuid,
                user_id: payload.id,
                content: content?.trim() || '',
                attachments: null, // Attachments removed per request
                is_system_message: false,
                sheet_id: sheetId,
            })
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .single();

        if (insertError) {
            console.error('Error creating comment:', insertError);
            return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/reports/[id]/comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
