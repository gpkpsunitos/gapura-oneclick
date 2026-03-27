import { NextResponse } from 'next/server';
import { buildHCLeaveWorkbook, fetchHCLeaveRecordsForBackup } from '@/lib/services/hc-leave-backup';
import { canManageHCWorkspace, getWorkspaceUser } from '@/lib/server/workspace-auth';
import type { HCLeaveRecord } from '@/types';

function matchesMonth(record: HCLeaveRecord, month: string | null) {
    if (!month) return true;
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(monthStart.getTime())) return true;
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 23, 59, 59));
    const recordStart = new Date(`${record.start_date}T00:00:00Z`);
    const recordEnd = new Date(`${record.end_date}T23:59:59Z`);
    return recordStart <= monthEnd && recordEnd >= monthStart;
}

function isRecordActiveOnDate(record: HCLeaveRecord, currentDate: string) {
    return record.start_date <= currentDate && record.end_date >= currentDate;
}

export async function GET(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!canManageHCWorkspace(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const url = new URL(request.url);
        const month = url.searchParams.get('month');
        const stationId = url.searchParams.get('station_id');
        const leaveType = url.searchParams.get('leave_type');
        const submissionStatus = url.searchParams.get('submission_status');
        const activityScope = url.searchParams.get('activity_scope');
        const currentDate = new Date().toISOString().slice(0, 10);

        const records = (await fetchHCLeaveRecordsForBackup()).filter((record) => {
            if (!matchesMonth(record, month)) return false;
            if (stationId && record.station_id !== stationId) return false;
            if (leaveType && record.leave_type !== leaveType) return false;
            if (submissionStatus && record.submission_status !== submissionStatus) return false;
            if (activityScope === 'active_today' && !isRecordActiveOnDate(record, currentDate)) return false;
            return true;
        });

        const buffer = buildHCLeaveWorkbook(records);
        const filename = `hc-leave-records-${new Date().toISOString().slice(0, 10)}.xlsx`;

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[HC Leave Export] Failed to export records:', error);
        return NextResponse.json({ error: 'Failed to export HC leave records' }, { status: 500 });
    }
}
