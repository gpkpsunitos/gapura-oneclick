/**
 * @file
 * 
 * File ini berisi API route untuk batch import laporan
 * Mendukung import banyak laporan sekaligus dari frontend
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';
import { notifyNewRecordEmail } from '@/lib/notifications';
import { persistReportMetadata } from '@/lib/report-persistence';

/**
 * Menangani request POST untuk batch import laporan
 * Menerima array laporan, menyimpan ke database, dan mengirim notifikasi email
 * @param request - Request object berisi array laporan di body JSON
 * @returns Response JSON dengan status sukses dan informasi jumlah laporan yang berhasil diimport
 * @throws {Error} Jika terjadi kesalahan saat batch import
 * @example
 * ```json
 * {
 *   "reports": [
 *     { "title": "Laporan 1", "description": "Deskripsi 1", ... },
 *     { "title": "Laporan 2", "description": "Deskripsi 2", ... }
 *   ]
 * }
 * ```
 */
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
        const { reports } = body;

        if (!Array.isArray(reports) || reports.length === 0) {
            return NextResponse.json({ error: 'Data laporan tidak valid' }, { status: 400 });
        }

        if (reports.length > 100) {
            return NextResponse.json({ error: 'Maksimal 100 laporan per batch' }, { status: 400 });
        }

        // Add user_id to each report for traceability
        const processedReports = reports.map(r => ({
            ...r,
            user_id: payload.id
        }));

        const createdReports = await reportsService.batchCreateReports(processedReports);

        const persistenceResults = await Promise.allSettled(
            createdReports.map(async (report) => {
                await persistReportMetadata(report, { userId: payload.id });
                await notifyNewRecordEmail(report, 'batch');
            })
        );

        persistenceResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn(`[Batch Reports] Post-create persistence/notification failed for row ${index + 1}:`, result.reason);
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: `${reports.length} laporan berhasil diimport ke Google Sheets`,
            count: createdReports.length
        });
    } catch (error) {
        console.error('Error in batch import:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan saat batch import' }, { status: 500 });
    }
}
