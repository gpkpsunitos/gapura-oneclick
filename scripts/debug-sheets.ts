import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';
const SHEETS_TO_DEBUG = ['NON CARGO', 'CGO'];

async function debugSheets() {
  console.log('--- Gapura Sheets Debug Tool ---');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials in .env');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  for (const sheetName of SHEETS_TO_DEBUG) {
    console.log(`\nChecking Sheet: "${sheetName}"`);
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1:AT10`, // Headers + first 10 rows
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in this sheet.');
        continue;
      }

      const headers = rows[0];
      console.log('Headers:', JSON.stringify(headers));
      
      console.log('\nSample Row (Row 2):');
      if (rows[1]) {
        const sampleRow = rows[1];
        const mapped = headers.reduce((acc: any, header, idx) => {
          acc[header] = sampleRow[idx];
          return acc;
        }, {});
        console.log(JSON.stringify(mapped, null, 2));
      }

      // Check categorical values
      const catKeywords = ['category', 'irregularity', 'complain'];
      const catIndices = headers.reduce((acc: number[], h, idx) => {
        if (catKeywords.some(k => h.toLowerCase().includes(k))) acc.push(idx);
        return acc;
      }, []);

      catIndices.forEach(idx => {
        console.log(`\nUnique values for column "${headers[idx]}" (from sample):`);
        const values = Array.from(new Set(rows.slice(1).map(r => r[idx]))).filter(Boolean);
        console.log(values);
      });

      // Check branch values
      const branchKeywords = ['branch', 'cabang', 'station'];
      const branchIndices = headers.reduce((acc: number[], h, idx) => {
        if (branchKeywords.some(k => h.toLowerCase().includes(k))) acc.push(idx);
        return acc;
      }, []);

      branchIndices.forEach(idx => {
        console.log(`\nUnique values for column "${headers[idx]}" (from sample):`);
        const values = Array.from(new Set(rows.slice(1).map(r => r[idx]))).filter(Boolean);
        console.log(values);
      });

    } catch (err: any) {
      console.error(`Error fetching sheet ${sheetName}:`, err.message);
    }
  }
}

debugSheets().catch(console.error);
