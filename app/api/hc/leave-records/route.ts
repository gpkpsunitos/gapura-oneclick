/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengelola rekam cuti (leave records) HC
 */

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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^08\d{8,11}$/;

/**
 * Mengecek apakah rekaman cuti cocok dengan bulan yang ditentukan
 * 
 * @param record - Rekaman cuti yang akan dicek
 * @param month - Bulan dalam format YYYY-MM atau null untuk semua bulan
 * @returns boolean - true jika rekaman cocok dengan bulan
 */
function matchesMonth(record: HCLeaveRecord, month: string | null) {
    if (!month) return true;
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(monthStart.getTime())) return true;
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0, 23, 59, 59));
    const recordStart = new Date(`${record.start_date}T00:00:00Z`);
    const recordEnd = new Date(`${record.end_date}T23:59:59Z`);
    return recordStart <= monthEnd && recordEnd >= monthStart;
}

/**
 * Mengecek apakah rekaman cuti aktif pada tanggal tertentu
 * 
 * @param record - Rekaman cuti yang akan dicek
 * @param currentDate - Tanggal dalam format YYYY-MM-DD
 * @returns boolean - true jika rekaman aktif pada tanggal tersebut
 */
function isRecordActiveOnDate(record: HCLeaveRecord, currentDate: string) {
    return record.start_date <= currentDate && record.end_date >= currentDate;
}

/**
 * Mengecek apakah pengguna dapat membaca rekaman cuti
 * 
 * @param user - Data pengguna
 * @param record - Rekaman cuti yang akan dicek
 * @returns boolean - true jika pengguna dapat membaca rekaman
 */
function canReadRecord(user: NonNullable<Awaited<ReturnType<typeof getWorkspaceUser>>>, record: HCLeaveRecord) {
    if (canManageHCWorkspace(user.role)) return true;
    const role = normalizeRole(user.role);
    if (role === 'MANAGER_CABANG') return Boolean(user.station_id) && user.station_id === record.station_id;
    if (role === 'STAFF_CABANG') return record.created_by === user.id;
    return false;
}

/**
 * Menerapkan filter pada daftar rekaman cuti berdasarkan parameter query
 * 
 * @param records - Daftar rekaman cuti yang akan difilter
 * @param searchParams - Parameter query dari URL request
 * @returns HCLeaveRecord[] - Daftar rekaman yang telah difilter
 */
