import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getGoogleSheets } from '@/lib/google-sheets';
import {
  JOUMPA_SHEET_ID,
  JOUMPA_SHEET_NAME,
  buildColumnMap,
  buildRecordFromForm,
  buildSheetRowValues,
  joumpaIdFromSheetId,
  parseSheetRowValues,
  clean,
  type JoumpaFormInput,
  type JoumpaRow,
} from '@/lib/joumpa/mapping';

const UPSERT_BATCH = 100;
const DELETE_BATCH = 500;
const PUSH_LIMIT = 50;

export interface JoumpaSyncResult {
  success: boolean;
  rows: number;
  upsertErrors: number;
  deleted: number;
  pushed: number;
  durationMs: number;
  error?: string;
}

function columnLetter(index: number): string {
  // 0-based index -> spreadsheet column letters (0 -> A, 26 -> AA)
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function rowNumberFromRange(range: string | null | undefined): number | null {
  if (!range) return null;
  const match = range.match(/![A-Z]+(\d+)(?::|$)/);
  return match ? Number(match[1]) : null;
}

export class JoumpaSyncService {
  private static activeSync: Promise<JoumpaSyncResult> | null = null;

  static async sync(): Promise<JoumpaSyncResult> {
    if (this.activeSync) return this.activeSync;
    const run = this.performSync();
    this.activeSync = run;
    try {
      return await run;
    } finally {
      if (this.activeSync === run) this.activeSync = null;
    }
  }

  private static async fetchSheet(): Promise<{ headers: string[]; rows: JoumpaRow[] }> {
    const sheets = await getGoogleSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: JOUMPA_SHEET_ID,
      range: `'${JOUMPA_SHEET_NAME}'!A1:AZ`,
    });
    const values = (res.data.values || []) as string[][];
    if (values.length === 0) return { headers: [], rows: [] };
    const headers = (values[0] || []).map((h) => clean(h));
    const colMap = buildColumnMap(headers);
    const rows = values
      .slice(1)
      .filter((row) => row.some((cell) => clean(cell)))
      .map((row, idx) => parseSheetRowValues(row, headers, colMap, idx));
    return { headers, rows };
  }

  private static async performSync(): Promise<JoumpaSyncResult> {
    const started = Date.now();
    try {
      const { headers, rows } = await this.fetchSheet();

      // 1. Pull: Sheets -> Supabase (upsert by sheet_id, deterministic id)
      let upsertErrors = 0;
      for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
        const batch = rows.slice(i, i + UPSERT_BATCH);
        const { error } = await supabaseAdmin
          .from('joumpa_reports_sync')
          .upsert(batch, { onConflict: 'sheet_id', ignoreDuplicates: false });
        if (error) {
          upsertErrors += batch.length;
          console.error('[JoumpaSync] upsert failed:', error.message);
        }
      }

      // 2. Delete rows removed from the sheet
      const deleted = await this.deleteOrphans(rows);

      // 3. Push: Supabase edits -> Sheets (updated_at > synced_at)
      const pushed = await this.pushLocalUpdatesToSheets(headers);

      return {
        success: upsertErrors === 0,
        rows: rows.length,
        upsertErrors,
        deleted,
        pushed,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[JoumpaSync] sync failed:', message);
      return { success: false, rows: 0, upsertErrors: 0, deleted: 0, pushed: 0, durationMs: Date.now() - started, error: message };
    }
  }

  private static async deleteOrphans(rows: JoumpaRow[]): Promise<number> {
    const currentSheetIds = new Set(rows.map((row) => row.sheet_id));
    const { data, error } = await supabaseAdmin.from('joumpa_reports_sync').select('id, sheet_id');
    if (error) {
      console.warn('[JoumpaSync] orphan fetch failed:', error.message);
      return 0;
    }
    const orphans = (data || []).filter((row) => !currentSheetIds.has(row.sheet_id));
    let deleted = 0;
    for (let i = 0; i < orphans.length; i += DELETE_BATCH) {
      const ids = orphans.slice(i, i + DELETE_BATCH).map((row) => row.id);
      const { data: removed, error: removeError } = await supabaseAdmin
        .from('joumpa_reports_sync')
        .delete()
        .in('id', ids)
        .select('id');
      if (removeError) console.warn('[JoumpaSync] orphan delete failed:', removeError.message);
      else deleted += removed?.length || 0;
    }
    return deleted;
  }

  private static async pushLocalUpdatesToSheets(headers: string[]): Promise<number> {
    if (headers.length === 0) return 0;
    const { data, error } = await supabaseAdmin
      .from('joumpa_reports_sync')
      .select('*')
      .filter('updated_at', 'gt', 'synced_at')
      .order('updated_at', { ascending: false })
      .limit(PUSH_LIMIT);
    if (error || !data || data.length === 0) return 0;

    const sheets = await getGoogleSheets();
    const lastCol = columnLetter(headers.length - 1);
    let pushed = 0;
    for (const row of data as JoumpaRow[]) {
      const rowNum = row.row_number;
      if (!rowNum) continue;
      try {
        const values = buildSheetRowValues(headers, row);
        await sheets.spreadsheets.values.update({
          spreadsheetId: JOUMPA_SHEET_ID,
          range: `'${JOUMPA_SHEET_NAME}'!A${rowNum}:${lastCol}${rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { values: [values] },
        });
        await supabaseAdmin
          .from('joumpa_reports_sync')
          .update({ synced_at: new Date().toISOString() })
          .eq('id', row.id);
        pushed++;
      } catch (err) {
        console.warn(`[JoumpaSync] push row ${row.sheet_id} failed:`, err);
      }
    }
    return pushed;
  }

  // Create a JOUMPA report: append to the sheet (source of truth backup),
  // derive the row number, then insert the deterministic Supabase row.
  static async createReport(input: JoumpaFormInput): Promise<JoumpaRow> {
    const record = buildRecordFromForm(input);
    const sheets = await getGoogleSheets();

    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: JOUMPA_SHEET_ID,
      range: `'${JOUMPA_SHEET_NAME}'!1:1`,
    });
    const headers = ((headerRes.data.values?.[0] || []) as string[]).map((h) => clean(h));

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: JOUMPA_SHEET_ID,
      range: `'${JOUMPA_SHEET_NAME}'!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [buildSheetRowValues(headers, record)] },
    });

    const rowNumber = rowNumberFromRange(appendRes.data.updates?.updatedRange);
    if (!rowNumber) {
      throw new Error('Could not determine appended JOUMPA row number');
    }

    const sheetId = `${JOUMPA_SHEET_NAME}!row_${rowNumber}`;
    const nowIso = new Date().toISOString();
    const fullRow: JoumpaRow = {
      ...record,
      id: joumpaIdFromSheetId(sheetId),
      sheet_id: sheetId,
      row_number: rowNumber,
      created_at: nowIso,
      updated_at: nowIso,
      synced_at: nowIso,
    };

    const { error } = await supabaseAdmin
      .from('joumpa_reports_sync')
      .upsert(fullRow, { onConflict: 'sheet_id', ignoreDuplicates: false });
    if (error) throw error;

    return fullRow;
  }
}

export const joumpaSyncService = new JoumpaSyncService();
