import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/google-sheets';

interface JoumpaRecord {
  timestamp: string;
  email: string;
  date: string;
  airlines: string;
  flightNumber: string;
  branch: string;
  serviceType: string;
  category: string;
  evidence: string;
  report: string;
  reportBy: string;
  satisfactionRating: string;
  averageRating: string;
}

const JOUMPA_SHEET_ID = process.env.JOUMPA_SHEET_ID;
const SHEET_NAME = 'Form Responses 1';

const HEADER_MAP: Record<string, keyof JoumpaRecord> = {
  'timestamp': 'timestamp',
  'email address': 'email',
  'date of event': 'date',
  'airlines': 'airlines',
  'flight number': 'flightNumber',
  'branch (cth: cgk, upg, dps)': 'branch',
  'joumpa service type': 'serviceType',
  'category report': 'category',
  'report by': 'reportBy',
  'rating rata-rata': 'averageRating',
};

// Complexity: Time O(n) | Space O(n) where n = row count
function parseRows(headers: string[], rows: string[][]): JoumpaRecord[] {
  const colMap = new Map<keyof JoumpaRecord, number>();

  headers.forEach((h, idx) => {
    const normalized = h.trim().toLowerCase();
    const mapped = HEADER_MAP[normalized];
    if (mapped) {
      colMap.set(mapped, idx);
      return;
    }
    if (normalized.startsWith('supporting evidence')) colMap.set('evidence', idx);
    if (normalized.startsWith('detailed report')) colMap.set('report', idx);
    if (normalized.startsWith('based on the passenger')) colMap.set('satisfactionRating', idx);
  });

  return rows.map(row => {
    const record: Partial<JoumpaRecord> = {};
    colMap.forEach((colIdx, field) => {
      record[field] = (row[colIdx] ?? '').toString().trim();
    });
    return record as JoumpaRecord;
  });
}

// Complexity: Time O(n) | Space O(1) per filter check
function applyFilters(records: JoumpaRecord[], params: URLSearchParams): JoumpaRecord[] {
  const serviceType = params.get('service_type');
  const airlines = params.get('airlines');
  const category = params.get('category');
  const branch = params.get('branch');

  if (!serviceType && !airlines && !category && !branch) return records;

  return records.filter(r => {
    if (serviceType && r.serviceType !== serviceType) return false;
    if (airlines && r.airlines !== airlines) return false;
    if (category && r.category !== category) return false;
    if (branch && r.branch !== branch) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!JOUMPA_SHEET_ID) {
      return NextResponse.json(
        { error: 'JOUMPA_SHEET_ID is not configured' },
        { status: 500 }
      );
    }

    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: JOUMPA_SHEET_ID,
      range: `${SHEET_NAME}!A1:Z`,
    });

    const allValues = response.data.values || [];
    if (allValues.length === 0) {
      return NextResponse.json({ records: [], total: 0 });
    }

    const headers = allValues[0].map((h: string) => String(h).trim());
    const dataRows = allValues.slice(1).filter(row => row.some(cell => cell?.toString().trim()));
    const records = parseRows(headers, dataRows);

    const { searchParams } = new URL(request.url);
    const filtered = applyFilters(records, searchParams);

    return NextResponse.json(
      { records: filtered, total: filtered.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[JOUMPA API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
