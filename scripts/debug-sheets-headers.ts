import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (PRIVATE_KEY) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

async function debugSheets() {
  if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error('Missing Google Sheets credentials');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const metaRsp = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    
    console.log("SHEETS AVAILABLE:");
    const sheetTitles = metaRsp.data.sheets?.map(s => s.properties?.title) || [];
    console.log(sheetTitles.join('\n'));

    for (const title of sheetTitles) {
      if (!title) continue;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${title}'!1:1`, 
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        console.log(`\n\nHeaders in ${title}:`);
        rows[0].forEach((header, index) => {
          console.log(`${index}: ${header}`);
        });
      }
    }

  } catch (error) {
    console.error('Error fetching sheet data:', error);
  }
}

debugSheets();
