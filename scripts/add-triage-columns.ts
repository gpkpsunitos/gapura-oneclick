
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';
const REPORT_SHEETS = ['NON CARGO', 'CGO'];

// Columns to ensure exist
const TRIAGE_COLUMNS = ['Primary Tag', 'Sub Category Note', 'ESKLASI DIVISI'];

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('Missing credentials');
  return new google.auth.JWT({ email, key: privateKey, scopes: SCOPES });
}

async function main() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`Checking Spreadsheet: ${SHEET_ID}`);

  for (const sheetName of REPORT_SHEETS) {
    console.log(`\nProcessing Sheet: ${sheetName}`);
    
    // 1. Get current headers (Row 1)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${sheetName}'!1:1`,
    });

    const currentHeaders = res.data.values?.[0] || [];
    console.log(`Current Headers (${currentHeaders.length}):`, currentHeaders);

    // 2. Identify missing columns
    const missingColumns = TRIAGE_COLUMNS.filter(col => !currentHeaders.includes(col));

    if (missingColumns.length === 0) {
      console.log('✅ All triage columns already exist.');
      continue;
    }

    console.log('⚠️ Missing Columns:', missingColumns);

    // 3. Append missing columns - RESIZE GRID FIRST
    const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        ranges: [sheetName]
    });
    
    const sheetId = sheetMetadata.data.sheets?.[0]?.properties?.sheetId;
    if (sheetId === undefined) {
        console.error(`Could not find sheetId for ${sheetName}`);
        continue;
    }

    console.log(`Resizing sheet (ID: ${sheetId}) to add ${missingColumns.length} columns...`);
    
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests: [{
                appendDimension: {
                    sheetId: sheetId,
                    dimension: 'COLUMNS',
                    length: missingColumns.length
                }
            }]
        }
    });

    // 4. Update Header Values
    const startColIndex = currentHeaders.length;
    function getColLetter(index: number) {
        let temp, letter = '';
        while (index >= 0) {
            temp = index % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            index = (index - temp - 1) / 26;
        }
        return letter;
    }
    
    const startCol = getColLetter(startColIndex);
    const endCol = getColLetter(startColIndex + missingColumns.length - 1);
    const range = `'${sheetName}'!${startCol}1:${endCol}1`;

    console.log(`Adding columns at ${range}...`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [missingColumns]
      }
    });

    console.log('✅ Columns added successfully.');
  }
}

main().catch(console.error);
