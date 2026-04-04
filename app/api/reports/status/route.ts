/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengecek status terakhir update data laporan
 */

import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

/**
 * GET /api/reports/status
 * 
 * Mengambil informasi terakhir kali data laporan diperbarui
 * Digunakan untuk menampilkan status sinkronisasi data di frontend
 * 
 * @returns Promise<NextResponse> - Response JSON berisi timestamp update terakhir atau error
 * @throws Mengembalikan 500 jika terjadi error server
 */
export async function GET() {
  try {
    const lastUpdated = reportsService.getLastUpdated();
    
    return NextResponse.json({
      lastUpdated,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Status API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
