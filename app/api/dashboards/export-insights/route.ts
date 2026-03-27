import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { callGroqAI } from '@/lib/ai/groq';

interface TileSummary {
  id: string;
  title: string;
  chartType: string;
  columns: string[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
}

interface InsightRequest {
  dashboardName: string;
  subtitle?: string;
  tiles: TileSummary[];
}

interface TileInsight {
  tileId: string;
  keyFindings: string[];
  narrative: string;
}

interface InsightsResponse {
  executiveSummary: string[];
  tileInsights: TileInsight[];
  recommendations: string[];
  closingStatement: string;
}

// Complexity: Time O(tiles) | Space O(prompt_length + response)
function buildInsightsPrompt(req: InsightRequest): string {
  const tileSections = req.tiles.map((t, i) => {
    const sampleStr = t.sampleRows.slice(0, 8).map(r =>
      t.columns.map(c => `${c}: ${r[c] ?? '-'}`).join(', ')
    ).join('\n    ');

    return `  **Chart ${i + 1}: "${t.title}"** (Tipe: ${t.chartType}, ${t.rowCount} baris)
    Kolom: ${t.columns.join(', ')}
    Data sampel:
    ${sampleStr}`;
  }).join('\n\n');

  return `Anda adalah Senior Data Analyst di Gapura Angkasa (40+ tahun pengalaman).
Tugas Anda: Analisis data dashboard ini untuk presentasi Level Eksekutif.

Dashboard: "${req.dashboardName}"
${req.subtitle ? `Subtitle: "${req.subtitle}"` : ''}

DATA FAKTUAL (JANGAN MENGARANG):
${tileSections}

KEMBALIKAN JSON PERSIS dengan format ini:
{
  "executiveSummary": [
    "Poin 1... (Fokus pada dampak operasional/finansial/safety)",
    "Poin 2... (Sertakan angka)",
    "Poin 3...",
    "Poin 4 (opsional)",
    "Poin 5 (opsional)"
  ],
  "tileInsights": [
    {
      "tileId": "tile-id-xxx",
      "keyFindings": [
        "Temuan 1 (Sebutkan angka spesifik)",
        "Temuan 2"
      ],
      "narrative": "Analisis mendalam 1-2 kalimat. Jelaskan 'Why' (mengapa ini terjadi) dan 'So What' (apa dampaknya)."
    }
  ],
  "recommendations": [
    "Rekomendasi Strategis 1 (Jangka Panjang)",
    "Rekomendasi Taktis 2 (Quick Fix)",
    "Rekomendasi 3"
  ],
  "closingStatement": "Kalimat penutup yang berwibawa."
}

ATURAN KRUSIAL:
1.  **NO HALLUCINATION**: Gunakan HANYA data yang ada di "DATA FAKTUAL". Jangan mengarang external factors jika tidak ada datanya.
2.  **SENIOR TONE**: Gunakan bahasa Indonesia profesional, tajam, dan tidak bertele-tele.
3.  **DATA INTEGRITY**: Wajib menyertakan angka/persentase aktual di dalam narasi.
4.  **RELEVANCE**: Fokus pada Safety, Security, Services (3S) dan On-Time Performance (OTP).
5.  **JSON ONLY**: Jangan berikan teks pembuka, penutup, atau markdown code blocks. Berikan HANYA raw JSON object yang valid.`;
}

// Complexity: Time O(1) — single API call | Space O(response)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: InsightRequest = await request.json();

    if (!body.tiles || body.tiles.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data tile' }, { status: 400 });
    }

    // Call AI API
    const prompt = buildInsightsPrompt(body);

    let content;
    try {
      content = await callGroqAI([
        {
          role: "system",
          content: "Anda adalah Senior Data Analyst Gapura Angkasa. Berikan insight yang kritis, akurat, dan bernilai strategis bagi Direksi. KEMBALIKAN HANYA JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ], 'llama-3.1-8b-instant');
    } catch (error) {
      console.error('[export-insights] AI error:', error);
      return NextResponse.json({ error: 'Gagal menghubungi AI' }, { status: 502 });
    }

    if (!content) {
      return NextResponse.json({ error: 'AI tidak mengembalikan respons' }, { status: 502 });
    }

    // Clean <think> tags from reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    let insights: InsightsResponse;
    try {
      // Robust extraction: find the first { and the last }
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }
      insights = JSON.parse(content);
    } catch {
      console.error('[export-insights] Failed to parse AI content. Raw output:', content);
      return NextResponse.json({ error: 'AI returned invalid JSON format' }, { status: 422 });
    }

    return NextResponse.json(insights);
  } catch (err) {
    console.error('[export-insights] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
