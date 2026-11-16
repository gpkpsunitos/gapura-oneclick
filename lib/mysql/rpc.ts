import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getMysqlPool, normalizeMysqlRow, toMysqlValue, withTransaction } from './pool';
import type { PostgrestResponse } from './query-builder';

export async function executeMysqlRpc<T = unknown>(
  fnName: string,
  params: Record<string, unknown> = {},
): Promise<PostgrestResponse<T>> {
  try {
    switch (fnName) {
      case 'acquire_sync_lock':
        return { data: (await rpcAcquireSyncLock(params)) as unknown as T, error: null };
      case 'complete_sync_state':
        return { data: (await rpcCompleteSyncState(params)) as unknown as T, error: null };
      case 'bump_sync_state_version':
        return { data: (await rpcBumpSyncStateVersion(params)) as unknown as T, error: null };
      case 'consume_rate_limit':
        return { data: (await rpcConsumeRateLimit(params)) as unknown as T, error: null };
      case 'get_active_published_dashboard':
        return { data: (await rpcGetActivePublishedDashboard(params)) as unknown as T, error: null };
      case 'delete_report_cascade':
        return { data: (await rpcDeleteReportCascade(params)) as unknown as T, error: null };
      case 'relink_report_children_batch':
        return { data: (await rpcRelinkReportChildrenBatch(params)) as unknown as T, error: null };
      case 'upsert_report_document_bundle':
        return { data: (await rpcUpsertReportDocumentBundle(params)) as unknown as T, error: null };
      case 'dashboard_ground_overview':
        return { data: (await rpcDashboardGroundOverview(params)) as unknown as T, error: null };
      default:
        return {
          data: null,
          error: { message: `Unknown MySQL RPC function: ${fnName}`, code: 'PGRST202' },
        };
    }
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    return {
      data: null,
      error: { message: e?.message || `RPC ${fnName} failed`, code: e?.code },
    };
  }
}

async function rpcAcquireSyncLock(params: Record<string, unknown>) {
  const source = String(params.p_source || 'reports');
  const lockSeconds = Math.max(Number(params.p_lock_seconds ?? 300), 30);

  return withTransaction(async (conn) => {
    await conn.query(
      `INSERT IGNORE INTO \`sync_state\` (\`source\`, \`status\`) VALUES (?, 'idle')`,
      [source],
    );

    const [updateRes] = await conn.query<ResultSetHeader>(
      `UPDATE \`sync_state\`
       SET \`status\` = 'syncing',
           \`locked_until\` = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? SECOND),
           \`updated_at\` = UTC_TIMESTAMP(6)
       WHERE \`source\` = ?
         AND (\`locked_until\` IS NULL OR \`locked_until\` < UTC_TIMESTAMP(6) OR \`status\` <> 'syncing')`,
      [lockSeconds, source],
    );

    const acquired = updateRes.affectedRows > 0;
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT \`source\`, \`last_sync_at\`, \`sync_version\`, \`status\`, \`locked_until\`, \`last_error\`, \`row_count\`, \`updated_at\`
       FROM \`sync_state\` WHERE \`source\` = ?`,
      [source],
    );

    return rows.map((r) => ({ ...normalizeMysqlRow(r), acquired }));
  });
}

async function rpcCompleteSyncState(params: Record<string, unknown>) {
  const source = String(params.p_source || 'reports');
  const success = Boolean(params.p_success);
  const rowCount = params.p_row_count !== undefined && params.p_row_count !== null ? Number(params.p_row_count) : null;
  const errMsg = params.p_error ? String(params.p_error) : null;
  const bumpVersion = Boolean(params.p_bump_version);

  return withTransaction(async (conn) => {
    await conn.query(
      `INSERT IGNORE INTO \`sync_state\` (\`source\`, \`status\`) VALUES (?, 'idle')`,
      [source],
    );

    await conn.query(
      `UPDATE \`sync_state\`
       SET \`last_sync_at\` = CASE WHEN ? THEN UTC_TIMESTAMP(6) ELSE \`last_sync_at\` END,
           \`sync_version\` = CASE WHEN ? THEN \`sync_version\` + 1 ELSE \`sync_version\` END,
           \`status\` = CASE WHEN ? THEN 'idle' ELSE 'error' END,
           \`locked_until\` = NULL,
           \`last_error\` = CASE WHEN ? THEN NULL ELSE ? END,
           \`row_count\` = COALESCE(?, \`row_count\`),
           \`updated_at\` = UTC_TIMESTAMP(6)
       WHERE \`source\` = ?`,
      [success ? 1 : 0, bumpVersion ? 1 : 0, success ? 1 : 0, success ? 1 : 0, errMsg, rowCount, source],
    );

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM \`sync_state\` WHERE \`source\` = ?`,
      [source],
    );
    return rows[0] ? normalizeMysqlRow(rows[0]) : null;
  });
}

