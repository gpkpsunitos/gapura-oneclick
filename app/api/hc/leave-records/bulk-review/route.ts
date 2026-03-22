import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncHCLeaveBackup } from '@/lib/services/hc-leave-backup';
import { canManageHCWorkspace, getWorkspaceUser } from '@/lib/server/workspace-auth';
import type { HCLeaveSubmissionStatus } from '@/types';

const ALLOWED_STATUSES: HCLeaveSubmissionStatus[] = ['APPROVED', 'REJECTED'];

export async function POST(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManageHCWorkspace(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const ids = Array.isArray(body.ids)
            ? body.ids.map((value) => String(value || '').trim()).filter(Boolean)
            : [];
        const nextStatus = String(body.submission_status || '').trim().toUpperCase() as HCLeaveSubmissionStatus;
        const reviewNotes = body.review_notes ? String(body.review_notes).trim() : null;

        if (!ids.length) {
            return NextResponse.json({ error: 'ids is required' }, { status: 400 });
        }
        if (!ALLOWED_STATUSES.includes(nextStatus)) {
            return NextResponse.json({ error: 'submission_status is invalid' }, { status: 400 });
        }

        const { data: pendingRows, error: fetchError } = await supabaseAdmin
            .from('hc_leave_records')
            .select('id')
            .in('id', ids)
            .eq('submission_status', 'PENDING');

        if (fetchError) {
            throw fetchError;
        }

        const pendingIds = (pendingRows || []).map((row) => String(row.id));
        if (!pendingIds.length) {
            return NextResponse.json({
                success: true,
                updated_count: 0,
                skipped_count: ids.length,
            });
        }

        const { error: updateError } = await supabaseAdmin
            .from('hc_leave_records')
            .update({
                submission_status: nextStatus,
                review_notes: reviewNotes,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .in('id', pendingIds);

        if (updateError) {
            throw updateError;
        }

        await syncHCLeaveBackup().catch((backupError) => {
            console.warn('[HC Leave Bulk Review] Backup sync failed after bulk update:', backupError);
        });

        return NextResponse.json({
            success: true,
            updated_count: pendingIds.length,
            skipped_count: ids.length - pendingIds.length,
        });
    } catch (error) {
        console.error('[HC Leave Bulk Review] Failed to bulk review records:', error);
        return NextResponse.json({ error: 'Failed to bulk review HC leave records' }, { status: 500 });
    }
}
