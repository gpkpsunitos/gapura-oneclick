import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;

async function run() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  
  const sheetNames = ['NON CARGO', 'CGO'];
  
  const uniqueFields = {};

  for (const sheetName of sheetNames) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    
    const rows = response.data.values || [];
    if (rows.length < 2) continue;
    
    const headers = rows[0].map(h => String(h).trim());
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        headers.forEach((h, colIdx) => {
            if (!uniqueFields[h]) uniqueFields[h] = new Set();
            let val = String(row[colIdx] || '');
            if (val.trim() !== "") {
                uniqueFields[h].add(val); 
            }
         });
    }
  }
  
  const importantFields = [
      'Area', 'Report Category', 'Irregularity/Complain Category', 
      'Branch', 'Reporting Branch', 'Station', 'KODE CABANG (VLOOKUP)',
      'Airlines', 'Maskapai'
  ];

  for (const key of Object.keys(uniqueFields)) {
     if (importantFields.includes(key) && uniqueFields[key].size > 0) {
        console.log(`\n=== UNIQUE VALUES FOR: ${key} ===`);
        console.log(Array.from(uniqueFields[key]).map(v => JSON.stringify(v)).sort().join('\n'));
     }
  }
}

run().catch(console.error);
