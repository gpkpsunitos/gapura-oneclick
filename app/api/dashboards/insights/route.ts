import { NextRequest, NextResponse } from "next/server";
import {
  normalizeQuery,
  normalizeVisualization,
} from "@/lib/builder/normalization";
import { buildSchemaContextForAI } from "@/lib/builder/schema";
import { callGroqAI } from "@/lib/ai/groq";
import crypto from "crypto";

// AI Configuration
const AI_MODEL = "llama-3.1-8b-instant";

// Rate limiting
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per chart

// Memory Cleanup Configuration
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

// In-memory cache for insights (replaces Supabase persistent cache)
const insightsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface InsightRequest {
  chartTitle: string;
  chartType: string;
  dashboardId?: string;
  tileId?: string;
  totalRows: number;
  dataSample: Array<Record<string, unknown>>;
  statistics: {
    total: number;
    average: number;
    maximum: number;
    minimum: number;
  };
  dateRange?: {
    from: string;
    to: string;
  };
  supportingCharts?: Array<{
    title: string;
    chartType: string;
    dimensions: any[];
    measures: any[];
  }>;
}

// Generate cache key from request
function generateCacheKey(body: InsightRequest): string {
  const keyData = {
    chartTitle: body.chartTitle,
    chartType: body.chartType,
    dashboardId: body.dashboardId,
    tileId: body.tileId,
    totalRows: body.totalRows,
    statistics: body.statistics,
    dateRange: body.dateRange,
    supportingCharts: body.supportingCharts,
    // Use first 50 rows for better uniqueness
    dataSample: body.dataSample.slice(0, 50),
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(keyData))
    .digest("hex");
}

// Perform cleanup of expired rate limit data and cache entries
// Complexity: O(N + M) where N is rate limit keys and M is cache keys
function performCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  // 1. Cleanup Request Timestamps
  for (const [key, timestamps] of requestTimestamps.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (validTimestamps.length === 0) {
      requestTimestamps.delete(key);
    } else {
      requestTimestamps.set(key, validTimestamps);
    }
  }

  // 2. Cleanup Insights Cache
  for (const [key, entry] of insightsCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      insightsCache.delete(key);
    }
  }

  // Update last cleanup time
  lastCleanup = now;
}

// Check rate limit
function checkRateLimit(tileId: string | undefined): boolean {
  if (!tileId) return true;

  // Trigger cleanup periodically
  performCleanup();

  const now = Date.now();
  const timestamps = requestTimestamps.get(tileId) || [];
  const validTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW,
  );
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) return false;
  validTimestamps.push(now);
  requestTimestamps.set(tileId, validTimestamps);
  return true;
}

