
import { fetchGoogleSheetsSampleData, debugColumnData } from './lib/debug/google-sheets-debug';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('--- Debugging Google Sheets Data ---');
  
  const sheetName = 'NON CARGO';
  console.log(`\nAnalyzing Sheet: ${sheetName}`);
  
  const sampleData = await fetchGoogleSheetsSampleData(sheetName, 20);
  console.log('\nHeaders found:', sampleData.headers);
  console.log('\nColumn Indices:', sampleData.columnIndices);
  console.log('\nArea Stats:', JSON.stringify(sampleData.areaStats, null, 2));
  
  console.log('\n--- Debugging Specific Columns ---');
  
  const columnsToDebug = ['Terminal Area Category', 'Apron Area Category', 'General Category', 'Area'];
  
  for (const col of columnsToDebug) {
    const debug = await debugColumnData(sheetName, col);
    if (debug.success) {
      console.log(`\nColumn: ${col}`);
      console.log(`Header Index: ${debug.columnIndex}`);
      console.log(`Total Rows: ${debug.totalRows}`);
      console.log(`Null Count: ${debug.nullCount}`);
      console.log(`Top Values:`, JSON.stringify(debug.topValues, null, 2));
    } else {
      console.log(`\nColumn: ${col} - FAILED: ${debug.error}`);
    }
  }

  const cgoSheet = 'CGO';
  console.log(`\nAnalyzing Sheet: ${cgoSheet}`);
  const sampleDataCgo = await fetchGoogleSheetsSampleData(cgoSheet, 20);
  console.log('\nHeaders found (CGO):', sampleDataCgo.headers);
  console.log('\nArea Stats (CGO):', JSON.stringify(sampleDataCgo.areaStats, null, 2));
}

main().catch(console.error);
