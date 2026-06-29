import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { callOpenRouterAI, type OpenRouterMessage } from '@/lib/ai/openrouter';
import { getGoogleSheets } from '@/lib/google-sheets';
import { checkDbRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const REPORT_SHEETS = ['NON CARGO', 'CGO'];
const INSIGHTS_MODEL = process.env.INSIGHTS_AI_MODEL || 'google/gemini-2.5-flash-preview';
const VLOOKUP_SHEET = 'Data for Vlookup';

interface InsightFilters {
  dateFrom?: string;
  dateTo?: string;
  hubs?: string[];
  branches?: string[];
  airlines?: string[];
  categories?: string[];
  source?: 'all' | 'NON CARGO' | 'CGO';
}

async function fetchFilteredSheetData(filters: InsightFilters): Promise<{
  rows: Record<string, string>[];
  headers: string[];
  sheetName: string;
}[]> {
  const sheets = await getGoogleSheets();
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

  const sheetsToFetch =
    filters.source && filters.source !== 'all'
      ? [filters.source, VLOOKUP_SHEET]
      : [...REPORT_SHEETS, VLOOKUP_SHEET];

  const results = await Promise.all(
    sheetsToFetch.map(async (sheetName) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
      });
      return { sheetName, data: response.data.values || [] };
    })
  );

  const hubSheetIndex = results.findIndex(r => r.sheetName === VLOOKUP_SHEET);
  const branchToHubMap: Record<string, string> = {};
  if (hubSheetIndex !== -1) {
    const hubRows = results[hubSheetIndex].data;
    if (hubRows.length > 1) {

      const headers = (hubRows[0] as string[]).map(h => String(h).trim().toLowerCase());
      const branchIdx = headers.findIndex(h => h === 'branch' || h === 'kode cabang');
      const hubIdx = headers.findIndex(h => h === 'hub' || h === 'kode hub');

      const bIdx = branchIdx !== -1 ? branchIdx : 1;
      const hIdx = hubIdx !== -1 ? hubIdx : 2;

      for (let i = 1; i < hubRows.length; i++) {
        const branch = String(hubRows[i][bIdx] || '').trim().toUpperCase();
        const hubValue = String(hubRows[i][hIdx] || '').trim().toUpperCase();
        if (branch && hubValue) {
          branchToHubMap[branch] = hubValue;
        }
      }
    }
  }

  const dataResults = results
    .filter(r => r.sheetName !== VLOOKUP_SHEET)
    .map(({ sheetName, data: allRows }) => {
      if (allRows.length < 2) return { rows: [], headers: [], sheetName };

      const headers = (allRows[0] as string[]).map((h: string) => String(h).trim());
      const dataRows = allRows.slice(1);

      const structured = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = String(row[i] || '').trim();
        });
        obj['_sheet'] = sheetName;

        const area = obj['Area'] || '';

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

        const airline = obj['Airlines'] || obj['Airline'] || '';
        if (airline) {
            const al = airline.toLowerCase();
            if (al === 'thai airways') obj['Airlines'] = 'Thai Airways';
            else if (al === 'airasia') obj['Airlines'] = 'AirAsia';
            else if (al.includes('hong kong') || al.includes('hongkong')) obj['Airlines'] = 'Hong Kong Airlines';
            else if (al === 'vietjet air') obj['Airlines'] = 'VietJet Air';
            else if (al === 'indigo') obj['Airlines'] = 'IndiGo';
            else if (al === 'ethiopian airline') obj['Airlines'] = 'Ethiopian Airlines';

            obj['Airline'] = obj['Airlines'];
            delete obj['MASKAPAI (VLOOKUP)'];
        }

        const activeBranch = obj['Branch'] || obj['Reporting Branch'] || obj['Reporting_Branch'] || obj['Station'] || '';
        if (activeBranch && branchToHubMap[activeBranch.toUpperCase()]) {
          obj['MAPPED_HUB'] = branchToHubMap[activeBranch.toUpperCase()];
        } else {
          obj['MAPPED_HUB'] = obj['HUB'] || obj['Hub'] || obj['KODE HUB (VLOOKUP)'] || ''; 
        }

        return obj;
      });

      const filtered = structured.filter((row) => {

        if (filters.dateFrom || filters.dateTo) {
          const dateField = row['Date of Event'] || row['Date_of_Event'] || row['Tanggal'] || row['Date'] || '';
          if (!dateField) return false;

          let rowDate: Date;
          const asInt = Number(dateField);
          if (Number.isFinite(asInt) && asInt > 20000 && asInt < 80000) {
            rowDate = new Date((asInt - 25569) * 86400 * 1000);
          } else {
            rowDate = new Date(dateField);
          }
          if (isNaN(rowDate.getTime())) return false;
          if (filters.dateFrom && rowDate < new Date(filters.dateFrom)) return false;
          if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            if (rowDate > to) return false;
          }
        }

        if (filters.hubs && filters.hubs.length > 0) {
          const hub = row['MAPPED_HUB'];
          if (!filters.hubs.some((h) => hub.toLowerCase().includes(h.toLowerCase()))) return false;
        }

        if (filters.branches && filters.branches.length > 0) {
          const branch = row['Branch'] || row['Reporting Branch'] || row['Reporting_Branch'] || row['Station'] || row['KODE CABANG (VLOOKUP)'] || '';
          if (!filters.branches.some((b) => branch.toLowerCase().includes(b.toLowerCase()))) return false;
        }

        if (filters.airlines && filters.airlines.length > 0) {
          const airline = row['Airlines'] || row['Airline'] || row['Maskapai'] || row['MASKAPAI (VLOOKUP)'] || '';
          if (!filters.airlines.some((a) => airline.toLowerCase().includes(a.toLowerCase()))) return false;
        }

        if (filters.categories && filters.categories.length > 0) {

          const cat =
            row['Irregularity/Complain Category'] ||
            row['Irregularity_Complain_Category'] ||
            row['Report Category'] ||
            row['Report_Category'] ||
            row['Terminal Area Category'] ||
            row['Apron Area Category'] ||
            row['General Category'] ||
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

      const specCat =
        row['Irregularity/Complain Category'] ||
        row['Irregularity_Complain_Category'] ||
        row['Terminal Area Category'] ||
        row['Apron Area Category'] ||
        row['General Category'] ||
        '';
      if (specCat) specificCategoryCount[specCat] = (specificCategoryCount[specCat] || 0) + 1;

      const area = row['Area'] || '';
      if (area) {

        const normalizedArea = area.trim();
        if (['Terminal Area', 'Apron Area', 'General'].includes(normalizedArea)) {
          terminalAreaCount[normalizedArea] = (terminalAreaCount[normalizedArea] || 0) + 1;

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

    const sampleLimit = rows.length;
    const relevantFields = [
      'Date of Event', 'Date_of_Event',
      'Airlines', 'Airline', 'Maskapai', 'Jenis Maskapai',
      'Flight Number', 'Flight_Number',
      'Branch', 'Reporting Branch', 'Cabang',
      'MAPPED_HUB', 'HUB', 'Hub',
      'Report Category', 'Irregularity/Complain Category',
      'Report', 'Laporan',
      'Root Caused', 'Root_Caused', 'Akar Masalah',
      'Action Taken', 'Action_Taken', 'Tindakan',
      'Status',
      'Preventive Action', 'Preventive_Action',
      'Area', 'Terminal Area Category', 'Apron Area Category', 'General Category',
      'Severity Level', 'Severity', 'Delay Code', 'Delay Duration', 'Case Classification', 'Accident / Incident',
      'Gapura KPS Remarks', 'Gapura KPS Action Taken'
    ];

    const injectedFields = ['MAPPED_HUB'];
    const activeFields = relevantFields.filter((f) => headers.includes(f) || injectedFields.includes(f));

    parts.push(`\nFull Data (${rows.length} rows):`);
    for (let i = 0; i < sampleLimit; i++) {
      const row = rows[i];
      const compactRow = activeFields
        .map((f) => {
          const val = row[f];
          if (!val) return null;

          const truncated = val.length > 120 ? val.slice(0, 120) + '...' : val;
          return `${f}:${truncated}`;
        })
        .filter(Boolean)
        .join(' | ');
      if (compactRow) parts.push(`  [${i + 1}] ${compactRow}`);
    }
  }

  return `# OneClick Report Data\nTotal records matching filters: ${totalRows}\n${parts.join('\n')}`;
}

const SYSTEM_PROMPT = `Kamu adalah AI Data Analyst senior untuk sistem OneClick (Irregularity Reporting & Resolution System) Gapura Angkasa.

ATURAN UTAMA:
1. HANYA berikan analisis berdasarkan data yang diberikan. JANGAN mengarang data.
2. Jawab dalam Bahasa Indonesia yang profesional.
3. Gunakan format markdown: heading (##/###), bold (**), tabel, dan bullet points.
4. Sertakan angka spesifik, persentase, dan perbandingan dari data.
5. Jika diminta rekomendasi, berikan HANYA berdasarkan pola yang terlihat di data.
6. Jika data tidak cukup untuk menjawab, katakan dengan jelas.
7. VISUALISASI DATA: Jika diminta chart, atau analisis cocok divisualisasikan, WAJIB hasilkan blok kode \`\`\`json dengan format:
\`\`\`json
{
  "isChart": true,
  "type": "bar",
  "title": "Judul Chart",
  "data": [
    {"name": "Label A", "value": 45},
    {"name": "Label B", "value": 30}
  ]
}
\`\`\`
Type yang valid: "bar", "line", "pie". PASTIKAN JSON valid dan dibungkus tiga backtick \`\`\`json.

KONTEKS DOMAIN:
- Data adalah laporan irregularity, complaint, dan compliment dari cabang-cabang Gapura Angkasa di berbagai bandara.
- **SCHEMA AKTUAL**: Nama kolom yang tepat tersedia di bagian "Kolom:" pada setiap sheet dalam data konteks. Gunakan nama kolom PERSIS seperti di sana — jangan menebak nama kolom.
- Kolom tanggal (misal "Date of Event") bisa berupa angka serial Excel; sistem sudah mengkonversinya untuk filtering.
- "Report Category" berisi klasifikasi besar: **Irregularity**, **Complaint**, **Compliment**.
- Kategori spesifik tersimpan di salah satu kolom area ("Terminal Area Category", "Apron Area Category", atau "General Category") tergantung nilai kolom "Area" (Terminal Area / Apron Area / General).
- "Severity Level" berisi: **Low**, **Medium**, **High**, **Critical** (alias: TOP RISK).
- Status laporan: **Open** = belum selesai, **Closed** = selesai, **On Progress** = sedang dikerjakan.
- **MAPPED_HUB** adalah kolom yang di-inject sistem untuk memetakan branch ke hub berdasarkan sheet "Data for Vlookup".
- SUMMARY DISTRIBUTIONS di atas data = hitungan keseluruhan records. Gunakan ini untuk chart — JANGAN menghitung manual dari sampel row. SUMMARY adalah kebenaran mutlak.
- Corrective action tidak efektif = ada "Action Taken" namun Status masih "Open".
- Preventive action = usulan tindakan agar kasus serupa tidak terulang berdasarkan "Root Caused".

PANDUAN SLA (gunakan jika diminta prediksi waktu resolusi):
- **Severity High/Critical**: Target 1×24 jam.
- **Severity Medium**: Target 3×24 jam.
- **Severity Low**: Target 7×24 jam.
Kaitkan estimasi ini dengan Root Cause dan Action Taken untuk analisis yang logis.

REFERENSI LAPORAN:
- **JANGAN** sebut nomor baris/ID internal seperti "[1]" atau "Laporan #3".
- Sebutkan konteksnya langsung: *"Terdapat laporan keterlambatan kargo (Medium)..."*.

KUALITAS ANALISIS:
- Mulai dengan ringkasan eksekutif singkat (2-3 kalimat).
- Berikan insight yang actionable, bukan hanya deskripsi angka.
- Identifikasi pola, tren, atau anomali yang perlu perhatian manajemen.
- Jika ada outlier atau temuan kritis, highlight dengan **⚠️**.`;

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

    const rl = await checkDbRateLimit(`ai_insights:${payload.id}`, 5, 24 * 60 * 60 * 1000);
    if (!rl.success) {
      const resetAt = new Date(rl.resetAt);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Anda telah mencapai batas 5 pertanyaan per hari. Coba lagi setelah ${resetAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
          resetAt: rl.resetAt,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { question, filters } = body as {
      question: string;
      filters?: InsightFilters;
    };

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing "question" field' }, { status: 400 });
    }

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

    const dataContext = buildDataContext(sheetResults);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Berikut data OneClick yang sudah difilter:\n\n${dataContext}\n\nPertanyaan user: ${question}\n\nBerikan analisis mendalam berdasarkan data di atas. Sertakan angka spesifik dan rekomendasi actionable.`,
      },
    ];

    const aiResponse = await callOpenRouterAI(messages, INSIGHTS_MODEL, 8192);

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
      rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
      metadata: {
        dataSize: totalRows,
        question,
        model: INSIGHTS_MODEL,
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
