import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { normalizeQuery, normalizeVisualization } from '@/lib/builder/normalization';
import { callGroqAI } from '@/lib/ai/groq';
import { TABLES, JOINS, getFieldDef } from '@/lib/builder/schema';
import type { DashboardDefinition, DashboardTile } from '@/types/builder';

function buildSchemaContext(): string {
  const tableDescriptions = TABLES.map(t => {
    const fields = t.fields.map(f => {
      let desc = `    - ${f.name} (${f.type}, label: "${f.label}")`;
      if (f.enumValues && f.enumValues.length > 0) {
        desc += ` — enum: [${f.enumValues.map(v => `"${v}"`).join(', ')}]`;
      }
      return desc;
    }).join('\n');
    return `  Table: "${t.name}" (label: "${t.label}")\n  Fields:\n${fields}`;
  }).join('\n\n');

  const joinDescriptions = JOINS.map(j =>
    `  - key: "${j.key}" — ${j.from}.${j.fromField} → ${j.to}.${j.toField} (label: "${j.label}")`
  ).join('\n');

  return `DATABASE SCHEMA:\n\n${tableDescriptions}\n\nAVAILABLE JOINS:\n${joinDescriptions}`;
}

import { reportsService } from '@/lib/services/reports-service';

/** Query Google Sheets to get actual distinct values and distributions */
async function buildDataContext(): Promise<string> {
  try {
    const reports = await reportsService.getReports();
    
    if (reports.length === 0) {
        return '\n(Tidak ada data laporan ditemukan)\n';
    }

    // Summary
    const total_reports = reports.length;
    // Sort by date to find range
    const sortedDates = reports
        .map(r => r.date_of_event || r.created_at)
        .filter(d => d)
        .sort();
    const earliest_date = sortedDates[0] || '?';
    const latest_date = sortedDates[sortedDates.length - 1] || '?';

    // Distributions
    const fieldsToAnalyze = [
        'category', 'area', 'target_division', 'severity', 'status', 
        'hub', 'jenis_maskapai', 'airlines', 'branch', 'station_code',
        'terminal_area_category', 'apron_area_category', 'general_category',
        'incident_type_id', 'root_caused',
        'kode_cabang', 'kode_hub', 'maskapai_lookup', 'lokal_mpa_lookup'
    ];
    
    const grouped: Record<string, Record<string, number>> = {};
    
    fieldsToAnalyze.forEach(field => {
        grouped[field] = {};
    });

    reports.forEach(r => {
        fieldsToAnalyze.forEach(field => {
            // @ts-ignore
            let val = r[field] || r[field === 'category' ? 'main_category' : '']; // Fallback for aliases
            if (val) {
                val = String(val);
                grouped[field][val] = (grouped[field][val] || 0) + 1;
            }
        });
    });

    let context = `\nDATA AKTUAL DARI GOOGLE SHEETS (gunakan ini untuk akurasi):\n`;
    context += `- Total laporan: ${total_reports}\n`;
    context += `- Rentang tanggal: ${earliest_date} s/d ${latest_date}\n\n`;

    for (const field of fieldsToAnalyze) {
      const dist = grouped[field];
      const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 20); // Top 20
      
      if (entries.length > 0) {
          context += `Field "${field}" — distribusi aktual (Top 20):\n`;
          for (const [val, count] of entries) {
            context += `  "${val}": ${count} laporan\n`;
          }
          context += '\n';
      }
    }

    return context;
  } catch (err) {
    console.error('Failed to build data context:', err);
    return '\n(Gagal mengambil data konteks dari Google Sheets)\n';
  }
}

