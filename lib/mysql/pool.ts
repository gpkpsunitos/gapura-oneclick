import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';

declare global {
  var __gapuraMysqlPool: Pool | undefined;
}

function buildPoolConfig(): mysql.PoolOptions {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl && databaseUrl.startsWith('mysql://')) {
    return {
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 20),
      queueLimit: 0,
      timezone: 'Z',
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
    };
  }

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE || 'gapura_oneclick',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 20),
    queueLimit: 0,
    timezone: 'Z',
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
  };
}

export function getMysqlPool(): Pool {
  if (!globalThis.__gapuraMysqlPool) {
    globalThis.__gapuraMysqlPool = mysql.createPool(buildPoolConfig());
  }
  return globalThis.__gapuraMysqlPool;
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getMysqlPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const DATE_ONLY_COLUMNS = new Set([
  'date_of_event',
  'incident_date',
  'event_date',
  'recurrence_end_date',
  'start_date',
  'end_date',
  'meeting_date',
]);

const BOOLEAN_COLUMNS = new Set([
  'is_revoked',
  'is_flight_related',
  'is_gse_related',
  'is_system_message',
  'is_recurring',
  'is_deleted',
  'is_active',
  'is_public',
  'is_visible',
  'is_password_protected',
  'is_maintenance',
  'enabled',
  'acquired',
  'allowed',
]);

/**
 * Normalizes a MySQL row into the JS shape expected by the app (ISO strings for
 * timestamps, YYYY-MM-DD for DATE columns, booleans for TINYINT(1) flags, parsed JSON).
 */
export function normalizeMysqlRow(row: RowDataPacket | Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val instanceof Date) {
      if (DATE_ONLY_COLUMNS.has(key)) {
        out[key] = val.toISOString().slice(0, 10);
      } else {
        out[key] = val.toISOString();
      }
      continue;
    }
    if (BOOLEAN_COLUMNS.has(key) && (val === 0 || val === 1)) {
      out[key] = val === 1;
      continue;
    }
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        out[key] = JSON.parse(val);
        continue;
      } catch {
        // Not valid JSON, keep as plain string
      }
    }
    out[key] = val;
  }
  return out;
}

/**
 * Converts a JS value to a MySQL-bindable parameter.
 * ISO-8601 strings are converted to MySQL DATETIME(6) format; objects/arrays become JSON.
 */
export function toMysqlValue(value: unknown, columnName?: string): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) {
    if (columnName && DATE_ONLY_COLUMNS.has(columnName)) {
      return value.toISOString().slice(0, 10);
    }
    return value.toISOString().replace('T', ' ').replace('Z', '');
  }
  if (typeof value === 'string') {
    // Bare YYYY-MM-DD for DATE columns
    if (columnName && DATE_ONLY_COLUMNS.has(columnName)) {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
      if (m) return m[1];
    }
    // ISO-8601 timestamp string -> MySQL DATETIME(6)
    const isoMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:Z|\+00:00)?$/.exec(value);
    if (isoMatch) {
      return `${isoMatch[1]} ${isoMatch[2].slice(0, 15)}`;
    }
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

export function quoteIdent(ident: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(ident)) {
    throw new Error(`Invalid SQL identifier: ${ident}`);
  }
  return `\`${ident}\``;
}