async function rpcBumpSyncStateVersion(params: Record<string, unknown>) {
  const source = String(params.p_source || 'reports');
  const rowCount = params.p_row_count !== undefined && params.p_row_count !== null ? Number(params.p_row_count) : null;

  return withTransaction(async (conn) => {
    await conn.query(
      `INSERT IGNORE INTO \`sync_state\` (\`source\`, \`status\`) VALUES (?, 'idle')`,
      [source],
    );

    await conn.query(
      `UPDATE \`sync_state\`
       SET \`last_sync_at\` = UTC_TIMESTAMP(6),
           \`sync_version\` = \`sync_version\` + 1,
           \`status\` = 'idle',
           \`locked_until\` = NULL,
           \`last_error\` = NULL,
           \`row_count\` = COALESCE(?, \`row_count\`),
           \`updated_at\` = UTC_TIMESTAMP(6)
       WHERE \`source\` = ?`,
      [rowCount, source],
    );

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM \`sync_state\` WHERE \`source\` = ?`,
      [source],
    );
    return rows[0] ? normalizeMysqlRow(rows[0]) : null;
  });
}

async function rpcConsumeRateLimit(params: Record<string, unknown>) {
  const key = String(params.p_key || '').trim();
  const limit = Number(params.p_limit || 1);
  const resetAtMysql = toMysqlValue(params.p_reset_at);

  if (!key || key.length > 512) {
    throw new Error('p_key must contain between 1 and 512 characters');
  }
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error('p_limit must be greater than zero');
  }

  return withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO \`rate_limits\` (\`key\`, \`count\`, \`reset_at\`)
       VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE
         \`count\` = IF(\`reset_at\` <= UTC_TIMESTAMP(6), 1, \`count\` + 1),
         \`reset_at\` = IF(\`reset_at\` <= UTC_TIMESTAMP(6), VALUES(\`reset_at\`), \`reset_at\`)`,
      [key, resetAtMysql],
    );

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT \`count\`, \`reset_at\` FROM \`rate_limits\` WHERE \`key\` = ?`,
      [key],
    );
    const row = rows[0] ? normalizeMysqlRow(rows[0]) : { count: 1, reset_at: params.p_reset_at };
    const currentCount = Number(row.count ?? 1);
    return [
      {
        allowed: currentCount <= limit,
        remaining: Math.max(limit - currentCount, 0),
        reset_at: row.reset_at,
        current_count: currentCount,
      },
    ];
  });
}

async function rpcGetActivePublishedDashboard(params: Record<string, unknown>) {
  const slug = String(params.p_slug || '');
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`id\`, \`slug\`, \`dashboard_key\`, \`tab\`, \`name\`, \`config\`
     FROM \`published_dashboards\`
     WHERE \`slug\` = ? AND \`revoked_at\` IS NULL
     LIMIT 1`,
    [slug],
  );
  return rows.map((r) => normalizeMysqlRow(r));
}