function applyFilters(records: HCLeaveRecord[], searchParams: URLSearchParams) {
    const month = searchParams.get('month');
    const stationId = searchParams.get('station_id');
    const leaveType = searchParams.get('leave_type');
    const submissionStatus = searchParams.get('submission_status');
    const activityScope = searchParams.get('activity_scope');
    const archiveScope = searchParams.get('archive_scope') || 'active';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const currentDate = new Date().toISOString().slice(0, 10);

    return records.filter((record) => {
        if (archiveScope === 'archived' && !record.is_deleted) return false;
        if (archiveScope !== 'archived' && record.is_deleted) return false;
        if (!matchesMonth(record, month)) return false;
        if (stationId && record.station_id !== stationId) return false;
        if (leaveType && record.leave_type !== leaveType) return false;
        if (submissionStatus && record.submission_status !== submissionStatus) return false;
        if (activityScope === 'active_today' && !isRecordActiveOnDate(record, currentDate)) return false;
        if (!search) return true;

        return [
            record.employee_name,
            record.employee_email,
            record.employee_phone,
            record.leave_type,
            record.station?.code,
            record.station?.name,
            record.division_name,
            record.unit_name,
            record.pic_name,
            record.pic_email,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
    });
}

/**
 * GET /api/hc/leave-records
 * 
 * Mengambil semua rekaman cuti yang dapat diakses oleh pengguna
 * Mendukung filter berbagai parameter termasuk arsip, bulan, cabang, tipe cuti, dll.
 * 
 * @param request - Objek request HTTP dengan query parameters
 * @returns Promise<NextResponse> - Response JSON berisi daftar rekaman cuti yang difilter atau error
 * @throws Mengembalikan 401 jika tidak terautentikasi
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function GET(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const archiveScope = url.searchParams.get('archive_scope') || 'active';
        const records = await fetchHCLeaveRecordsForBackup({ includeDeleted: archiveScope === 'archived' });
        const visibleRecords = records.filter((record) => canReadRecord(user, record));

        return NextResponse.json(applyFilters(visibleRecords, url.searchParams), {
            headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
        });
    } catch (error) {
        console.error('[HC Leave API] Failed to fetch records:', error);
        return NextResponse.json({ error: 'Failed to fetch HC leave records' }, { status: 500 });
    }
}

/**
 * POST /api/hc/leave-records
 * 
 * Membuat rekaman cuti baru
 * HC Manager dan Staff Cabang dapat membuat rekaman
 * Manager Cabang tidak dapat membuat rekaman
 * 
 * @param request - Objek request HTTP dengan body berisi data rekaman cuti
 * @returns Promise<NextResponse> - Response JSON berisi rekaman yang dibuat atau error
 * @throws Mengembalikan 401 jika tidak terautentikasi
 * @throws Mengembalikan 403 jika role tidak memiliki izin
 * @throws Mengembalikan 400 jika data tidak valid
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function POST(request: Request) {
    try {
        const user = await getWorkspaceUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = normalizeRole(user.role);
        if (role === 'MANAGER_CABANG') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!canManageHCWorkspace(role) && role !== 'STAFF_CABANG') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const employeeName = String(body.employee_name || '').trim();
        const employeeEmail = String(body.employee_email || '').trim().toLowerCase();
        const employeePhone = String(body.employee_phone || '').trim();
        const leaveType = String(body.leave_type || '').trim();
        const startDate = String(body.start_date || '').trim();
        const endDate = String(body.end_date || '').trim();
        const picName = String(body.pic_name || '').trim();
        const picEmail = String(body.pic_email || '').trim().toLowerCase();
        const picPhone = String(body.pic_phone || '').trim();

        if (!employeeName || !employeeEmail || !employeePhone || !leaveType || !startDate || !endDate || !picName || !picEmail || !picPhone) {
            return NextResponse.json({
                error: 'employee_name, employee_email, employee_phone, leave_type, start_date, end_date, pic_name, pic_email, and pic_phone are required',
            }, { status: 400 });
        }
        if (new Date(`${endDate}T00:00:00Z`) < new Date(`${startDate}T00:00:00Z`)) {
            return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
        }
        if (!EMAIL_REGEX.test(employeeEmail)) {
            return NextResponse.json({ error: 'employee_email format is invalid' }, { status: 400 });
        }
        if (!PHONE_REGEX.test(employeePhone)) {
            return NextResponse.json({ error: 'employee_phone must be an active Indonesian mobile number' }, { status: 400 });
        }
        if (!EMAIL_REGEX.test(picEmail)) {
            return NextResponse.json({ error: 'pic_email format is invalid' }, { status: 400 });
        }
        if (!PHONE_REGEX.test(picPhone)) {
            return NextResponse.json({ error: 'pic_phone must be an active Indonesian mobile number' }, { status: 400 });
        }

        const stationId = role === 'STAFF_CABANG'
            ? user.station_id
            : (body.station_id || null);
        const requestedSubmissionStatus = String(body.submission_status || '').trim().toUpperCase() as HCLeaveSubmissionStatus;
        const submissionStatus = role === 'MANAGER_CABANG' && SUBMISSION_STATUS_VALUES.includes(requestedSubmissionStatus)
            ? requestedSubmissionStatus
            : 'PENDING';

        if (role === 'STAFF_CABANG' && !stationId) {
            return NextResponse.json({ error: 'Branch user is missing station_id' }, { status: 400 });
        }

        const insertPayload = {
            employee_name: employeeName,
            employee_email: employeeEmail,
            employee_phone: employeePhone,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            submission_status: submissionStatus,
            station_id: stationId,
            division_name: body.division_name ? String(body.division_name).trim() : null,
            unit_name: body.unit_name ? String(body.unit_name).trim() : null,
            pic_name: picName,
            pic_email: picEmail,
            pic_phone: picPhone,
            notes: body.notes ? String(body.notes).trim() : null,
            created_by: user.id,
            updated_by: user.id,
            reviewed_by: submissionStatus === 'PENDING' ? null : user.id,
            reviewed_at: submissionStatus === 'PENDING' ? null : new Date().toISOString(),
            review_notes: submissionStatus === 'REJECTED' && body.review_notes
                ? String(body.review_notes).trim()
                : null,
        };

        const { data, error } = await supabaseAdmin
            .from('hc_leave_records')
            .insert(insertPayload)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        await syncHCLeaveBackup().catch((backupError) => {
            console.warn('[HC Leave API] Backup sync failed after create:', backupError);
        });

        const records = await fetchHCLeaveRecordsForBackup();
        const createdRecord = records.find((record) => record.id === data.id);

        return NextResponse.json(createdRecord, { status: 201 });
    } catch (error) {
        console.error('[HC Leave API] Failed to create record:', error);
        return NextResponse.json({ error: 'Failed to create HC leave record' }, { status: 500 });
    }
}
