import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchHCLeaveRecordsForBackup, syncHCLeaveBackup } from '@/lib/services/hc-leave-backup';
import { canManageHCWorkspace, getWorkspaceUser } from '@/lib/server/workspace-auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManageHCWorkspace(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await context.params;
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('hc_leave_records')
            .select('id, is_deleted')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }
        if (!existing?.is_deleted) {
            return NextResponse.json({ error: 'Record is not archived' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('hc_leave_records')
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            throw error;
        }

        await syncHCLeaveBackup().catch((backupError) => {
            console.warn('[HC Leave Restore] Backup sync failed after restore:', backupError);
        });

        const records = await fetchHCLeaveRecordsForBackup({ includeDeleted: true });
        const restored = records.find((record) => record.id === id);

        return NextResponse.json(restored);
    } catch (error) {
        console.error('[HC Leave Restore] Failed to restore record:', error);
        return NextResponse.json({ error: 'Failed to restore HC leave record' }, { status: 500 });
    }
}
