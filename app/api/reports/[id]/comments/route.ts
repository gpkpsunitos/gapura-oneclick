
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { UserRole } from '@/types';
import { reportsService } from '@/lib/services/reports-service';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Divisions, analysts, eskalasi and super admin can read/post on any report.
const GLOBAL_COMMENT_ROLES: UserRole[] = [
    'SUPER_ADMIN', 'DIVISI_ESKALASI', 'ANALYST',
    'DIVISI_OCS', 'DIVISI_OS', 'DIVISI_OP', 'DIVISI_OT', 'DIVISI_UQ', 'DIVISI_HT',
];

async function canAccessReportComments(reportId: string, userId: string, role: UserRole, stationId?: string): Promise<boolean> {

    if (GLOBAL_COMMENT_ROLES.includes(role)) {
        return true;
    }

    if (role === 'MANAGER_CABANG') {

        if (reportId.includes('!')) {
            return true;
        }

        const { data: report } = await supabaseAdmin
            .from('reports')
            .select('station_id')
            .eq('id', reportId)
            .single();

        if (!report) return false;
        return report.station_id === stationId;
    }

    if (role === 'STAFF_CABANG') {
        if (reportId.includes('!')) {
            return true;
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

        if (!reportId.includes('!')) {
            const hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole, payload.station_id as string);
            if (!hasAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const report = await reportsService.getReportById(reportId);

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

        if (!content?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: 'Content or attachments required' }, { status: 400 });
        }

        let hasAccess = false;

        if (GLOBAL_COMMENT_ROLES.includes(payload.role as UserRole)) {
            hasAccess = true;
        } else {

            if (reportId.includes('!')) {

                hasAccess = (payload.role === 'MANAGER_CABANG' || payload.role === 'STAFF_CABANG');
            } else {
                hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole, payload.station_id as string);
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const report = await reportsService.getReportById(reportId);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const stableUuid = report.id;
        const sheetId = report?.original_id || null;

        const { data: comment, error: insertError } = await supabaseAdmin
            .from('report_comments')
            .insert({
                report_id: stableUuid,
                user_id: payload.id,
                content: content?.trim() || '',
                attachments: null,
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

        // In-app bell: notify the reporter + everyone who previously commented.
        try {
            const recipientIds = new Set<string>();

            const { data: priorCommenters } = await supabaseAdmin
                .from('report_comments')
                .select('user_id')
                .in('report_id', [stableUuid, sheetId].filter((v): v is string => !!v));
            priorCommenters?.forEach((row) => row.user_id && recipientIds.add(row.user_id));

            const { data: reportRow } = await supabaseAdmin
                .from('reports')
                .select('user_id')
                .eq('id', stableUuid)
                .single();
            if (reportRow?.user_id) recipientIds.add(reportRow.user_id);

            recipientIds.delete(payload.id as string); // never notify the author

            if (recipientIds.size > 0 && comment?.id) {
                await supabaseAdmin.from('report_comment_notifications').insert(
                    [...recipientIds].map((uid) => ({
                        user_id: uid,
                        report_id: stableUuid,
                        comment_id: comment.id,
                    }))
                );
            }
        } catch (notifyError) {
            console.error('Failed to create comment notifications:', notifyError);
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/reports/[id]/comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