async function rpcDeleteReportCascade(params: Record<string, unknown>) {
  const rawIds = Array.isArray(params.p_report_ids) ? params.p_report_ids : [];
  const seedIds = Array.from(
    new Set(rawIds.map((v) => String(v || '').trim()).filter(Boolean)),
  );
  if (seedIds.length === 0) return { reports: 0 };

  return withTransaction(async (conn) => {
    const ph = seedIds.map(() => '?').join(', ');
    const [matchedReports] = await conn.query<RowDataPacket[]>(
      `SELECT \`id\`, \`sheet_id\`
       FROM \`ground_handling_irregularity_report\`
       WHERE \`id\` IN (${ph}) OR \`sheet_id\` IN (${ph}) OR \`original_id\` IN (${ph})`,
      [...seedIds, ...seedIds, ...seedIds],
    );

    const reportPks = Array.from(new Set(matchedReports.map((r) => String(r.id)).filter(Boolean)));
    const sheetIds = Array.from(new Set(matchedReports.map((r) => r.sheet_id).filter(Boolean).map(String)));
    const allIds = Array.from(new Set([...seedIds, ...reportPks, ...sheetIds]));
    const allPh = allIds.map(() => '?').join(', ');

    const [docRows] = await conn.query<RowDataPacket[]>(
      `SELECT \`docx_path\`, \`pdf_path\` FROM \`report_documents\` WHERE \`report_id\` IN (${allPh})`,
      allIds,
    );
    const documentPaths = docRows
      .flatMap((d) => [d.docx_path, d.pdf_path])
      .filter((p): p is string => typeof p === 'string' && p.length > 0);

    const [delDocs] = await conn.query<ResultSetHeader>(
      `DELETE FROM \`report_documents\` WHERE \`report_id\` IN (${allPh})`,
      allIds,
    );
    const [delNotifs] = await conn.query<ResultSetHeader>(
      `DELETE FROM \`report_comment_notifications\` WHERE \`report_id\` IN (${allPh})`,
      allIds,
    );
    const [delComments] = await conn.query<ResultSetHeader>(
      `DELETE FROM \`report_comments\` WHERE \`report_id\` IN (${allPh}) OR \`sheet_id\` IN (${allPh})`,
      [...allIds, ...allIds],
    );
    const [retireEvidence] = await conn.query<ResultSetHeader>(
      `UPDATE \`evidence_files\`
       SET \`status\` = 'deleted', \`report_id\` = NULL, \`report_sheet_id\` = NULL
       WHERE \`report_id\` IN (${allPh}) OR \`report_sheet_id\` IN (${allPh})`,
      [...allIds, ...allIds],
    );

    let deletedReports = 0;
    if (reportPks.length > 0) {
      const pkPh = reportPks.map(() => '?').join(', ');
      const [delRep] = await conn.query<ResultSetHeader>(
        `DELETE FROM \`ground_handling_irregularity_report\` WHERE \`id\` IN (${pkPh})`,
        reportPks,
      );
      deletedReports = delRep.affectedRows;
    }

    return {
      reports: deletedReports,
      comments: delComments.affectedRows,
      notifications: delNotifs.affectedRows,
      documents: delDocs.affectedRows,
      evidence: retireEvidence.affectedRows,
      document_paths: documentPaths,
    };
  });
}

