import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';
import { notifyNewRecordEmail } from '@/lib/notifications';
import { buildReportFingerprint } from '@/lib/report-fingerprint';
import { buildReportsSyncRow } from '@/lib/report-persistence';
import type { Report } from '@/types';

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: number;
  duration: number;
  error?: string;
  joined?: boolean;
}

interface UpsertBatchResult {
  inserted: number;
  updated: number;
  errors: number;
  insertedReports: Report[];
}

interface SyncWorkItem {
  kind: 'insert' | 'update';
  report: Report;
  row: Record<string, any>;
}

interface RelinkWorkItem {
  report: Report;
  row: Record<string, any>;
  existingId: string;
  previousSheetId: string;
}

interface ExistingSyncRecord {
  id: string;
  sheet_id: string;
  source_fingerprint: string | null;
  source_sheet?: string | null;
}

interface LegacyReportRecord {
  id: string;
  sheet_id: string;
  source_fingerprint: string | null;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  totalReports: number;
  syncVersion: number;
}

export class SyncService {
  private static BATCH_SIZE = 100;
  private static DELETE_BATCH_SIZE = 500;
  private static PAGE_SIZE = 1000;
  private static activeSyncPromise: Promise<SyncResult> | null = null;

  static async syncReportsFromSheets(triggerSource = 'direct'): Promise<SyncResult> {
    if (this.activeSyncPromise) {
      console.log(`[SyncService] Joining in-progress sync (trigger: ${triggerSource})`);
      const result = await this.activeSyncPromise;
      return {
        ...result,
        joined: true,
      };
    }

    const syncPromise = this.performSyncReportsFromSheets(triggerSource);
    this.activeSyncPromise = syncPromise;

    try {
      return await syncPromise;
    } finally {
      if (this.activeSyncPromise === syncPromise) {
        this.activeSyncPromise = null;
      }
    }
  }

