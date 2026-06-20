import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing credentials');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const joId = process.env.JOUMPA_SHEET_ID;
  const goId = process.env.GOOGLE_SHEET_ID;

  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: joId! });
    console.log('JOUMPA SHEETS:', res.data.sheets?.map(s => s.properties?.title));
    if (res.data.sheets?.[0]?.properties?.title) {
        const title = res.data.sheets[0].properties.title;
        const res2 = await sheets.spreadsheets.values.get({ spreadsheetId: joId!, range: `'${title}'!A1:Z1` });
        console.log('JOUMPA HEADERS:', res2.data.values?.[0]);
    }
  } catch(e: any) { console.error('Joumpa Error', e.message); }

  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: goId! });
    console.log('GOOGLE SHEETS:', res.data.sheets?.map(s => s.properties?.title));
    const sheetTitles = res.data.sheets?.map(s => s.properties?.title) || [];
    for (const title of sheetTitles) {
      if (title?.toLowerCase().includes('joumpa') || title?.toLowerCase().includes('feedback')) {
        const res2 = await sheets.spreadsheets.values.get({ spreadsheetId: goId!, range: `'${title}'!A1:Z1` });
        console.log(`GOOGLE [${title}] HEADERS:`, res2.data.values?.[0]);
      }
    }
  } catch(e: any) { console.error('Google Error', e.message); }
}

debug().catch(console.error);
