import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getGoogleSheets } from '@/lib/google-sheets';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { HCLeaveLetterStatus, HCLeaveRecord, HCLeaveSubmissionStatus } from '@/types';

const HC_LEAVE_BACKUP_PATH = '/tmp/gapura-hc-leave-records.xlsx';
const HC_LEAVE_SHEET_NAME = 'HC_LEAVE_RECORDS';
const SPREADSHEET_ID = process.env.HC_SHEETS || process.env.NEXT_PUBLIC_HC_SHEETS;

interface HCLeaveRecordRow {
    id: string;
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    submission_status?: HCLeaveSubmissionStatus | null;
    station_id?: string | null;
    division_name?: string | null;
    unit_name?: string | null;
    pic_name?: string | null;
    pic_email?: string | null;
    pic_phone?: string | null;
    e_letter_status: HCLeaveLetterStatus;
    notes?: string | null;
    created_by: string;
    updated_by?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    review_notes?: string | null;
    is_deleted?: boolean | null;
    deleted_at?: string | null;
    deleted_by?: string | null;
    created_at: string;
    updated_at: string;
}

const HEADERS = [
    'ID',
    'Employee Name',
    'Leave Type',
    'Start Date',
    'End Date',
    'Submission Status',
    'Station Code',
    'Station Name',
    'Division',
    'Unit',
    'PIC / PH',
    'PIC Email',
    'PIC Phone',
    'E-Letter Status',
    'Notes',
    'Review Notes',
    'Reviewed By',
    'Reviewed At',
    'Created By',
    'Created At',
    'Updated At',
] as const;

export async function fetchHCLeaveRecordsForBackup(options?: { includeDeleted?: boolean }): Promise<HCLeaveRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('hc_leave_records')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) {
        throw error;
    }

    const rows = (data || []) as HCLeaveRecordRow[];
    const activeRows = options?.includeDeleted ? rows : rows.filter((row) => !row.is_deleted);
    const stationIds = [...new Set(activeRows.map((row) => row.station_id).filter(Boolean))];
    const createdByIds = [...new Set(activeRows.map((row) => row.created_by).filter(Boolean))];
    const reviewedByIds = [...new Set(activeRows.map((row) => row.reviewed_by).filter(Boolean))];
    const userIds = [...new Set([...createdByIds, ...reviewedByIds])];

    const [stationsResult, creatorsResult] = await Promise.all([
        stationIds.length
            ? supabaseAdmin
                .from('stations')
                .select('id, code, name')
                .in('id', stationIds)
            : Promise.resolve({ data: [], error: null }),
        userIds.length
            ? supabaseAdmin
                .from('users')
                .select('id, full_name')
                .in('id', userIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (stationsResult.error) {
        throw stationsResult.error;
    }

    if (creatorsResult.error) {
        throw creatorsResult.error;
    }

    const stationById = new Map(
        (stationsResult.data || []).map((station) => [station.id, station])
    );
    const creatorById = new Map(
        (creatorsResult.data || []).map((creator) => [creator.id, creator])
    );

    return activeRows.map((row) => {
        const station = row.station_id ? stationById.get(row.station_id) : null;
        const createdBy = row.created_by ? creatorById.get(row.created_by) : null;
        const reviewedBy = row.reviewed_by ? creatorById.get(row.reviewed_by) : null;
        return {
            id: row.id,
            employee_name: row.employee_name,
            leave_type: row.leave_type,
            start_date: row.start_date,
            end_date: row.end_date,
            submission_status: row.submission_status || 'PENDING',
            station_id: row.station_id,
            division_name: row.division_name,
            unit_name: row.unit_name,
            pic_name: row.pic_name,
            pic_email: row.pic_email,
            pic_phone: row.pic_phone,
            e_letter_status: row.e_letter_status,
            notes: row.notes,
            created_by: row.created_by,
            updated_by: row.updated_by,
            reviewed_by: row.reviewed_by,
            reviewed_by_name: reviewedBy?.full_name || null,
            reviewed_at: row.reviewed_at,
            review_notes: row.review_notes,
            is_deleted: row.is_deleted || false,
            deleted_at: row.deleted_at,
            deleted_by: row.deleted_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
            created_by_name: createdBy?.full_name || null,
            station: station ? {
                id: station.id,
                code: station.code,
                name: station.name,
            } : null,
        } satisfies HCLeaveRecord;
    });
}

function toWorksheetRows(records: HCLeaveRecord[]): string[][] {
    return [
        [...HEADERS],
        ...records.map((record) => [
            record.id,
            record.employee_name,
            record.leave_type,
            record.start_date,
            record.end_date,
            record.submission_status,
            record.station?.code || '',
            record.station?.name || '',
            record.division_name || '',
            record.unit_name || '',
            record.pic_name || '',
            record.pic_email || '',
            record.pic_phone || '',
            record.e_letter_status,
            record.notes || '',
            record.review_notes || '',
            record.reviewed_by_name || '',
            record.reviewed_at || '',
            record.created_by_name || record.created_by,
            record.created_at,
            record.updated_at,
        ]),
    ];
}

export function buildHCLeaveWorkbook(records: HCLeaveRecord[]): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(toWorksheetRows(records));
    ws['!cols'] = [
        { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
        { wch: 18 }, { wch: 10 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 40 },
        { wch: 36 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 22 },
        { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, HC_LEAVE_SHEET_NAME);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function ensureSheetExists() {
    if (!SPREADSHEET_ID) return null;

    const sheets = await getGoogleSheets();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheet = (spreadsheet.data.sheets || []).find(
        (sheet) => sheet.properties?.title === HC_LEAVE_SHEET_NAME
    );

    if (existingSheet?.properties?.sheetId !== undefined) {
        return {
            sheets,
            sheetId: existingSheet.properties.sheetId,
        };
    }

    const created = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: HC_LEAVE_SHEET_NAME,
                        },
                    },
                },
            ],
        },
    });

    const newSheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId;
    return {
        sheets,
        sheetId: newSheetId ?? null,
    };
}

async function syncHCLeaveRecordsToGoogleSheet(records: HCLeaveRecord[]) {
    if (!SPREADSHEET_ID) return;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !privateKey) return;

    const sheetInfo = await ensureSheetExists();
    if (!sheetInfo) return;

    const rows = toWorksheetRows(records);
    await sheetInfo.sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${HC_LEAVE_SHEET_NAME}!A:U`,
    });
    await sheetInfo.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${HC_LEAVE_SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: rows,
        },
    });
}

async function writeLocalBackup(records: HCLeaveRecord[]) {
    const buffer = buildHCLeaveWorkbook(records);
    await fs.mkdir(path.dirname(HC_LEAVE_BACKUP_PATH), { recursive: true });
    await fs.writeFile(HC_LEAVE_BACKUP_PATH, buffer);
}

export async function syncHCLeaveBackup(): Promise<void> {
    const records = await fetchHCLeaveRecordsForBackup();
    await writeLocalBackup(records);
    try {
        await syncHCLeaveRecordsToGoogleSheet(records);
    } catch (error) {
        console.warn('[HC Leave Backup] Google Sheets sync failed, local spreadsheet backup still updated:', error);
    }
}

export { HC_LEAVE_BACKUP_PATH };