function buildSystemPrompt(dataContext: string): string {
  return `<SYSTEM_PROMPT>
  <IDENTITY>
    <ROLE>Senior Data Analyst (40+ Years Experience)</ROLE>
    <AFFILIATION>PT Gapura Angkasa Indonesia (Airport Ground Handling)</AFFILIATION>
    <OBJECTIVE>Transform raw operational data into high-fidelity, Executive-Level Dashboards.</OBJECTIVE>
    <PERSONA>
      You are a veteran analyst who demands precision. You do not tolerate errors, hallucinations, or made-up fields.
      You speak with authority and technical accuracy. You prioritize insights that impact Safety, Security, and Services (3S).
    </PERSONA>
  </IDENTITY>

  <CONTEXT>
    <SCHEMA_DEFINITION>
${buildSchemaContext()}
    </SCHEMA_DEFINITION>
    
    <BUSINESS_DOMAINS>
      The system operates across 3 main Areas:
      1. APRON: Airside operations, ramp handling, GSE (Ground Support Equipment).
      2. TERMINAL: Landside operations, passenger handling, check-in, boarding.
      3. GENERAL: General administration, support services, non-operational areas.

      SPECIAL INSTRUCTION FOR CARGO (CGO):
      - Cargo Ground Operations (CGO) reports are explicitly tagged.
      - YOU MUST filter using the 'source_sheet' field.
      - For CGO: filters: [{ field: 'source_sheet', operator: 'eq', value: 'CGO' }]
      - For NON-CARGO: filters: [{ field: 'source_sheet', operator: 'neq', value: 'CGO' }]
    </BUSINESS_DOMAINS>

    <DATA_SNAPSHOT>
${dataContext}
    </DATA_SNAPSHOT>
  </CONTEXT>

  <PROTOCOLS>
    <PROTOCOL id="SCHEMA_COMPLIANCE" priority="CRITICAL">
      **ZERO HALLUCINATION POLICY**:
      - You MUST use ONLY fields explicitly defined in <SCHEMA_DEFINITION>.
      - STRICTLY FORBIDDEN to invent column names like: 'revenue', 'profit', 'monthly_compliments', 'total_reports', 'jumlah_data', 'jumlah', 'count'.
      
      **CRITICAL TABLE RULE**:
      - The main table is named "reports".
      - You MUST set "table": "reports" for all dimensions and measures coming from the main dataset.
      - NEVER use aliases like "data", "data_sample", "raw_data", "dataset", "compliments", "laporan_bulanan".
      
      **CRITICAL FIELD RULE**:
      - To count total reports, use: {"table": "reports", "field": "id", "function": "COUNT", "alias": "total_reports"}
      - NEVER invent fields like: "total_laporan", "jumlah", "count", "record_count", "monthly_compliments". They DO NOT exist.
      - ALWAYS use "id" for counting rows.
      - If you want to group by month, use "date_of_event" with "dateGranularity": "month".
    </PROTOCOL>

    <PROTOCOL id="MULTI_PAGE_STRUCTURE" priority="HIGH">
      - If the user request implies a broad overview or multiple topics, YOU MUST CREATE MULTIPLE PAGES.
      - Structure pages logically:
        Page 1: "Executive Summary" (KPIs, high-level trends).
        Page 2: "Operational Detail" (Breakdowns by station, airline, area).
        Page 3: "Root Cause Analysis" (Deep dive into problems).
      - Do NOT cram everything into one page.
    </PROTOCOL>
    
    <PROTOCOL id="DATA_DRIVEN_DESIGN" priority="HIGH">
      Analyze <DATA_SNAPSHOT> before selecting charts. 
      - If a field has only 1 distinct value, DO NOT use it as a dimension for comparison.
      - If a field has > 20 distinct values, ALWAYS use 'horizontal_bar' or 'table'.
    </PROTOCOL>
    
    <PROTOCOL id="VISUAL_INTEGRITY" priority="HIGH">
      - Titles must be business-relevant (e.g., "Top 10 Airlines by Incident Volume").
      - Colors must use the provided Green palette.
      - Sort order must be explicitly defined (Metric DESC for rankings, Time ASC for trends).
      - CRITICAL: Charts like 'bar', 'line', 'pie', 'donut' MUST HAVE A DIMENSION. 
        - Example WRONG: Bar chart with Measure=Count, Dimension=[]. Result: Single bar (Useless).
        - Example CORRECT: Bar chart with Measure=Count, Dimension=['station_code']. Result: Bar per station.
    </PROTOCOL>
  </PROTOCOLS>

  <CHART_LOGIC>
    <RULE type="TIME_SERIES">
      <CONDITION>X-axis is a Date/Time field</CONDITION>
      <ACTION>Use 'line' or 'area' (if >12 points) OR 'bar' (if <=12 points).</ACTION>
    </RULE>
    
    <RULE type="CATEGORICAL_RANKING">
      <CONDITION>Comparing volumes across categories</CONDITION>
      <ACTION>
        - IF items > 8 OR labels > 12 chars: Use 'horizontal_bar'.
        - IF items <= 8: Use 'bar' or 'donut'.
      </ACTION>
    </RULE>
    
    <RULE type="COMPOSITION">
      <CONDITION>Showing part-to-whole (e.g., Status distribution)</CONDITION>
      <ACTION>Use 'donut' or 'pie' (Max 5 slices). Use 'horizontal_bar' for more.</ACTION>
    </RULE>
    
    <RULE type="CORRELATION">
      <CONDITION>Analyzing Metric by 2 Dimensions (e.g., Airline vs Issue Type)</CONDITION>
      <ACTION>Use 'heatmap' or 'pivot'.</ACTION>
    </RULE>
    
    <RULE type="KPI">
      <CONDITION>Single aggregate number needed</CONDITION>
      <ACTION>Use 'kpi'.</ACTION>
    </RULE>

    <RULE type="MANDATORY_DIMENSION">
      <CONDITION>Chart is NOT 'kpi'</CONDITION>
      <ACTION>
        You MUST provide at least one DIMENSION. 
        If comparing "by Station", use dimension "station_code" or "branch".
        If comparing "by Airline", use dimension "airlines".
      </ACTION>
    </RULE>
  </CHART_LOGIC>

  <OUTPUT_SPECIFICATION>
    <FORMAT>JSON</FORMAT>
    <CONSTRAINT>Return ONLY a single valid JSON object. No markdown backticks.</CONSTRAINT>
    <STRUCTURE>
      {
        "name": "Dashboard Title",
        "description": "Executive summary of insights.",
        "pages": [
          {
            "name": "Page Name",
            "tiles": [
              {
                "id": "unique_slug",
                "query": {
                  "source": "reports",
                  "measures": [{"table": "reports", "field": "id", "function": "COUNT", "alias": "total_reports"}],
                  "dimensions": [{"table": "reports", "field": "category", "alias": "category"}],
                  "sorts": [{"field": "total_reports", "direction": "desc"}],
                  "limit": 10,
                  "filters": []
                },
                "visualization": {
                  "chartType": "horizontal_bar",
                  "title": "Reports by Category",
                  "xAxis": "category",
                  "yAxis": ["total_reports"],
                  "showLegend": false,
                  "showLabels": true
                },
                "layout": {"x": 0, "y": 0, "w": 6, "h": 2}
              }
            ]
          }
        ]
      }
    </STRUCTURE>
  </OUTPUT_SPECIFICATION>
</SYSTEM_PROMPT>`;
}