// In-memory cache helpers
function getMemoryCache(cacheKey: string) {
  const entry = insightsCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    insightsCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

function setMemoryCache(
  cacheKey: string,
  insights: Record<string, unknown>,
  supportingCharts: unknown,
  metadata: Record<string, unknown>,
) {
  insightsCache.set(cacheKey, {
    data: { insights, supporting_charts: supportingCharts, metadata },
    timestamp: Date.now(),
  });

  // Prune cache if too large
  if (insightsCache.size > 1000) {
    const oldestKey = insightsCache.keys().next().value;
    if (oldestKey) insightsCache.delete(oldestKey);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();
    const { chartTitle, chartType, tileId, totalRows } = body;

    // Generate cache key
    const cacheKey = generateCacheKey(body);

    // Check cache
    const cached = getMemoryCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Rate limiting
    if (!checkRateLimit(tileId)) {
      return NextResponse.json(
        {
          error: "Too many requests",
          fallback: {
            ringkasan:
              "Terlalu banyak permintaan analisis. Mohon tunggu sebentar.",
            temuanUtama: [],
            tren: [],
            rekomendasi: [],
            anomali: [],
            kesimpulan: "Sistem sedang sibuk.",
          },
        },
        { status: 429 },
      );
    }

    // Construct the prompt
    // Note: We skip fetching dashboard/chart context from Supabase to avoid DB dependency
    const prompt = generatePrompt({
      ...body,
      context: "Analysis based on provided data sample.",
    });

    // Call AI (Groq)
    let insightsText;
    try {
      insightsText = await callGroqAI(
        [
          {
            role: "system",
            content: `Anda adalah Senior Data Analyst di PT Gapura Angkasa Indonesia dengan pengalaman lebih dari 40 tahun dalam operasional ground handling. 
1.  **NO HALLUCINATION**: Haram hukumnya mengarang data. Jika data tidak ada, katakan tidak ada. Jangan pernah berasumsi atau membuat angka fiktif.
2.  **STRICT SCHEMA ADHERRENCE**: Gunakan hanya istilah dan field yang ada dalam schema database Gapura.
3.  **ROOT CAUSE FOCUS**: Jangan hanya melaporkan "apa" yang terjadi, tapi analisis "mengapa" dan dampaknya terhadap On-Time Performance (OTP) dan SLA.
4.  **SENIORITY**: Gunakan bahasa Indonesia yang profesional, tegas, langsung pada inti (no fluff), dan berwibawa. Hindari bahasa yang terlalu "robotik" atau "generik".
5.  **DATA INTEGRITY**: Angka adalah suci. Validasi setiap klaim dengan angka dari data yang diberikan.

ATURAN OUTPUT:
1.  JANGAN gunakan emoji.
2.  Kembalikan HANYA JSON valid.
3.  JANGAN gunakan markdown block (seperti \`\`\`json) di dalam value JSON.
4.  JANGAN PERNAH mengurutkan (ORDER BY) berdasarkan kolom mentah yang tidak ada di SELECT/GROUP BY.

Business Context (PT Gapura Angkasa):
- **Irregularity**: Kejadian tidak normal/penyimpangan operasional (Misal: Delay, Baggage Mishandling, Equipment Failure). PRIORITAS TINGGI.
- **Complain**: Keluhan pelanggan/maskapai. Dampak langsung pada kepuasan & SLA. Harus segera dimitigasi.
- **Compliment**: Apresiasi dari pelanggan. Identifikasi "Service Champion" atau area berkinerja tinggi.
- **Areas**: APRON (Sisi udara), TERMINAL (Sisi darat), GENERAL (Umum).
- **Severity**: Low, Medium, High. Catatan: Complain "Low" tetap kritikal bagi reputasi layanan.
- **Root Cause**: Analisis dari 5-Why (Men, Machine, Method, Material, Milieu/Environment).`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        AI_MODEL,
      );
    } catch (error) {
      console.error("AI API error:", error);
      throw new Error(`AI API error: ${error}`);
    }

    // Clean <think> tags from reasoning models
    insightsText = insightsText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Parse the JSON response
    let insights;
    try {
      // 1. Try cleaning markdown code blocks
      let jsonContent = insightsText
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      // 2. If that fails or if there's extra text, try finding the first '{' and last '}'
      const firstBrace = jsonContent.indexOf("{");
      const lastBrace = jsonContent.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      // 3. SEC-OPS: Sanitize common malformed JSON values (unquoted ratios, etc.)
      jsonContent = jsonContent.replace(
        /:\s*([0-9]+\s*:\s*[0-9]+)\b/g,
        ': "$1"',
      );
      jsonContent = jsonContent.replace(/:\s*([0-9.]+\s*%)\b/g, ': "$1"');

      insights = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn("JSON Parse Warning:", parseError);
      console.log("Raw Insights Text:", insightsText);
      insights = parseInsightsFromText(insightsText);
    }

    // 4. VALIDATE AND ENFORCE DATA TYPES (Prevent React "Objects not valid as child" errors)
    if (insights && typeof insights === "object") {
      const insightsObj = insights as any;

      // Ensure specific arrays contain only strings
      const stringArrays = ["temuanUtama", "rekomendasi", "saranEksplorasi"];
      stringArrays.forEach((key) => {
        if (Array.isArray(insightsObj[key])) {
          insightsObj[key] = insightsObj[key].map((item: any) => {
            if (typeof item === "object" && item !== null) {
              // PRESERVE STRUCTURED FINDINGS: If it has 'diagnosa', it's a "Genius Tier" finding
              if (item.diagnosa) return item;

              // Fallback for other objects
              return item.label || item.deskripsi || JSON.stringify(item);
            }
            return String(item || "");
          });
        } else {
          insightsObj[key] = [];
        }
      });

      // Ensure 'anomali' and 'tren' fields are safe
      if (Array.isArray(insightsObj.anomali)) {
        insightsObj.anomali = insightsObj.anomali.map((a: any) => ({
          label: String(a?.label || "Anomali"),
          nilai:
            typeof a?.nilai === "object"
              ? JSON.stringify(a.nilai)
              : (a?.nilai ?? 0),
          deskripsi: String(a?.deskripsi || ""),
        }));
      } else {
        insightsObj.anomali = [];
      }

      if (Array.isArray(insightsObj.tren)) {
        insightsObj.tren = insightsObj.tren.map((t: any) => ({
          label: String(t?.label || "Tren"),
          arah: String(t?.arah || "stabil").toLowerCase(),
          persentase: Number(t?.persentase || 0),
          deskripsi: String(t?.deskripsi || ""),
        }));
      } else {
        insightsObj.tren = [];
      }

    }

    // 5. CACHE STORAGE
    setMemoryCache(
      cacheKey,
      insights,
      [], // AI supporting charts disabled - we use deterministic charts now
      {
        model: AI_MODEL,
        chartTitle,
        chartType,
        totalRows,
      },
    );

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate insights",
        fallback: {
          ringkasan: "Gagal menghasilkan analisis AI.",
          temuanUtama: ["Silakan coba lagi nanti."],
          tren: [],
          rekomendasi: [],
          anomali: [],
          kesimpulan: "Terjadi kesalahan sistem.",
        },
      },
      { status: 500 },
    );
  }
}

function generatePrompt(data: InsightRequest & { context?: string }): string {
  const {
    chartTitle,
    chartType,
    totalRows,
    dataSample,
    statistics,
    dateRange,
    context,
  } = data;
  const schemaContext = buildSchemaContextForAI();

  return `<SYSTEM_INSTRUCTION>
You are a **Senior Data Analyst (40+ years exp)** at Gapura Angkasa.
Your goal is to analyze the provided data snippet and generate **factual, data-driven insights** for the Board of Directors.

**CRITICAL RULES (ZERO TOLERANCE):**
1.  **NO HALLUCINATION**: Do NOT invent "maintenance issues", "targets", "training needs", or "budget constraints" unless the data explicitly supports it.
2.  **STRICT DATA**: Only use the values present in the <RAW_DATA_SAMPLE>. Do not extrapolate beyond the Date Range.
3.  **SCHEMA COMPLIANCE**: Adhere strictly to the defined schema.
4.  **TONE**: Professional, authoritative, critical, and concise.

<BUSINESS_DOMAINS>
The system operates across 3 main Areas:
1. APRON: Airside operations, ramp handling.
2. TERMINAL: Landside operations, passenger handling.
3. GENERAL: General administration.

SPECIAL INSTRUCTION FOR CARGO (CGO):
- CGO reports are identified by keywords in 'description', 'title', or 'category'.
- Keywords: "cargo", "logistics", "warehouse", "dangerous goods", "live animal", "mail", "kargo", "gudang".
- When analyzing "Cargo" issues, look for these terms in the text fields.
</BUSINESS_DOMAINS>
</SYSTEM_INSTRUCTION>

<DATA_CONTEXT>
- Chart Utama: "${chartTitle}" (${chartType})
- Total Baris: ${totalRows}
- Statistik: Maks=${statistics.maximum}, Rata-rata=${statistics.average.toFixed(2)}, Min=${statistics.minimum}
- Rentang Tanggal: ${dateRange ? `${dateRange.from} s/d ${dateRange.to}` : "Tidak Tersedia"}
- Konteks Analisis: ${context || "Analisis Umum"}

<SUPPORTING_CHARTS_CONTEXT>
Gunakan context ini untuk melihat gambaran besar (Holistic Awareness). Jangan hanya fokus pada satu chart utama jika chart pendukung memberikan insight tambahan:
${JSON.stringify(data.supportingCharts || [], null, 2)}
</SUPPORTING_CHARTS_CONTEXT>
</DATA_CONTEXT>

<RAW_DATA_SAMPLE>
${JSON.stringify(dataSample, null, 2)}
</RAW_DATA_SAMPLE>

<ANALYSIS_TASKS>
1. **Executive Summary**: Ringkas tren data dalam 2-3 kalimat. Apa temuan terpenting yang harus diketahui Direksi?
2. **Korupsi Data vs Konteks Bisnis**: Gunakan angka AKTUAL dari data sample. Hubungkan antara volume di Chart Utama dengan dimensi di Supporting Charts (Contoh: "Meskipun volume Complain di Lokasi A tinggi, Supporting Chart menunjukkan ini didominasi oleh Kategori B"). 
   - **PENTING**: JANGAN PERNAH menggunakan nama fiktif seperti 'Maskapai X', 'Lokasi A', atau 'Kategori B' dalam output akhir. Gunakan HANYA nama asli yang ada di dataset.
3. **Analisis 3S (Safety, Security, Service)**: Klasifikasikan temuan berdasarkan dampaknya terhadap Safety operasional atau Service quality (Complaint/Compliment).
4. **Anomali & Root Cause**: Identifikasi outlier. Berikan spekulasi penyebab berdasarkan kategori (Misal: "Lonjakan Delay di Apron kemungkinan disebabkan oleh Machine/GSE Failure").
5. **Rekomendasi Strategis**: Berikan 2-3 tindakan konkret yang dapat dilakukan manajemen.
</ANALYSIS_TASKS>


<OUTPUT_FORMAT>
Return a valid JSON object. NO markdown.
{
  "ringkasan": "Summary text here.",
  "temuanUtama": [
    {
      "diagnosa": "Finding 1 title",
      "data": { "Category Name": 123 }, 
      "impactScore": 5
    }
  ],
  "__RULES__": [
     "The 'data' object must be a FLAT Key-Value pair: { \"Key Name\": Number }.",
     "Example: { \"Baggage Handling\": 15, \"Late Check-in\": 8 }",
     "DO NOT nest objects. DO NOT use colons in keys if avoidable.",
     "Use actual data values. No placeholders."
  ],
  "tren": [
    { "label": "Trend Name", "arah": "naik/turun/stabil", "persentase": 0, "deskripsi": "Description" }
  ],
  "rekomendasi": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "saranEksplorasi": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "anomali": [
    { "label": "Outlier Label", "nilai": "Value", "deskripsi": "Description" }
  ],
  "kesimpulan": "Final conclusion."
}
</OUTPUT_FORMAT>`;
}

function parseInsightsFromText(text: string): unknown {
  const lines = text.split("\n").filter((line) => line.trim());

  return {
    ringkasan: lines[0] || "Analisis data telah selesai.",
    temuanUtama: lines
      .slice(1, 6)
      .map((line) => line.replace(/^[\s\-\•]+/, "").trim()),
    tren: [],
    rekomendasi: lines
      .slice(6, 9)
      .map((line) => line.replace(/^[\s\-\•]+/, "").trim()),
    anomali: [],
    kesimpulan:
      lines[lines.length - 1] || "Data menunjukkan hasil yang signifikan.",
  };
}

function generateFallbackInsights() {
  return {
    ringkasan:
      "Tidak dapat memuat analisis AI saat ini. Silakan coba beberapa saat lagi.",
    temuanUtama: [
      "Data visualisasi telah berhasil dimuat.",
      "Analisis mendalam membutuhkan koneksi ke layanan AI.",
      "Periksa koneksi internet Anda.",
    ],
    tren: [],
    rekomendasi: ["Lakukan analisis manual berdasarkan data tabel."],
    anomali: [],
    kesimpulan: "Data tabel tersedia untuk direview secara manual.",
  };
}
