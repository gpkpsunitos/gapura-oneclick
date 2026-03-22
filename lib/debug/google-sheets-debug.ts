

import 'server-only';
import { getGoogleSheets } from '@/lib/google-sheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Fetch sample data from Google Sheets for debugging
 * This helps understand the actual data structure
 */
export async function fetchGoogleSheetsSampleData(sheetName: string = 'NON CARGO', rowLimit: number = 10) {
  try {
    const sheets = await getGoogleSheets();
    
    // First, get the headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    
    const headers = headerResponse.data.values?.[0] || [];
    
    // Find important column indices
    const columnIndices = {
      area: headers.findIndex(h => h?.toString().toLowerCase().includes('area')),
      terminal_area: headers.findIndex(h => h?.toString().toLowerCase().includes('terminal')),
      apron_area: headers.findIndex(h => h?.toString().toLowerCase().includes('apron')),
      general_category: headers.findIndex(h => h?.toString().toLowerCase().includes('general')),
      category: headers.findIndex(h => h?.toString().toLowerCase().includes('category') && !h?.toString().toLowerCase().includes('area')),
      status: headers.findIndex(h => h?.toString().toLowerCase().includes('status')),
      severity: headers.findIndex(h => h?.toString().toLowerCase().includes('severity')),
      priority: headers.findIndex(h => h?.toString().toLowerCase().includes('priority')),
      target_division: headers.findIndex(h => h?.toString().toLowerCase().includes('division') || h?.toString().toLowerCase().includes('divisi')),
      root_caused: headers.findIndex(h => h?.toString().toLowerCase().includes('root') || h?.toString().toLowerCase().includes('akar')),
      jenis_maskapai: headers.findIndex(h => h?.toString().toLowerCase().includes('jenis') || h?.toString().toLowerCase().includes('type')),
    };
    
    // Get sample data rows
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!2:${rowLimit + 1}`,
    });
    
    const rows = dataResponse.data.values || [];
    
    // Analyze area data distribution
    const areaStats = {
      totalRows: rows.length,
      withTerminalArea: 0,
      withApronArea: 0,
      withGeneralCategory: 0,
      withArea: 0,
      areaValues: {} as Record<string, number>,
      terminalAreaValues: {} as Record<string, number>,
      apronAreaValues: {} as Record<string, number>,
    };
    
    rows.forEach(row => {
      // Check area column
      if (columnIndices.area >= 0 && row[columnIndices.area]) {
        areaStats.withArea++;
        const area = row[columnIndices.area].toString().trim();
        areaStats.areaValues[area] = (areaStats.areaValues[area] || 0) + 1;
      }
      
      // Check terminal area
      if (columnIndices.terminal_area >= 0 && row[columnIndices.terminal_area]) {
        areaStats.withTerminalArea++;
        const val = row[columnIndices.terminal_area].toString().trim();
        areaStats.terminalAreaValues[val] = (areaStats.terminalAreaValues[val] || 0) + 1;
      }
      
      // Check apron area
      if (columnIndices.apron_area >= 0 && row[columnIndices.apron_area]) {
        areaStats.withApronArea++;
        const val = row[columnIndices.apron_area].toString().trim();
        areaStats.apronAreaValues[val] = (areaStats.apronAreaValues[val] || 0) + 1;
      }
      
      // Check general category
      if (columnIndices.general_category >= 0 && row[columnIndices.general_category]) {
        areaStats.withGeneralCategory++;
      }
    });
    
    return {
      success: true,
      sheetName,
      headers,
      columnIndices,
      sampleRows: rows.slice(0, 5),
      areaStats,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Error fetching Google Sheets sample data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sheetName,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Debug function to check specific column data
 */
export async function debugColumnData(sheetName: string = 'NON CARGO', columnName: string = 'Terminal_Area_Category') {
  try {
    const sheets = await getGoogleSheets();
    
    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);
    
    // Find column index
    const colIndex = headers.findIndex(h => 
      h?.toString().toLowerCase().replace(/[_\s]/g, '') === columnName.toLowerCase().replace(/[_\s]/g, '')
    );
    
    if (colIndex === -1) {
      return {
        success: false,
        error: `Column ${columnName} not found`,
        availableColumns: headers,
      };
    }
    
    // Get unique values and counts
    const valueCounts: Record<string, number> = {};
    let nullCount = 0;
    
    dataRows.forEach(row => {
      const value = row[colIndex];
      if (!value || value.toString().trim() === '') {
        nullCount++;
      } else {
        const key = value.toString().trim();
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }
    });
    
    return {
      success: true,
      sheetName,
      columnName,
      columnIndex: colIndex,
      header: headers[colIndex],
      totalRows: dataRows.length,
      nullCount,
      nonNullCount: dataRows.length - nullCount,
      uniqueValues: Object.keys(valueCounts).length,
      topValues: Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
    
  } catch (error) {
    console.error('Error debugging column data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