// Green color palettes matching Gapura branding
const TILE_PALETTES = [
  ['#7cb342', '#9ccc65', '#c5e1a5'], // light green
  ['#558b2f', '#689f38', '#8bc34a'], // green
  ['#33691e', '#558b2f', '#7cb342'], // dark green
  ['#43a047', '#66bb6a', '#a5d6a7'], // medium green
  ['#2e7d32', '#4caf50', '#81c784'], // emerald green
  ['#aed581', '#c5e1a5', '#dcedc8'], // pale green
  ['#689f38', '#7cb342', '#9ccc65'], // olive green
  ['#388e3c', '#4caf50', '#66bb6a'], // forest green
];

function postProcessDashboard(def: DashboardDefinition): DashboardDefinition {
  // Process tiles within pages
  if (def.pages && def.pages.length > 0) {
    let globalIdx = 0;
    def.pages = def.pages.map(page => {
      page.tiles = (page.tiles || []).map(tile => {
        tile = processTile(tile, globalIdx);
        globalIdx++;
        return tile;
      });
      return page;
    });
    // Flatten pages into tiles for backwards compat - DEDUPLICATE by tile ID
    const seenIds = new Set<string>();
    def.tiles = def.pages.flatMap(p => p.tiles || []).filter(tile => {
      if (seenIds.has(tile.id)) return false;
      seenIds.add(tile.id);
      return true;
    });
  } else if (def.tiles && def.tiles.length > 0) {
    // Legacy: single page - DEDUPLICATE by tile ID
    const seenIds = new Set<string>();
    def.tiles = def.tiles.filter(tile => {
      if (seenIds.has(tile.id)) return false;
      seenIds.add(tile.id);
      return true;
    }).map((tile, idx) => processTile(tile, idx));
    def.pages = [{ name: 'Ringkasan Umum', tiles: def.tiles }];
  }

  return def;
}

function formatColumnLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function processTile(tile: DashboardTile, idx: number): DashboardTile {
  tile.id = tile.id || `tile-${Date.now()}-${idx + 1}`;

  // Property safety guards (ensure properties exist before access)
  if (!tile.query) {
    (tile as unknown as { query: Record<string, unknown> }).query = {};
  }
  if (!tile.query.source) tile.query.source = 'reports';
  if (!tile.query.joins) tile.query.joins = [];
  if (!tile.query.dimensions) tile.query.dimensions = [];
  if (!tile.query.measures) tile.query.measures = [];
  
  // FIX: Hallucination correction
   // AI sometimes invents table names like "laporan_bulanan", "monthly_reports", "compliments", etc.
   // We must map them back to "reports".
   const VALID_TABLES = new Set(TABLES.map(t => t.name));
   
   const fixTable = (t: string | undefined) => {
     if (!t) return 'reports';
     // If it's a valid table, keep it
     if (VALID_TABLES.has(t)) return t;
     
     // Otherwise, apply heuristic to map to 'reports'
     const lower = t.toLowerCase();
     if (lower.includes('laporan') || lower.includes('report') || lower.includes('data') || lower.includes('bulanan') || lower.includes('compliment')) {
        // Special case: report_logs and report_comments are valid but might be caught here if not in VALID_TABLES (which they are)
        return 'reports';
     }
     
     // Default fallback for unknown tables in this context is usually 'reports'
     return 'reports'; 
   };

   // FIX: Hallucinated fields
   // "total_reports" is not a real field. If we see it in a count, map to 'id'.
   const fixField = (f: string, func?: string) => {
     if (f === 'total_reports' || f === 'jumlah_laporan' || f === 'total' || f === 'total_laporan' || f === 'jumlah' || f === 'jumlah_data' || f === 'monthly_compliments' || f === 'compliments_count' || f === 'total_compliments') return 'id';
     return f;
   };

   if (tile.query.dimensions) {
     tile.query.dimensions.forEach(d => {
       d.table = fixTable(d.table);
       // Also fix dimension fields if needed
       if (d.field === 'bulan' || d.field === 'month') {
          // AI might try to use 'bulan' as a field on 'reports' which doesn't exist directly but is a virtual field
          // The query processor handles virtual fields 'month', 'year', etc. if they are requested.
          // But we should ensure consistency.
          if (d.field === 'bulan') d.field = 'month';
       }
     });
   }

   if (tile.query.measures) {
     tile.query.measures.forEach(m => {
       m.table = fixTable(m.table);
       const originalField = m.field;
       m.field = fixField(m.field, m.function);

       // If we mapped to 'id' (meaning it was a count-like hallucination), ensure function is COUNT
       if (m.field === 'id' && (originalField !== 'id' || m.function === 'SUM')) {
           m.function = 'COUNT';
       }
     });
   }
  
  // Standardize query normalization (Shared logic)
  tile.query = normalizeQuery(tile.query);

  if (!tile.query.sorts) tile.query.sorts = [];
  if (!tile.query.filters) tile.query.filters = [];
  if (!tile.visualization) {
    (tile as unknown as { visualization: Record<string, unknown> }).visualization = {};
  }
  if (!tile.layout) {
    (tile as unknown as { layout: Record<string, unknown> }).layout = { x: 0, y: 0, w: 6, h: 4 };
  }

  // Sync visualization configuration with shared normalization logic
  tile = normalizeVisualization(tile as any);

  // Visualization defaults
  if (tile.visualization.chartType === 'pie' || tile.visualization.chartType === 'donut') {
    tile.visualization.showLabels = true;
  }

  // Ensure default sorting based on first measure
  if (tile.query.sorts.length === 0 && tile.query.measures.length > 0) {
    const m = tile.query.measures[0];
    const sortField = m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`;
    tile.query.sorts = [{ field: sortField, direction: 'desc', alias: sortField }];
  }

  // Limit enforcement for readability
  if (tile.visualization.title?.match(/Top|Terbanyak|Tertinggi|Terendah/i)) {
    tile.query.limit = 5;
  }
  
  if (tile.visualization.chartType !== 'table' && (tile.query.limit || 0) > 8) {
    tile.query.limit = 8;
  }

  if (!tile.query.limit) {
    if (tile.visualization.chartType === 'table') tile.query.limit = 50;
    else if (tile.visualization.chartType === 'kpi') tile.query.limit = 1;
    else tile.query.limit = 5;
  }

  // Filter sanitization
  const VALID_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'not_in', 'between', 'is_null', 'is_not_null']);
  tile.query.filters = tile.query.filters.filter(f => {
    if (!VALID_OPERATORS.has(f.operator)) return false;
    if (f.operator === 'is_null' || f.operator === 'is_not_null') return true;
    if (f.value === null || f.value === undefined) return false;
    if (typeof f.value === 'string' && f.value.trim() === '') return false;
    if (Array.isArray(f.value) && f.value.length === 0) return false;
    return true;
  }).map(f => ({ ...f, conjunction: f.conjunction || 'AND' }));

  // Metadata correction
  if (!tile.visualization.colors || tile.visualization.colors.length === 0) {
    tile.visualization.colors = TILE_PALETTES[idx % TILE_PALETTES.length];
  }

  return tile;
}

function validateDashboardDefinition(def: DashboardDefinition): string[] {
  const errors: string[] = [];
  if (!def.name) errors.push('Dashboard harus memiliki nama');

  const allTiles = def.pages 
    ? def.pages.flatMap(p => p.tiles || []) 
    : (def.tiles || []);

  if (allTiles.length === 0) errors.push('Dashboard harus memiliki minimal 1 tile');

  allTiles.forEach((tile, i) => {
    if (!tile.query?.source) errors.push(`Tile ${i + 1}: sumber data tidak valid`);
    if (!tile.visualization?.chartType) errors.push(`Tile ${i + 1}: tipe visualisasi tidak valid`);
  });

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: hanya Analyst dan Admin' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt diperlukan' }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt terlalu panjang (maks 2000 karakter)' }, { status: 400 });
    }

    // Build data context from real database
    const dataContext = await buildDataContext();

    // Build system prompt with real data
    const systemPrompt = buildSystemPrompt(dataContext);

    // Call AI API
    let content;

    try {
      content = await callGroqAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ], 'llama-3.1-8b-instant');
    } catch (error) {
       console.error('AI API error:', error);
       return NextResponse.json(
        { error: 'Gagal menghubungi AI. Coba lagi nanti.' },
        { status: 502 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'AI tidak mengembalikan respons' },
        { status: 502 }
      );
    }

    // Clean <think> tags from reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Parse AI response
    let dashboard: DashboardDefinition;
    try {
      // Try extracting JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
         content = jsonMatch[1];
      }
      dashboard = JSON.parse(content) as DashboardDefinition;
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'AI mengembalikan format yang tidak valid. Coba ubah prompt.' },
        { status: 422 }
      );
    }

    // Post-process: fix IDs, colors, defaults, create pages
    dashboard = postProcessDashboard(dashboard);

    // Validate against schema
    const validationErrors = validateDashboardDefinition(dashboard);
    if (validationErrors.length > 0) {
      console.error('AI dashboard validation errors:', validationErrors);
      return NextResponse.json(
        { error: 'Dashboard yang dihasilkan AI tidak valid', details: validationErrors },
        { status: 422 }
      );
    }

    // Return the dashboard definition directly without saving to Supabase
    // This allows the frontend to load it into the builder for review/editing
    const generatedId = `ai-${Date.now()}`;
    const generatedSlug = `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return NextResponse.json({ 
      dashboard: {
        ...dashboard,
        id: generatedId,   // Temporary ID
        slug: generatedSlug // Temporary Slug
      } 
    });
  } catch (err) {
    console.error('AI generate error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
