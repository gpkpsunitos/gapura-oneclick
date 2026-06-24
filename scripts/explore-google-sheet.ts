
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectDataType(value: any): string {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';

  const str = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return 'date';
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) return 'date';

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'email';

  if (/^https?:\/\//.test(str)) return 'url';

  if (/^[\$€£¥]\s*\d/.test(str)) return 'currency';
  if (/^\d+\.?\d*\s*[\$€£¥]$/.test(str)) return 'currency';

  if (!isNaN(Number(str.replace(/,/g, '')))) return 'number';

  return 'text';
}

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

async function getGoogleSheets() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSheetMetadata(sheets: any, sheetId: string) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    return response.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching sheet metadata:', error.message);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSheetData(sheets: any, sheetId: string, range: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`Error fetching data for range ${range}:`, error.message);
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function analyzeColumnTypes(data: any[][], columnNames: string[]): Map<string, Set<string>> {
  const columnTypes = new Map<string, Set<string>>();

  columnNames.forEach((name, index) => {
    columnTypes.set(name, new Set<string>());
  });

  for (let i = 1; i < data.length && i <= 100; i++) {
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

async function exploreSheet() {
    const sheets = await getGoogleSheets();
    const metadata = await getSheetMetadata(sheets, SHEET_ID);

    console.log('Available Sheets:');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata.sheets?.forEach((s: any) => {
        console.log(`- ${s.properties?.title} (ID: ${s.properties?.sheetId})`);
    });
}

exploreSheet().catch(console.error);
