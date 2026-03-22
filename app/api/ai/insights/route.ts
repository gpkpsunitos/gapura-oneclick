import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { callGroqAI, type GroqMessage } from '@/lib/ai/groq';
import { getGoogleSheets } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const REPORT_SHEETS = ['NON CARGO', 'CGO'];

interface InsightFilters {
  dateFrom?: string;
  dateTo?: string;
  hubs?: string[];
  branches?: string[];
  airlines?: string[];
  categories?: string[];
  source?: 'all' | 'NON CARGO' | 'CGO';
}

// Fetches raw data from Google Sheets, applies filters, returns structured rows
// Complexity: Time O(n) per sheet | Space O(n)
async function fetchFilteredSheetData(filters: InsightFilters): Promise<{
  rows: Record<string, string>[];
  headers: string[];
  sheetName: string;
}[]> {
  const sheets = await getGoogleSheets();
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

  const sheetsToFetch =
    filters.source && filters.source !== 'all'
      ? [filters.source, 'HUB']
      : [...REPORT_SHEETS, 'HUB'];

  const results = await Promise.all(
    sheetsToFetch.map(async (sheetName) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
      });
      return { sheetName, data: response.data.values || [] };
    })
  );

  // Extract and build the HUB mapping
  const hubSheetIndex = results.findIndex(r => r.sheetName === 'HUB');
  let branchToHubMap: Record<string, string> = {};
  if (hubSheetIndex !== -1) {
    const hubRows = results[hubSheetIndex].data;
    if (hubRows.length > 1) {
      // Assuming column B is Branch and column C is HUB as per image
      // Let's dynamically find it if headers exist
      const headers = (hubRows[0] as string[]).map(h => String(h).trim().toLowerCase());
      const branchIdx = headers.findIndex(h => h === 'branch' || h === 'kode cabang');
      const hubIdx = headers.findIndex(h => h === 'hub' || h === 'kode hub');
      
      const bIdx = branchIdx !== -1 ? branchIdx : 1; // fallback to B
      const hIdx = hubIdx !== -1 ? hubIdx : 2; // fallback to C
      
      for (let i = 1; i < hubRows.length; i++) {
        const branch = String(hubRows[i][bIdx] || '').trim().toUpperCase();
        const hubValue = String(hubRows[i][hIdx] || '').trim().toUpperCase();
        if (branch && hubValue) {
          branchToHubMap[branch] = hubValue;
        }
      }
    }
  }

  // Process data sheets
  const dataResults = results
    .filter(r => r.sheetName !== 'HUB')
    .map(({ sheetName, data: allRows }) => {
      if (allRows.length < 2) return { rows: [], headers: [], sheetName };

      const headers = (allRows[0] as string[]).map((h: string) => String(h).trim());
      const dataRows = allRows.slice(1);

      // Convert to Record<string, string> for structured access
      const structured = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = String(row[i] || '').trim();
        });
        obj['_sheet'] = sheetName;
        
        // --- NORMALIZATION LAYER ---
        
        // 1. Normalize Area
        let area = obj['Area'] || '';
        // Known anomalies from Sheets (ex: names of people instead of area)
        const areaLower = area.toLowerCase();
        if (
          areaLower.includes('dennis') ||
          areaLower.includes('dilalailaty') || 
          areaLower.includes('melisa') ||
          areaLower === '-' ||
          areaLower === 'n/a'
        ) {
          obj['Area'] = 'General';
        } else if (areaLower.includes('apron')) {
          obj['Area'] = 'Apron Area';
        } else if (areaLower.includes('terminal')) {
          obj['Area'] = 'Terminal Area';
        } else if (areaLower === 'general') {
          obj['Area'] = 'General';
        }
        
        // 2. Normalize Airlines
        let airline = obj['Airlines'] || obj['Airline'] || '';
        if (airline) {
            const al = airline.toLowerCase();
            if (al === 'thai airways') obj['Airlines'] = 'Thai Airways';
            else if (al === 'airasia') obj['Airlines'] = 'AirAsia';
            else if (al.includes('hong kong') || al.includes('hongkong')) obj['Airlines'] = 'Hong Kong Airlines';
            else if (al === 'vietjet air') obj['Airlines'] = 'VietJet Air';
            else if (al === 'indigo') obj['Airlines'] = 'IndiGo';
            else if (al === 'ethiopian airline') obj['Airlines'] = 'Ethiopian Airlines';
            // ONLY copy across non-vlookup columns to keep things clean.
            obj['Airline'] = obj['Airlines'];
            delete obj['MASKAPAI (VLOOKUP)']; // Discard poisonous field
        }

        // 3. Explicitly inject calculated HUB based on Branch if missing or to override
        const activeBranch = obj['Branch'] || obj['Reporting Branch'] || obj['Reporting_Branch'] || obj['Station'] || '';
        if (activeBranch && branchToHubMap[activeBranch.toUpperCase()]) {
          obj['MAPPED_HUB'] = branchToHubMap[activeBranch.toUpperCase()];
        } else {
          obj['MAPPED_HUB'] = obj['HUB'] || obj['Hub'] || obj['KODE HUB (VLOOKUP)'] || ''; 
        }

        return obj;
      });

      // Apply client-side filters
      const filtered = structured.filter((row) => {
        // Date filter
        if (filters.dateFrom || filters.dateTo) {
          const dateField = row['Date_of_Event'] || row['Date of Event'] || row['Tanggal'] || row['Date'] || '';
          if (!dateField) return false;
          const rowDate = new Date(dateField);
          if (isNaN(rowDate.getTime())) return false;
          if (filters.dateFrom && rowDate < new Date(filters.dateFrom)) return false;
          if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            if (rowDate > to) return false;
          }
        }

        // Hub filter (now using explicitly mapped hub)
        if (filters.hubs && filters.hubs.length > 0) {
          const hub = row['MAPPED_HUB'];
          if (!filters.hubs.some((h) => hub.toLowerCase().includes(h.toLowerCase()))) return false;
        }

        // Branch filter
        if (filters.branches && filters.branches.length > 0) {
          const branch = row['Branch'] || row['Reporting Branch'] || row['Reporting_Branch'] || row['Station'] || row['KODE CABANG (VLOOKUP)'] || '';
          if (!filters.branches.some((b) => branch.toLowerCase().includes(b.toLowerCase()))) return false;
        }

        // Airline filter
        if (filters.airlines && filters.airlines.length > 0) {
          const airline = row['Airlines'] || row['Airline'] || row['Maskapai'] || row['MASKAPAI (VLOOKUP)'] || '';
          if (!filters.airlines.some((a) => airline.toLowerCase().includes(a.toLowerCase()))) return false;
        }

        // Category filter
        if (filters.categories && filters.categories.length > 0) {
          const cat =
            row['Irregularity/Complain Category'] ||
            row['Irregularity_Complain_Category'] ||
            row['Report Category'] ||
            row['Report_Category'] ||
            row['Main Category'] ||
            '';
          if (!filters.categories.some((c) => cat.toLowerCase().includes(c.toLowerCase()))) return false;
        }

        return true;
      });

      return { rows: filtered, headers, sheetName };
    });

  return dataResults;
}

