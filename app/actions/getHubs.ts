/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi server action untuk mengambil daftar hubs dari Google Sheets
 */

'use server';

import { getGoogleSheets } from '@/lib/google-sheets';

/**
 * Mengambil daftar hubs yang tersedia dari Google Sheets
 * Mengambil data dari sheet "HUB" dan memfilter data yang valid
 * @returns Promise<string[]> Array nama hubs yang valid (HUB, KODE HUB, Branch)
 * @throws {Error} Jika terjadi kesalahan saat mengambil data atau GOOGLE_SHEET_ID tidak terdefinisi
 * @example
 * ```typescript
 * const hubs = await getAvailableHubs();
 * console.log(hubs); // ["HUB", "KODE HUB", "CGK", "DPS", ...]
 * ```
 */
export async function getAvailableHubs() {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not defined');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HUB!C', // Assuming hubs are in column C
    });

    const rows = response.data.values || [];

    // Filter headers and empty rows
    const hubs = rows
      .map((row) => row[0])
      .filter((hub) => hub && hub !== 'HUB' && hub !== 'KODE HUB' && hub !== 'Branch');

    // Deduplicate
    const uniqueHubs = Array.from(new Set(hubs));

    return uniqueHubs.sort();
  } catch (error) {
    console.error('Failed to fetch HUBs:', error);
    return [];
  }
}
