import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function debugSchema() {
  console.log('--- DEBUG GOOGLE SHEETS SCHEMA ---');
  console.log('Sheet ID:', SHEET_ID);

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials.');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const ranges = ['NON CARGO!1:1', 'CGO!1:1'];

  for (const range of ranges) {
    try {
      console.log(`\nFetching headers for: ${range}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID!,
        range: range,
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        console.log('Headers found:');
        rows[0].forEach((header, index) => {
          console.log(`${index + 1}. "${header}"`);
        });
      } else {
        console.log('No headers found in this range.');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`Error fetching range ${range}:`, error.message);
    }
  }
}

debugSchema().catch(console.error);