// Summarizes data into a compact text for GROQ context window
// Limits to ~200 rows to stay within token budget
// Complexity: Time O(n) | Space O(n)
function buildDataContext(
  sheetResults: { rows: Record<string, string>[]; headers: string[]; sheetName: string }[]
): string {
  const parts: string[] = [];
  let totalRows = 0;

  for (const { rows, headers, sheetName } of sheetResults) {
    if (rows.length === 0) continue;

    totalRows += rows.length;
    parts.push(`\n## Sheet: ${sheetName} (${rows.length} rows)`);
    parts.push(`Kolom: ${headers.join(', ')}`);

    // Key statistics
    const statusCount: Record<string, number> = {};
    const reportCategoryCount: Record<string, number> = {};
    const specificCategoryCount: Record<string, number> = {};
    const terminalAreaCount: Record<string, number> = {};
    const apronAreaCount: Record<string, number> = {};
    const branchCount: Record<string, number> = {};
    const airlineCount: Record<string, number> = {};
    const hubCount: Record<string, number> = {};
    const areaByReportCategory: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      const status = row['Status'] || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;

      const repCat = row['Report Category'] || row['Report_Category'] || '';
      if (repCat) reportCategoryCount[repCat] = (reportCategoryCount[repCat] || 0) + 1;

      const specCat = row['Irregularity/Complain Category'] || row['Irregularity_Complain_Category'] || '';
      if (specCat) specificCategoryCount[specCat] = (specificCategoryCount[specCat] || 0) + 1;

      const area = row['Area'] || '';
      if (area) {
        // Only count valid top level areas
        const normalizedArea = area.trim();
        if (['Terminal Area', 'Apron Area', 'General'].includes(normalizedArea)) {
          terminalAreaCount[normalizedArea] = (terminalAreaCount[normalizedArea] || 0) + 1;
          
          // Cross-tabulate with Report Category
          const repCat2 = row['Report Category'] || row['Report_Category'] || '';
          if (repCat2) {
             if (!areaByReportCategory[normalizedArea]) areaByReportCategory[normalizedArea] = {};
             areaByReportCategory[normalizedArea][repCat2] = (areaByReportCategory[normalizedArea][repCat2] || 0) + 1;
          }
        }
      }

      const termCat = row['Terminal Area Category'] || '';
      if (termCat) terminalAreaCount[termCat] = (terminalAreaCount[termCat] || 0) + 1;

      const apronCat = row['Apron Area Category'] || '';
      if (apronCat) apronAreaCount[apronCat] = (apronAreaCount[apronCat] || 0) + 1;

      const branch = row['Branch'] || row['Reporting Branch'] || row['Reporting_Branch'] || row['Station'] || '';
      if (branch) branchCount[branch] = (branchCount[branch] || 0) + 1;

      const airline = row['Airlines'] || row['Airline'] || '';
      if (airline) airlineCount[airline] = (airlineCount[airline] || 0) + 1;

      const hub = row['MAPPED_HUB'] || row['HUB'] || row['Hub'] || '';
      if (hub) hubCount[hub] = (hubCount[hub] || 0) + 1;
    }

    parts.push(`--- SUMMARY DISTRIBUTIONS (USE THIS FOR CHARTS) ---`);
    parts.push(`Status Distribution: ${JSON.stringify(statusCount)}`);
    parts.push(`Report Category (Complaint/Irregularity/Compliment) Distribution: ${JSON.stringify(reportCategoryCount)}`);
    parts.push(`Specific Category (Pax Handling/Baggage/etc) Distribution: ${JSON.stringify(specificCategoryCount)}`);
    parts.push(`Area by Report Category Distribution (USE THIS UNTUK PERTANYAAN SPT COMPLAINT PER AREA): ${JSON.stringify(areaByReportCategory)}`);
    parts.push(`Terminal Area Detail Distribution: ${JSON.stringify(terminalAreaCount)}`);
    parts.push(`Apron Area Detail Distribution: ${JSON.stringify(apronAreaCount)}`);
    parts.push(`Branch/Station Distribution: ${JSON.stringify(branchCount)}`);
    parts.push(`Airline Distribution: ${JSON.stringify(airlineCount)}`);
    parts.push(`Hub Distribution: ${JSON.stringify(hubCount)}`);
    parts.push(`--------------------------------------------------`);

    // Sample rows (up to 200 for detailed context)
    const sampleLimit = Math.min(rows.length, 200);
    const relevantFields = [
      'Date of Event', 'Date_of_Event',
      'Airlines',
      'Flight Number', 'Flight_Number',
      'Branch', 'Reporting Branch',
      'MAPPED_HUB', 'HUB',
      'Report Category', 'Irregularity/Complain Category',
      'Report',
      'Root Caused', 'Root_Caused',
      'Action Taken', 'Action_Taken',
      'Status',
      'Preventive Action',
      'Area', 'Terminal Area Category', 'Apron Area Category', 'Severity'
    ];

    // Determine which fields are present or injected
    const injectedFields = ['MAPPED_HUB'];
    const activeFields = relevantFields.filter((f) => headers.includes(f) || injectedFields.includes(f));

    parts.push(`\nSample Data (${sampleLimit} of ${rows.length}):`);
    for (let i = 0; i < sampleLimit; i++) {
      const row = rows[i];
      const compactRow = activeFields
        .map((f) => {
          const val = row[f];
          if (!val) return null;
          // Truncate long values
          const truncated = val.length > 120 ? val.slice(0, 120) + '...' : val;
          return `${f}:${truncated}`;
        })
        .filter(Boolean)
        .join(' | ');
      if (compactRow) parts.push(`  [${i + 1}] ${compactRow}`);
    }
  }

  return `# IRRS Report Data\nTotal records matching filters: ${totalRows}\n${parts.join('\n')}`;
}

