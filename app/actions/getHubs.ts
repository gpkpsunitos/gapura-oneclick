'use server';

import { getGoogleSheets } from '@/lib/google-sheets';

export async function getAvailableHubs() {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not defined');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HUB!C:C', // Assuming hubs are in column C
    });

    const rows = response.data.values || [];
    
    // Filter headers and empty rows
    const hubs = rows
      .map((row) => row[0])
      .filter(Boolean)
      .filter((hub) => hub !== 'HUB' && hub !== 'KODE HUB' && hub !== 'Branch');

    // Deduplicate
    const uniqueHubs = Array.from(new Set(hubs));
    return uniqueHubs.sort();
  } catch (error) {
    console.error('Failed to fetch HUBs:', error);
    return [];
  }
}