async function rpcRelinkReportChildrenBatch(params: Record<string, unknown>) {
  const pairs = Array.isArray(params.p_pairs) ? params.p_pairs : [];
  if (pairs.length === 0) return { pairs: 0 };

  return withTransaction(async (conn) => {
    let comments = 0;
    let notifications = 0;
    let documents = 0;
    let evidence = 0;
    let sessions = 0;

    // Phase 1: move all sources to temporary IDs
    for (const pair of pairs as Array<Record<string, unknown>>) {
      const prevId = pair.previous_id ? String(pair.previous_id) : null;
      const newId = pair.new_id ? String(pair.new_id) : null;
      const prevSheet = pair.previous_sheet_id ? String(pair.previous_sheet_id) : null;
      const newSheet = pair.new_sheet_id ? String(pair.new_sheet_id) : null;
      if (!prevId || !newId || prevId === newId) continue;

      const tmpId = `relink-tmp:${prevId}`;
      await conn.query(`UPDATE \`report_comments\` SET \`report_id\` = ? WHERE \`report_id\` = ?`, [tmpId, prevId]);
      if (prevSheet) {
        await conn.query(`UPDATE \`report_comments\` SET \`report_id\` = ? WHERE \`report_id\` = ?`, [tmpId, prevSheet]);
      }
      await conn.query(`UPDATE \`report_comment_notifications\` SET \`report_id\` = ? WHERE \`report_id\` = ?`, [tmpId, prevId]);
      await conn.query(`UPDATE \`report_documents\` SET \`report_id\` = ? WHERE \`report_id\` = ?`, [tmpId, prevId]);
      await conn.query(`UPDATE \`evidence_files\` SET \`report_id\` = ? WHERE \`report_id\` = ?`, [tmpId, prevId]);

      if (prevSheet && newSheet && prevSheet !== newSheet) {
        await conn.query(
          `UPDATE \`evidence_upload_sessions\` SET \`report_sheet_id\` = ? WHERE \`report_sheet_id\` = ?`,
          [`relink-tmp:${prevSheet}`, prevSheet],
        );
      }
    }

    // Phase 2: move from temporary IDs to destination IDs
    for (const pair of pairs as Array<Record<string, unknown>>) {
      const prevId = pair.previous_id ? String(pair.previous_id) : null;
      const newId = pair.new_id ? String(pair.new_id) : null;
      const prevSheet = pair.previous_sheet_id ? String(pair.previous_sheet_id) : null;
      const newSheet = pair.new_sheet_id ? String(pair.new_sheet_id) : null;
      if (!prevId || !newId || prevId === newId) continue;

      const tmpId = `relink-tmp:${prevId}`;
      const [cRes] = await conn.query<ResultSetHeader>(
        `UPDATE \`report_comments\` SET \`report_id\` = ?, \`sheet_id\` = COALESCE(?, \`sheet_id\`) WHERE \`report_id\` = ?`,
        [newId, newSheet, tmpId],
      );
      comments += cRes.affectedRows;

      const [nRes] = await conn.query<ResultSetHeader>(
        `UPDATE \`report_comment_notifications\` SET \`report_id\` = ? WHERE \`report_id\` = ?`,
        [newId, tmpId],
      );
      notifications += nRes.affectedRows;

      const [dRes] = await conn.query<ResultSetHeader>(
        `UPDATE IGNORE \`report_documents\` SET \`report_id\` = ? WHERE \`report_id\` = ?`,
        [newId, tmpId],
      );
      documents += dRes.affectedRows;

      const [eRes] = await conn.query<ResultSetHeader>(
        `UPDATE \`evidence_files\` SET \`report_id\` = ?, \`report_sheet_id\` = COALESCE(?, \`report_sheet_id\`) WHERE \`report_id\` = ?`,
        [newId, newSheet, tmpId],
      );
      evidence += eRes.affectedRows;

      if (prevSheet && newSheet && prevSheet !== newSheet) {
        const [sRes] = await conn.query<ResultSetHeader>(
          `UPDATE \`evidence_upload_sessions\` SET \`report_sheet_id\` = ? WHERE \`report_sheet_id\` = ?`,
          [newSheet, `relink-tmp:${prevSheet}`],
        );
        sessions += sRes.affectedRows;
      }
    }

    return {
      pairs: pairs.length,
      comments,
      notifications,
      documents,
      evidence,
      sessions,
    };
  });
}