  private static async performSyncReportsFromSheets(triggerSource: string): Promise<SyncResult> {
    const startTime = Date.now();
    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    let errors = 0;

    try {
      console.log(`[SyncService] Starting sync from Google Sheets (trigger: ${triggerSource})...`);

      const reports = await reportsService['fetchGoogleSheetsReports']();
      console.log(`[SyncService] Fetched ${reports.length} reports from Sheets`);

      reports.forEach((report) => {
        if (!report.source_fingerprint) {
          report.source_fingerprint = buildReportFingerprint(report);
        }
      });

      const sourceSheets = Array.from(
        new Set(
          reports
            .map((report) => report.source_sheet)
            .filter((sheetName): sheetName is string => !!sheetName)
        )
      );

      const existingRecords = await this.listExistingSyncRecords(sourceSheets);
      this.logDuplicateFingerprintGroups(
        reports.map((report) => ({
          fingerprint: report.source_fingerprint,
          locator: report.original_id || report.sheet_id || report.id,
        })),
        'fetched Google Sheets rows'
      );
      this.logDuplicateFingerprintGroups(
        existingRecords.map((record) => ({
          fingerprint: record.source_fingerprint,
          locator: record.sheet_id,
        })),
        'existing reports_sync rows'
      );

      const totalProcessed = reports.length;
      const syncResult = await this.syncFetchedReports(reports, existingRecords);
      inserted += syncResult.inserted;
      updated += syncResult.updated;
      errors += syncResult.errors;

      // Hard delete rows removed from Google Sheets
      try {
        deleted = await this.deleteMissingFromSync(reports);
        if (deleted > 0) {
          console.log(`[SyncService] Deleted ${deleted} records removed from Sheets`);
        }
      } catch (delErr) {
        console.warn('[SyncService] Delete-missing step failed:', delErr);
      }

      // Reconciliation: Push local updates (Supabase -> Sheets)
      try {
        const pushed = await this.pushLocalUpdatesToSheets();
        if (pushed > 0) {
          console.log(`[SyncService] Reconciled ${pushed} local updates to Sheets`);
        }
      } catch (recErr) {
        console.warn('[SyncService] Reconciliation step failed:', recErr);
      }

      // Invalidate reports cache
      try {
        reportsService.invalidateCache();
      } catch (e) {
        console.warn('[SyncService] Failed to invalidate reports cache:', e);
      }

      const duration = Date.now() - startTime;
      console.log(
        `[SyncService] Sync completed in ${duration}ms (trigger: ${triggerSource}): ${inserted} inserted, ${updated} updated, ${deleted} deleted, ${errors} errors`
      );

      for (const report of syncResult.insertedReports) {
        await notifyNewRecordEmail(report, 'sheets-sync').catch((notificationError) => {
          console.warn('[SyncService] New-record sync notification failed:', notificationError);
        });
      }

      return {
        success: true,
        totalProcessed,
        inserted,
        updated,
        deleted,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SyncService] Sync failed (trigger: ${triggerSource}):`, errorMessage);

      return {
        success: false,
        totalProcessed: 0,
        inserted: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        duration,
        error: errorMessage,
      };
    }
  }

  private static logDuplicateFingerprintGroups(
    items: Array<{ fingerprint?: string | null; locator?: string | null }>,
    context: string
  ) {
    const grouped = new Map<string, string[]>();

    items.forEach(({ fingerprint, locator }) => {
      if (!fingerprint) return;
      const list = grouped.get(fingerprint) || [];
      list.push(locator || '-');
      grouped.set(fingerprint, list);
    });

    grouped.forEach((locators, fingerprint) => {
      if (locators.length < 2) return;
      const sampleLocators = locators.slice(0, 5).join(', ');
      console.warn(
        `[SyncService] Duplicate fingerprint detected in ${context}: ${fingerprint.slice(0, 12)}... (${locators.length} rows: ${sampleLocators})`
      );
    });
  }

  private static async listExistingSyncRecords(sourceSheets: string[]): Promise<ExistingSyncRecord[]> {
    const rows: ExistingSyncRecord[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const baseQuery = supabaseAdmin
        .from('reports_sync')
        .select('id, sheet_id, source_fingerprint, source_sheet')
        .order('sheet_id', { ascending: true })
        .range(offset, offset + this.PAGE_SIZE - 1);

      const query = sourceSheets.length > 0
        ? baseQuery.in('source_sheet', sourceSheets)
        : baseQuery;

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const batch = (data || []) as ExistingSyncRecord[];
      rows.push(...batch);
      hasMore = batch.length === this.PAGE_SIZE;
      offset += this.PAGE_SIZE;
    }

    return rows;
  }

  private static async listLegacyReports(): Promise<LegacyReportRecord[]> {
    const rows: LegacyReportRecord[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select('id, sheet_id, source_fingerprint')
        .not('sheet_id', 'is', null)
        .range(offset, offset + this.PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      const batch = (data || [])
        .filter((row: any) => typeof row.sheet_id === 'string') as LegacyReportRecord[];

      rows.push(...batch);
      hasMore = batch.length === this.PAGE_SIZE;
      offset += this.PAGE_SIZE;
    }

    return rows;
  }

  private static async syncFetchedReports(
    reports: Report[],
    existingRecords: ExistingSyncRecord[]
  ): Promise<UpsertBatchResult> {
    const existingBySheetId = new Map<string, ExistingSyncRecord>();
    const existingByFingerprint = new Map<string, ExistingSyncRecord[]>();

    existingRecords.forEach((record) => {
      existingBySheetId.set(record.sheet_id, record);
      if (!record.source_fingerprint) return;
      const list = existingByFingerprint.get(record.source_fingerprint) || [];
      list.push(record);
      existingByFingerprint.set(record.source_fingerprint, list);
    });

    const fetchedDuplicateFingerprints = new Set<string>();
    const fetchedFingerprintCounts = new Map<string, number>();
    reports.forEach((report) => {
      const fingerprint = report.source_fingerprint || buildReportFingerprint(report);
      report.source_fingerprint = fingerprint;
      fetchedFingerprintCounts.set(fingerprint, (fetchedFingerprintCounts.get(fingerprint) || 0) + 1);
    });
    fetchedFingerprintCounts.forEach((count, fingerprint) => {
      if (count > 1) fetchedDuplicateFingerprints.add(fingerprint);
    });

    const upsertItems: SyncWorkItem[] = [];
    const relinkItems: RelinkWorkItem[] = [];

    for (const report of reports) {
      const row = buildReportsSyncRow(report);
      const sheetId = String(row.sheet_id);
      const fingerprint = String(row.source_fingerprint || '');
      const exactMatch = existingBySheetId.get(sheetId);

      if (exactMatch) {
        upsertItems.push({ kind: 'update', report, row });
        continue;
      }

      const fingerprintMatches = fingerprint
        ? existingByFingerprint.get(fingerprint) || []
        : [];

      const canRelink =
        fingerprint &&
        !fetchedDuplicateFingerprints.has(fingerprint) &&
        fingerprintMatches.length === 1;

      if (canRelink) {
        const match = fingerprintMatches[0];
        relinkItems.push({
          report,
          row,
          existingId: match.id,
          previousSheetId: match.sheet_id,
        });
        continue;
      }

      if (fingerprint && fingerprintMatches.length > 1) {
        console.warn(
          `[SyncService] Ambiguous fingerprint relink skipped for ${sheetId}: ${fingerprint.slice(0, 12)}... matches ${fingerprintMatches.length} existing rows`
        );
      }

      upsertItems.push({ kind: 'insert', report, row });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const insertedReports: Report[] = [];

    for (const item of relinkItems) {
      try {
        const { error } = await supabaseAdmin
          .from('reports_sync')
          .update(item.row)
          .eq('id', item.existingId);

        if (error) {
          throw error;
        }

        await this.relinkLegacySheetReferences(
          item.previousSheetId,
          String(item.row.sheet_id),
          String(item.row.source_fingerprint || '')
        );

        updated++;
      } catch (error) {
        console.warn(
          `[SyncService] Failed to relink ${item.previousSheetId} -> ${item.row.sheet_id}:`,
          error
        );
        errors++;
      }
    }

    for (let i = 0; i < upsertItems.length; i += this.BATCH_SIZE) {
      const batch = upsertItems.slice(i, i + this.BATCH_SIZE);
      try {
        const { error } = await supabaseAdmin
          .from('reports_sync')
          .upsert(
            batch.map((item) => item.row),
            {
              onConflict: 'sheet_id',
              ignoreDuplicates: false,
            }
          );

        if (error) {
          throw error;
        }

        batch.forEach((item) => {
          if (item.kind === 'insert') {
            inserted++;
            insertedReports.push(item.report);
          } else {
            updated++;
          }
        });
      } catch (error) {
        console.error('[SyncService] Batch upsert failed:', error);
        errors += batch.length;
      }
    }

    return { inserted, updated, errors, insertedReports };
  }

  private static async relinkLegacySheetReferences(
    previousSheetId: string,
    newSheetId: string,
    sourceFingerprint: string
  ) {
    if (previousSheetId === newSheetId) return;

    const now = new Date().toISOString();

    const [legacyUpdate, commentsUpdate] = await Promise.allSettled([
      supabaseAdmin
        .from('reports')
        .update({
          sheet_id: newSheetId,
          source_fingerprint: sourceFingerprint || null,
          updated_at: now,
        })
        .eq('sheet_id', previousSheetId),
      supabaseAdmin
        .from('report_comments')
        .update({ sheet_id: newSheetId })
        .eq('sheet_id', previousSheetId),
    ]);

    if (legacyUpdate.status === 'rejected') {
      console.warn('[SyncService] Failed to relink legacy report references:', legacyUpdate.reason);
    }

    if (commentsUpdate.status === 'rejected') {
      console.warn('[SyncService] Failed to relink report comment references:', commentsUpdate.reason);
    }
  }

  /**
   * Pushes local updates (Supabase) to Google Sheets if they are newer than last sync
   * Complexity: Time O(N) | Space O(N)
   */
  private static async pushLocalUpdatesToSheets(): Promise<number> {
    let pushed = 0;
    try {
      // Find records updated in Supabase AFTER they were last synced from Sheets
      // Avoid infinite loop by only picking those with substantial time difference
      const { data: dirtyReports, error } = await supabaseAdmin
        .from('reports_sync')
        .select('*')
        .filter('updated_at', 'gt', 'synced_at')
        .order('updated_at', { ascending: false })
        .limit(50); // Batch size for safety

      if (error || !dirtyReports || dirtyReports.length === 0) return 0;

      console.log(`[SyncService] Found ${dirtyReports.length} dirty records in Supabase, pushing to Sheets...`);

      for (const report of dirtyReports) {
        try {
            // Use the reportsService to update Sheets
            // This also handles the mapping back to Sheet columns
            const success = await reportsService.updateReport(report.sheet_id, report);
            if (success) {
                // Update synced_at to prevent re-pushing in same cycle
                await supabaseAdmin
                    .from('reports_sync')
                    .update({ synced_at: new Date().toISOString() })
                    .eq('id', report.id);
                pushed++;
            }
        } catch (err) {
            console.warn(`[SyncService] Failed to push report ${report.sheet_id} to Sheets:`, err);
        }
      }
    } catch (err) {
      console.error('[SyncService] pushLocalUpdatesToSheets exception:', err);
    }
    return pushed;
  }

  /**
   * Deletes rows in reports_sync which no longer exist on Google Sheets
   * Complexity: Time O(N + M) | Space O(N) where N = sheet rows, M = db rows
   */
  private static async deleteMissingFromSync(reports: Report[]): Promise<number> {
    const fetchedIds = new Set<string>(
      reports
        .map((r) => (r as any).original_id as string | undefined)
        .filter((id): id is string => !!id)
    );
    const fetchedFingerprints = new Set<string>(
      reports
        .map((report) => report.source_fingerprint || buildReportFingerprint(report))
        .filter((fingerprint): fingerprint is string => !!fingerprint)
    );

    if (fetchedIds.size === 0 && fetchedFingerprints.size === 0) {
      // Nothing to compare; skip deletion to avoid accidental mass delete
      return 0;
    }

    // Limit deletion scope to source sheets actually fetched
    const sourceSheets = Array.from(
      new Set(
        reports
          .map((r) => (r as any).source_sheet as string | undefined)
          .filter((s): s is string => !!s)
      )
    );

    const existingSyncRows = await this.listExistingSyncRecords(sourceSheets);
    const syncToDelete = existingSyncRows.filter((row) => {
      if (fetchedIds.has(row.sheet_id)) return false;
      if (row.source_fingerprint && fetchedFingerprints.has(row.source_fingerprint)) return false;
      return true;
    });
    let deleted = 0;

    if (syncToDelete.length > 0) {
      console.log(`[SyncService] Deleting ${syncToDelete.length} orphaned records from reports_sync`);
      // Delete in batches
      for (let i = 0; i < syncToDelete.length; i += this.DELETE_BATCH_SIZE) {
        const batch = syncToDelete.slice(i, i + this.DELETE_BATCH_SIZE);
        const { data, error } = await supabaseAdmin
          .from('reports_sync')
          .delete()
          .in('id', batch.map((row) => row.id))
          .select('id');
        if (error) {
          console.warn('[SyncService] Delete batch failed:', error);
          continue;
        }
        deleted += data?.length || 0;
      }
    }

    // Also delete from legacy 'reports' table for entries mirrored from Sheets
    const existingDbRows = await this.listLegacyReports();
    const dbToDelete = existingDbRows
      .filter(({ sheet_id, source_fingerprint }) =>
        !fetchedIds.has(sheet_id) &&
        !(source_fingerprint && fetchedFingerprints.has(source_fingerprint)) &&
        (sourceSheets.length === 0 || sourceSheets.some((sheet) => sheet_id.startsWith(`${sheet}!`) || sheet_id.includes('row_')))
      )
      .map(({ id }) => id);

    if (dbToDelete.length > 0) {
      console.log(`[SyncService] Deleting ${dbToDelete.length} orphaned records from legacy reports table`);
      for (let i = 0; i < dbToDelete.length; i += this.DELETE_BATCH_SIZE) {
        const batch = dbToDelete.slice(i, i + this.DELETE_BATCH_SIZE);
        const { data, error } = await supabaseAdmin
          .from('reports')
          .delete()
          .in('id', batch)
          .select('id');
        if (error) {
          console.warn('[SyncService] Legacy delete batch failed:', error);
          continue;
        }
        deleted += data?.length || 0;
      }
    }

    return deleted;
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .select('synced_at, sync_version')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabaseAdmin
        .from('reports_sync')
        .select('*', { count: 'exact', head: true });

      return {
        lastSyncAt: data?.synced_at || null,
        totalReports: count || 0,
        syncVersion: data?.sync_version || 0,
      };
    } catch (error) {
      console.error('[SyncService] Failed to get sync status:', error);
      return {
        lastSyncAt: null,
        totalReports: 0,
        syncVersion: 0,
      };
    }
  }

  static async clearSyncedData(): Promise<{ success: boolean; deleted: number }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('id');

      if (error) {
        console.error('[SyncService] Clear error:', error);
        return { success: false, deleted: 0 };
      }

      const deleted = data?.length || 0;
      console.log(`[SyncService] Cleared ${deleted} synced reports`);
      return { success: true, deleted };
    } catch (error) {
      console.error('[SyncService] Clear exception:', error);
      return { success: false, deleted: 0 };
    }
  }
}

export const syncService = new SyncService();
