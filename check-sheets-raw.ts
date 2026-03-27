import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkSheets() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const reportId = 'b1ecf2b8-b610-5edb-bbb6-6d188ef3605a';
    
    const sheetsToCheck = ['NON CARGO', 'CGO'];
    
    for (const sheetName of sheetsToCheck) {
        console.log(`\n--- Checking sheet: ${sheetName} ---`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:AZ20`, // Just headers and some rows
        });
        
        const rows = response.data.values || [];
        if (rows.length === 0) continue;
        
        const headers = rows[0].map(h => String(h).trim());
        console.log('ALL HEADERS:', headers.join(' | '));
        
        const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'irrs-id');
        console.log('ID Column Index:', idColIdx);
        
        // Search in the whole sheet if needed
        const fullResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:AZ2000`, 
        });
        const allRows = fullResponse.data.values || [];
        const rowIndex = allRows.findIndex(row => row.some(cell => String(cell).includes(reportId) || String(cell).includes('1772924164505')));
        
        if (rowIndex !== -1) {
            console.log(`FOUND at row ${rowIndex + 1}`);
            console.log('Row content:', JSON.stringify(allRows[rowIndex]));
            return;
        }
    }
    
    console.log('\nNot found.');
}

checkSheets().catch(console.error);