async function rpcUpsertReportDocumentBundle(params: Record<string, unknown>) {
  const reportType = String(params.p_report_type || '');
  const reportId = String(params.p_report_id || '');

  return withTransaction(async (conn) => {
    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT \`docx_path\`, \`pdf_path\` FROM \`report_documents\` WHERE \`report_type\` = ? AND \`report_id\` = ? FOR UPDATE`,
      [reportType, reportId],
    );
    const prevDocxPath = existing[0]?.docx_path ?? null;
    const prevPdfPath = existing[0]?.pdf_path ?? null;

    const newId = randomUUID();
    await conn.query(
      `INSERT INTO \`report_documents\` (
        \`id\`, \`report_type\`, \`report_id\`, \`revision_id\`,
        \`docx_path\`, \`docx_filename\`, \`docx_mime_type\`, \`docx_size_bytes\`, \`docx_sha256\`,
        \`pdf_path\`, \`pdf_filename\`, \`pdf_mime_type\`, \`pdf_size_bytes\`, \`pdf_sha256\`,
        \`edited_snapshot\`, \`signature_sha256\`, \`created_by\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(6))
      ON DUPLICATE KEY UPDATE
        \`revision_id\` = VALUES(\`revision_id\`),
        \`docx_path\` = VALUES(\`docx_path\`),
        \`docx_filename\` = VALUES(\`docx_filename\`),
        \`docx_mime_type\` = VALUES(\`docx_mime_type\`),
        \`docx_size_bytes\` = VALUES(\`docx_size_bytes\`),
        \`docx_sha256\` = VALUES(\`docx_sha256\`),
        \`pdf_path\` = VALUES(\`pdf_path\`),
        \`pdf_filename\` = VALUES(\`pdf_filename\`),
        \`pdf_mime_type\` = VALUES(\`pdf_mime_type\`),
        \`pdf_size_bytes\` = VALUES(\`pdf_size_bytes\`),
        \`pdf_sha256\` = VALUES(\`pdf_sha256\`),
        \`edited_snapshot\` = VALUES(\`edited_snapshot\`),
        \`signature_sha256\` = VALUES(\`signature_sha256\`),
        \`created_by\` = VALUES(\`created_by\`),
        \`updated_at\` = UTC_TIMESTAMP(6)`,
      [
        newId,
        reportType,
        reportId,
        params.p_revision_id,
        params.p_docx_path,
        params.p_docx_filename,
        params.p_docx_mime_type,
        params.p_docx_size_bytes,
        params.p_docx_sha256,
        params.p_pdf_path,
        params.p_pdf_filename,
        params.p_pdf_mime_type,
        params.p_pdf_size_bytes,
        params.p_pdf_sha256,
        toMysqlValue(params.p_edited_snapshot),
        params.p_signature_sha256 ?? null,
        params.p_created_by ?? null,
      ],
    );

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM \`report_documents\` WHERE \`report_type\` = ? AND \`report_id\` = ?`,
      [reportType, reportId],
    );

    return rows.map((r) => ({
      ...normalizeMysqlRow(r),
      previous_docx_path: prevDocxPath,
      previous_pdf_path: prevPdfPath,
    }));
  });
}

async function rpcDashboardGroundOverview(params: Record<string, unknown>) {
  const stationCodes = Array.isArray(params.p_station_codes)
    ? params.p_station_codes.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    : [];

  const pool = getMysqlPool();
  let whereSql = '';
  const sqlParams: unknown[] = [];

  if (stationCodes.length > 0) {
    const ph = stationCodes.map(() => '?').join(', ');
    whereSql = `WHERE UPPER(COALESCE(NULLIF(\`station_code\`, ''), NULLIF(\`branch\`, ''), NULLIF(\`reporting_branch\`, ''), '')) IN (${ph})`;
    sqlParams.push(...stationCodes);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`status\`, \`severity\`, \`severity_level\`, \`date_of_event\`, \`created_at\`,
            \`hub\`, \`station_code\`, \`branch\`, \`reporting_branch\`, \`airlines\`, \`airline\`, \`main_category\`, \`category\`
     FROM \`ground_handling_irregularity_report\` ${whereSql}`,
    sqlParams,
  );

  let total = 0;
  let resolved = 0;
  let pending = 0;
  let highSeverity = 0;
  const years = new Set<number>();
  const hubs = new Set<string>();
  const branches = new Set<string>();
  const airlines = new Set<string>();
  const categories = new Set<string>();

  for (const r of rows) {
    total++;
    const st = String(r.status || '').trim().toUpperCase();
    if (st === 'CLOSED') resolved++;
    if (st === 'OPEN') pending++;

    const sev = String(r.severity || r.severity_level || '').trim().toUpperCase();
    if (sev === 'TOP RISK' || sev === 'HIGH RISK' || sev === 'HIGH' || sev === 'CRITICAL') {
      highSeverity++;
    }

    const dt = r.date_of_event || r.created_at;
    if (dt) {
      const yr = new Date(dt as string | Date).getUTCFullYear();
      if (Number.isFinite(yr)) years.add(yr);
    }

    if (r.hub) hubs.add(String(r.hub).trim());
    const br = r.station_code || r.branch || r.reporting_branch;
    if (br) branches.add(String(br).trim());
    const al = r.airlines || r.airline;
    if (al) airlines.add(String(al).trim());
    const cat = r.main_category || r.category;
    if (cat) categories.add(String(cat).trim());
  }

  return {
    total,
    resolved,
    pending,
    highSeverity,
    years: Array.from(years).sort((a, b) => b - a),
    filterOptions: {
      hubs: Array.from(hubs).sort(),
      branches: Array.from(branches).sort(),
      airlines: Array.from(airlines).sort(),
      categories: Array.from(categories).sort(),
    },
  };
}
