import { getGoogleAuth, GOOGLE_SHEET_ID } from './lib/google-sheets'; // Wait, let's just use regular googleapis

import * as dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  const authClient = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return authClient;
}

export async function getGoogleSheets() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

async function verify() {
    const sheets = await getGoogleSheets();
    const sheetId = process.env.GOOGLE_SHEET_ID || '1n0bVEXD9h7v03Q_7REJQuvycGZVhWZI4u1zg1I1fqh8';
    console.log("Fetching meta for", sheetId);
    try {
        const meta = await sheets.spreadsheets.get({
            spreadsheetId: sheetId
        });
        const sheetNames = meta.data.sheets.map((s: any) => s.properties.title);
        console.log("Sheets found:", sheetNames);
        
        for (const sheetName of sheetNames) {
            console.log(`\nFetching ${sheetName}`);
            const data = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${sheetName}!A1:Z5`
            });
            console.log(data.data.values);
        }
    } catch (e) {
        console.error(e);
    }
}

verify();