const SYSTEM_PROMPT = `Kamu adalah AI Data Analyst untuk sistem IRRS (Irregularity Reporting & Resolution System) Gapura Angkasa.

ATURAN UTAMA:
1. HANYA berikan analisis berdasarkan data yang diberikan. JANGAN mengarang data.
2. Jawab dalam Bahasa Indonesia.
3. Gunakan format markdown: heading (##), bold (**), tabel, dan bullet points.
4. Sertakan angka spesifik, persentase, dan perbandingan dari data.
5. Jika diminta rekomendasi, berikan HANYA berdasarkan pola yang terlihat di data.
6. Jika data tidak cukup untuk menjawab, katakan dengan jelas.
7. VISUALISASI DATA: Jika diminta chart, atau data sangat cocok divisualisasikan (contoh: Top 5 Kategori), kamu HARUS menghasilkan block kode markdown \`\`\`json standar.
Bentuk JSON harus valid dan memiliki property \`isChart: true\` seperti ini:
\`\`\`json
{
  "isChart": true,
  "type": "bar", // pilihan: "bar", "pie", "line"
  "title": "Top Kategori Irregularity",
  "data": [
    {"name": "Kategori A", "value": 45},
    {"name": "Kategori B", "value": 30}
  ]
}
\`\`\`
PASTIKAN hasil keluaran visualisasi dibungkus dengan tiga backticks \`\`\`json dan tidak ada teks pendahuluan di dalamnya.

KONTEKS DOMAIN:
- Data berisi laporan irregularity dan complaint dari berbagai branch/cabang penerbangan
- Kolom Penting: "Date of Event", "Airlines", "Reporting Branch", "HUB", "Report Category", "Irregularity/Complain Category", "Report" (deskripsi insiden), "Root Caused", "Action Taken", "Status", "Preventive Action"
- "Report Category" berisi tipe besar: Irregularity, Complaint, Compliment.
- "Irregularity/Complain Category" berisi tipe spesifik: Pax Handling, Baggage Handling, GSE, Operation, dll. INILAH YANG DIMAKSUD JIKA USER BERTANYA TENTANG "Kategori Irregularity".
- Gunakan data "SUMMARY DISTRIBUTIONS" di bagian paling atas data untuk membikin visualisasi chart. JANGAN MENGHITUNG MANUAL dari sampel row. Data SUMMARY adalah kebenaran mutlak seluruh records.
- Status: "Open" = belum selesai atau perlu respons, "Closed" = sudah selesai, "On Progress" = sedang ditangani
- Corrective action yang tidak efektif = case yang sudah ada respon "Action Taken" tapi "Status" masih "Open"
- Preventive action = Usulan tindakan pencegahan agar case (berdasarkan "Root Caused" dan "Report") tidak terulang kembali

ATURAN PREDIKSI WAKTU RESOLUSI (SLA):
Jika diminta untuk **MEMPREDIKSI WAKTU RESOLUSI**, gunakan panduan estimasi Service Level Agreement (SLA) industri aviasi berikut karena histori waktu komplit (Date Closed) tidak selalu terterekam:
- **Severity High**: Target Resolusi 1x24 Jam (Contoh: Insiden keselamatan, operasi terhenti).
- **Severity Medium**: Target Resolusi 3x24 Jam (Contoh: Kargo terlambat, komplain bagasi).
- **Severity Low**: Target Resolusi 7x24 Jam (Contoh: Komplain ringan pelayanan).
Kaitkan estimasi SLA ini dengan data \`Root Cause\` dan \`Action Taken\` untuk memberikan prediksi analisis yang logis apakah sebuah laporan bisa ditutup lebih cepat atau berpotensi delay.

PENGGUNAAN REFERENSI LAPORAN:
- **JANGAN PERNAH** menyebutkan ID internal atau nomor baris seperti "Laporan dengan ID [1]" atau "Laporan [3]".
- Sebutkan konteks masalahnya secara langsung. Contoh: *"Terdapat laporan mengenai keterlambatan kargo (Medium)..."* atau *"Laporan tentang penyalahgunaan wewenang staf (High)..."*.`;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { question, filters } = body as {
      question: string;
      filters?: InsightFilters;
    };

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing "question" field' }, { status: 400 });
    }

    // Step 1: Fetch data from Google Sheets with filters
    const sheetResults = await fetchFilteredSheetData(filters || {});
    const totalRows = sheetResults.reduce((sum, s) => sum + s.rows.length, 0);

    if (totalRows === 0) {
      return NextResponse.json({
        status: 'success',
        answer:
          '⚠️ **Tidak ada data** yang ditemukan dengan filter yang dipilih. Coba perluas rentang tanggal atau kurangi filter.',
        highlights: ['0 data ditemukan'],
        metadata: { dataSize: 0, question, timestamp: new Date().toISOString() },
      });
    }

    // Step 2: Build compact data context for GROQ
    const dataContext = buildDataContext(sheetResults);

    // Step 3: Call GROQ AI
    const messages: GroqMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Berikut data IRRS yang sudah difilter:\n\n${dataContext}\n\nPertanyaan user: ${question}\n\nBerikan analisis mendalam berdasarkan data di atas. Sertakan angka spesifik dan rekomendasi actionable.`,
      },
    ];

    const aiResponse = await callGroqAI(messages);

    // Extract highlights from the data
    const highlights: string[] = [`${totalRows} data dianalisis`];
    for (const s of sheetResults) {
      if (s.rows.length > 0) {
        highlights.push(`${s.sheetName}: ${s.rows.length} records`);
      }
    }

    return NextResponse.json({
      status: 'success',
      answer: aiResponse || 'AI tidak dapat menghasilkan analisis saat ini.',
      highlights,
      metadata: {
        dataSize: totalRows,
        question,
        model: 'llama-3.3-70b-versatile',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AI Insights] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
