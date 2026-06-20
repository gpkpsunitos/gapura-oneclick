/**
 * @file
 * 
 * File ini berisi skrip untuk mengeksplorasi struktur dan tipe data di Google Sheets
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

/**
 * Mendeteksi tipe data dari nilai yang diberikan
 * @param {any} value - Nilai yang akan dideteksi tipenya
 * @returns {string} Tipe data (empty, number, boolean, date, email, url, currency, text)
 */
function detectDataType(value: any): string {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  
  const str = String(value).trim();
  
  // Date detection (YYYY-MM-DD, DD/MM/YYYY, etc.)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return 'date';
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) return 'date';
  
  // Email detection
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'email';
  
  // URL detection
  if (/^https?:\/\//.test(str)) return 'url';
  
  // Currency detection
  if (/^[\$€£¥]\s*\d/.test(str)) return 'currency';
  if (/^\d+\.?\d*\s*[\$€£¥]$/.test(str)) return 'currency';
  
  // Number detection
  if (!isNaN(Number(str.replace(/,/g, '')))) return 'number';
  
  return 'text';
}

/**
 * Mendapatkan autentikasi Google Service Account
 * @returns {any} Objek autentikasi JWT Google
 * @throws {Error} Jika kredensial Google Service Account tidak ditemukan
 */
function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials. Check your .env file.');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
}

/**
 * Mendapatkan client Google Sheets yang sudah terautentikasi
 * @async
 * @returns {Promise<any>} Client Google Sheets API
 */
async function getGoogleSheets() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Mendapatkan metadata spreadsheet Google Sheets
 * @async
 * @param {any} sheets - Client Google Sheets API
 * @param {string} sheetId - ID spreadsheet
 * @returns {Promise<any>} Data metadata spreadsheet
 * @throws {Error} Jika gagal mengambil metadata
 */
async function getSheetMetadata(sheets: any, sheetId: string) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching sheet metadata:', error.message);
    throw error;
  }
}

/**
 * Mendapatkan data dari range tertentu di Google Sheets
 * @async
 * @param {any} sheets - Client Google Sheets API
 * @param {string} sheetId - ID spreadsheet
 * @param {string} range - Range sel yang akan diambil
 * @returns {Promise<any[][]>} Array nilai sel
 */
async function getSheetData(sheets: any, sheetId: string, range: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values || [];
  } catch (error: any) {
    console.error(`Error fetching data for range ${range}:`, error.message);
    return [];
  }
}

/**
 * Menganalisis tipe data untuk setiap kolom berdasarkan data yang tersedia
 * @param {any[][]} data - Array data dari Google Sheets
 * @param {string[]} columnNames - Nama-nama kolom
 * @returns {Map<string, Set<string>>} Map nama kolom ke set tipe data yang ditemukan
 */
function analyzeColumnTypes(data: any[][], columnNames: string[]): Map<string, Set<string>> {
  const columnTypes = new Map<string, Set<string>>();
  
  columnNames.forEach((name, index) => {
    columnTypes.set(name, new Set<string>());
  });
  
  // Skip header row, analyze data rows
  for (let i = 1; i < data.length && i <= 100; i++) { // Limit to first 100 data rows
    const row = data[i];
    if (!row) continue;
    
    columnNames.forEach((name, index) => {
      const value = row[index];
      const type = detectDataType(value);
      columnTypes.get(name)?.add(type);
    });
  }
  
  return columnTypes;
}

/**
 * Memformat set tipe data menjadi string yang mudah dibaca
 * @param {Set<string>} types - Set tipe data
 * @returns {string} String yang diformat
 */
function formatDataTypes(types: Set<string>): string {
  const typeArray = Array.from(types);
  if (typeArray.length === 1) {
    return typeArray[0];
  }
  if (typeArray.length === 0) {
    return 'unknown';
  }
  return `mixed (${typeArray.join(', ')})`;
}

/**
 * Mengeksplorasi Google Sheets dan menampilkan daftar sheet yang tersedia
 * @async
 * @returns {Promise<void>}
 */
async function exploreSheet() {
    const sheets = await getGoogleSheets();
    const metadata = await getSheetMetadata(sheets, SHEET_ID);

    // Just print sheet names
    console.log('Available Sheets:');
    metadata.sheets?.forEach((s: any) => {
        console.log(`- ${s.properties?.title} (ID: ${s.properties?.sheetId})`);
    });
}

exploreSheet().catch(console.error);
