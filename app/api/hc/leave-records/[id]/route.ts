import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchHCLeaveRecordsForBackup, syncHCLeaveBackup } from '@/lib/services/hc-leave-backup';
import {
    canManageHCWorkspace,
    getWorkspaceUser,
    normalizeRole,
} from '@/lib/server/workspace-auth';
import type { HCLeaveRecord, HCLeaveSubmissionStatus } from '@/types';

const SUBMISSION_STATUS_VALUES: HCLeaveSubmissionStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

async function getRecord(id: string) {
    const { data, error } = await supabaseAdmin
        .from('hc_leave_records')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as HCLeaveRecord;
}

function canModifyRecord(user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>, record: HCLeaveRecord) {
    if (record.is_deleted) return false;
    if (canManageHCWorkspace(user.role)) return true;

    const role = normalizeRole(user.role);
    if (record.submission_status && record.submission_status !== 'PENDING') return false;
    if (role === 'STAFF_CABANG') return record.created_by === user.id;
    return false;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const existing = await getRecord(id);
        if (existing.is_deleted) {
            return NextResponse.json({ error: 'Record already archived' }, { status: 404 });
        }
        if (!canModifyRecord(user, existing)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const updates: Record<string, unknown> = {
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        };
        const isHCManager = canManageHCWorkspace(user.role);

        const patchableFields = [
            'employee_name',
            'leave_type',
            'start_date',
            'end_date',
            'division_name',
            'unit_name',
            'pic_name',
            'pic_email',
            'pic_phone',
            'e_letter_status',
            'notes',
        ];

        for (const field of patchableFields) {
            if (field in body) {
                const value = body[field];
                updates[field] = value === '' ? null : value;
            }
        }

        if (isHCManager && 'submission_status' in body) {
            const nextSubmissionStatus = String(body.submission_status || '').trim().toUpperCase() as HCLeaveSubmissionStatus;
            if (!SUBMISSION_STATUS_VALUES.includes(nextSubmissionStatus)) {
                return NextResponse.json({ error: 'submission_status is invalid' }, { status: 400 });
            }

            updates.submission_status = nextSubmissionStatus;
            if (nextSubmissionStatus === 'PENDING') {
                updates.reviewed_by = null;
                updates.reviewed_at = null;
                updates.review_notes = null;
            } else {
                updates.reviewed_by = user.id;
                updates.reviewed_at = new Date().toISOString();
                updates.review_notes = body.review_notes ? String(body.review_notes).trim() : null;
            }
        } else if ('submission_status' in body || 'review_notes' in body) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const nextStartDate = String(
            ('start_date' in updates ? updates.start_date : existing.start_date) || ''
        );
        const nextEndDate = String(
            ('end_date' in updates ? updates.end_date : existing.end_date) || ''
        );
        const nextEmployeeName = String(
            ('employee_name' in updates ? updates.employee_name : existing.employee_name) || ''
        ).trim();
        const nextLeaveType = String(
            ('leave_type' in updates ? updates.leave_type : existing.leave_type) || ''
        ).trim();
        const nextPicName = String(
            ('pic_name' in updates ? updates.pic_name : existing.pic_name) || ''
        ).trim();

        if (!nextEmployeeName || !nextLeaveType || !nextStartDate || !nextEndDate || !nextPicName) {
            return NextResponse.json({
                error: 'employee_name, leave_type, start_date, end_date, and pic_name are required',
            }, { status: 400 });
        }
        if (new Date(`${nextEndDate}T00:00:00Z`) < new Date(`${nextStartDate}T00:00:00Z`)) {
            return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
        }

        if (isHCManager && 'station_id' in body) {
            updates.station_id = body.station_id || null;
        }

        const { error } = await supabaseAdmin
            .from('hc_leave_records')
            .update(updates)
            .eq('id', id);

        if (error) {
            throw error;
        }

        await syncHCLeaveBackup().catch((backupError) => {
            console.warn('[HC Leave API] Backup sync failed after update:', backupError);
        });

        const records = await fetchHCLeaveRecordsForBackup();
        const updated = records.find((record) => record.id === id);

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[HC Leave API] Failed to update record:', error);
        return NextResponse.json({ error: 'Failed to update HC leave record' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const existing = await getRecord(id);
        if (existing.is_deleted) {
            return NextResponse.json({ error: 'Record already archived' }, { status: 404 });
        }
        if (!canModifyRecord(user, existing)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('hc_leave_records')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            throw error;
        }

        await syncHCLeaveBackup().catch((backupError) => {
            console.warn('[HC Leave API] Backup sync failed after delete:', backupError);
        });

        return NextResponse.json({ success: true, archived: true });
    } catch (error) {
        console.error('[HC Leave API] Failed to archive record:', error);
        return NextResponse.json({ error: 'Failed to archive HC leave record' }, { status: 500 });
    }
}
