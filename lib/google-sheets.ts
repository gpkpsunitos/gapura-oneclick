/**
 * @file
 * 
 * File ini berisi fungsi untuk berinteraksi dengan Google Sheets API
 */

import 'server-only';
import { google } from 'googleapis';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Singleton instance to prevent memory leaks from multiple Auth clients
let authClient: any = null;

/**
 * Mendapatkan autentikasi Google Service Account
 * Menggunakan pattern singleton untuk mencegah kebocoran memori
 * @returns {any} Objek autentikasi JWT Google
 * @throws {Error} Jika kredensial tidak ditemukan
 * @example
 * ```ts
 * const auth = getGoogleAuth();
 * const sheets = google.sheets({ version: 'v4', auth });
 * ```
 */
export function getGoogleAuth() {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  authClient = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return authClient;
}

/**
 * Mendapatkan client Google Sheets yang sudah terautentikasi
 * @async
 * @returns {Promise<any>} Client Google Sheets API v4
 * @example
 * ```ts
 * const sheets = await getGoogleSheets();
 * const response = await sheets.spreadsheets.values.get({
 *   spreadsheetId: '...',
 *   range: 'Sheet1!A1:Z100'
 * });
 * ```
 */
export async function getGoogleSheets() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}
