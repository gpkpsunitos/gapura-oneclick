const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

// Define data type detection function
function detectDataType(value) {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  
  const str = String(value).trim();
  
  // Date detection (YYYY-MM-DD, DD/MM/YYYY, etc.)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return 'date';
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) return 'date';
  
  // Email detection
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'email';
  
  // URL detection
  if (/^https?:\/\//.test(str)) return 'url';
  
  // Currency detection
  if (/^[\$€£¥]\s*\d/.test(str)) return 'currency';
  if (/^\d+\.?\d*\s*[\$€£¥]$/.test(str)) return 'currency';
  
  // Number detection
  if (!isNaN(Number(str.replace(/,/g, '')))) return 'number';
  
  return 'text';
}

// Get Google Auth
function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials. Check your .env file.');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
}

async function getGoogleSheets() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetMetadata(sheets, sheetId) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sheet metadata:', error.message);
    throw error;
  }
}

async function getSheetData(sheets, sheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error fetching data for range ${range}:`, error.message);
    return [];
  }
}

function analyzeColumnTypes(data, columnNames) {
  const columnTypes = new Map();
  
  columnNames.forEach((name, index) => {
    columnTypes.set(name, new Set());
  });
  
  // Skip header row, analyze data rows
  for (let i = 1; i < data.length && i <= 100; i++) {
    const row = data[i];
    if (!row) continue;
    
    columnNames.forEach((name, index) => {
      const value = row[index];
      const type = detectDataType(value);
      columnTypes.get(name).add(type);
    });
  }
  
  return columnTypes;
}

function formatDataTypes(types) {
  const typeArray = Array.from(types);
  if (typeArray.length === 1) {
    return typeArray[0];
  }
  if (typeArray.length === 0) {
    return 'unknown';
  }
  return `mixed (${typeArray.join(', ')})`;
}

async function exploreSheet() {
  console.log('='.repeat(80));
  console.log('GOOGLE SHEET EXPLORATION REPORT');
  console.log('='.repeat(80));
  console.log(`\nSheet ID: ${SHEET_ID}`);
  console.log(`Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const sheets = await getGoogleSheets();
  
  // Get sheet metadata (all tabs)
  const metadata = await getSheetMetadata(sheets, SHEET_ID);
  
  console.log(`\nSpreadsheet Title: ${metadata.properties?.title}`);
  console.log(`Total Sheets/Tabs: ${metadata.sheets?.length}`);
  console.log('\n' + '-'.repeat(80));
  
  // Process each sheet/tab
  for (const sheet of metadata.sheets || []) {
    const sheetName = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    const gridProps = sheet.properties?.gridProperties;
    
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`SHEET: "${sheetName}"`);
    console.log(`${'='.repeat(80)}`);
    console.log(`  Sheet ID: ${sheetId}`);
    console.log(`  Row Count: ${gridProps?.rowCount || 'N/A'}`);
    console.log(`  Column Count: ${gridProps?.columnCount || 'N/A'}`);
    console.log(`  Frozen Row Count: ${gridProps?.frozenRowCount || 0}`);
    console.log(`  Frozen Column Count: ${gridProps?.frozenColumnCount || 0}`);
    
    // Fetch first 10 rows of data
    const range = `'${sheetName}'!1:10`;
    const data = await getSheetData(sheets, SHEET_ID, range);
    
    if (data.length === 0) {
      console.log('\n  [No data found in this sheet]');
      continue;
    }
    
    // Extract headers (first row)
    const headers = data[0];
    console.log(`\n--- Column Headers (${headers.length} columns) ---`);
    
    // Analyze data types for each column
    const columnTypes = analyzeColumnTypes(data, headers);
    
    headers.forEach((header, index) => {
      const types = columnTypes.get(header) || new Set(['unknown']);
      console.log(`  ${index + 1}. "${header}" - Type: ${formatDataTypes(types)}`);
    });
    
    // Display sample data (first 5 rows)
    console.log(`\n--- Sample Data (First ${Math.min(data.length - 1, 5)} rows) ---`);
    for (let i = 1; i < data.length && i <= 5; i++) {
      console.log(`\n  Row ${i}:`);
      const row = data[i];
      if (row) {
        headers.forEach((header, index) => {
          const value = row[index] !== undefined ? row[index] : '(empty)';
          // Truncate long values
          const displayValue = String(value).length > 50 
            ? String(value).substring(0, 50) + '...' 
            : value;
          console.log(`    ${header}: ${displayValue}`);
        });
      }
    }
    
    // Summary statistics
    console.log(`\n--- Data Summary ---`);
    console.log(`  Total rows available: ${gridProps?.rowCount || 'N/A'}`);
    console.log(`  Headers found: ${headers.length}`);
    console.log(`  Sample rows displayed: ${Math.min(data.length - 1, 5)}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('EXPLORATION COMPLETE');
  console.log('='.repeat(80));
}

// Run the exploration
exploreSheet().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
