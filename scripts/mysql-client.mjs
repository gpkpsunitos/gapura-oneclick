import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

let pool = null;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl && databaseUrl.startsWith('mysql://')) {
      pool = mysql.createPool({ uri: databaseUrl, waitForConnections: true, connectionLimit: 10, timezone: 'Z' });
    } else {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD ?? '',
        database: process.env.MYSQL_DATABASE || 'gapura_oneclick',
        waitForConnections: true,
        connectionLimit: 10,
        timezone: 'Z',
      });
    }
  }
  return pool;
}

function quoteIdent(id) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) throw new Error(`Invalid SQL identifier: ${id}`);
  return `\`${id}\``;
}

function toMysqlVal(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString().replace('T', ' ').replace('Z', '');
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:Z|\+00:00)?$/.exec(v);
    if (m) return `${m[1]} ${m[2].slice(0, 15)}`;
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

class ScriptQueryBuilder {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.cols = '*';
    this.filters = [];
    this.orders = [];
    this.limitVal = null;
    this.offsetVal = null;
    this.payload = null;
    this.countMode = null;
    this.headOnly = false;
    this.upsertOpts = {};
  }
  select(cols = '*', opts = {}) {
    if (this.op === 'select') this.cols = cols;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(val) { this.op = 'insert'; this.payload = val; return this; }
  update(val) { this.op = 'update'; this.payload = val; return this; }
  upsert(val, opts = {}) { this.op = 'upsert'; this.payload = val; this.upsertOpts = opts; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col, val) { this.filters.push({ kind: 'cmp', col, op: '=', val }); return this; }
  neq(col, val) { this.filters.push({ kind: 'cmp', col, op: '!=', val }); return this; }
  in(col, vals) { this.filters.push({ kind: 'in', col, vals }); return this; }
  order(col, opts = {}) { this.orders.push({ col, asc: opts?.ascending !== false }); return this; }
  limit(n) { this.limitVal = n; return this; }
  range(from, to) { this.offsetVal = Math.max(0, from); this.limitVal = Math.max(1, to - from + 1); return this; }
  then(onFulfilled, onRejected) { return this.exec().then(onFulfilled, onRejected); }

  buildWhere() {
    if (this.filters.length === 0) return { sql: '', params: [] };
    const parts = [];
    const params = [];
    for (const f of this.filters) {
      if (f.kind === 'cmp') {
        if (f.val === null) {
          parts.push(`${quoteIdent(f.col)} ${f.op === '!=' ? 'IS NOT NULL' : 'IS NULL'}`);
        } else {
          parts.push(`${quoteIdent(f.col)} ${f.op} ?`);
          params.push(toMysqlVal(f.val));
        }
      } else if (f.kind === 'in') {
        if (!f.vals || f.vals.length === 0) {
          parts.push('1 = 0');
        } else {
          parts.push(`${quoteIdent(f.col)} IN (${f.vals.map(() => '?').join(', ')})`);
          params.push(...f.vals.map(toMysqlVal));
        }
      }
    }
    return { sql: `WHERE ${parts.join(' AND ')}`, params };
  }

  async exec() {
    try {
      const p = getPool();
      const qt = quoteIdent(this.table);
      const { sql: whereSql, params } = this.buildWhere();

      if (this.op === 'select') {
        let count = null;
        if (this.countMode) {
          const [cRows] = await p.query(`SELECT COUNT(*) AS total FROM ${qt} ${whereSql}`, params);
          count = Number(cRows[0]?.total ?? 0);
        }
        if (this.headOnly) return { data: null, error: null, count };
        const selCols = this.cols === '*' ? '*' : this.cols.split(',').map((c) => quoteIdent(c.trim())).join(', ');
        const ordSql = this.orders.length > 0
          ? `ORDER BY ${this.orders.map((o) => `${quoteIdent(o.col)} ${o.asc ? 'ASC' : 'DESC'}`).join(', ')}`
          : '';
        const limSql = this.limitVal !== null
          ? (this.offsetVal !== null ? `LIMIT ${this.limitVal} OFFSET ${this.offsetVal}` : `LIMIT ${this.limitVal}`)
          : '';
        const [rows] = await p.query(`SELECT ${selCols} FROM ${qt} ${whereSql} ${ordSql} ${limSql}`, params);
        return { data: rows.map(normalizeRow), error: null, count };
      }

      if (this.op === 'upsert' || this.op === 'insert') {
        const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r) => ({
          ...(r.id === undefined ? { id: randomUUID() } : {}),
          ...r,
        }));
        if (items.length === 0) return { data: [], error: null };
        const cols = Array.from(new Set(items.flatMap((r) => Object.keys(r))));
        const colList = cols.map(quoteIdent).join(', ');
        const ph = `(${cols.map(() => '?').join(', ')})`;
        const allPh = items.map(() => ph).join(', ');
        const vals = [];
        for (const r of items) for (const c of cols) vals.push(toMysqlVal(r[c]));

        if (this.op === 'insert') {
          await p.query(`INSERT INTO ${qt} (${colList}) VALUES ${allPh}`, vals);
        } else {
          const conflict = new Set((this.upsertOpts.onConflict || 'id').split(',').map((s) => s.trim()));
          const upd = cols.filter((c) => !conflict.has(c) && c !== 'id');
          const updSql = upd.length > 0
            ? upd.map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`).join(', ')
            : `${quoteIdent(cols[0])} = VALUES(${quoteIdent(cols[0])})`;
          await p.query(`INSERT INTO ${qt} (${colList}) VALUES ${allPh} ON DUPLICATE KEY UPDATE ${updSql}`, vals);
        }
        return { data: items, error: null };
      }

      if (this.op === 'update') {
        const entries = Object.entries(this.payload || {}).filter(([, v]) => v !== undefined);
        const setSql = entries.map(([c]) => `${quoteIdent(c)} = ?`).join(', ');
        const setParams = entries.map(([, v]) => toMysqlVal(v));
        await p.query(`UPDATE ${qt} SET ${setSql} ${whereSql}`, [...setParams, ...params]);
        return { data: null, error: null };
      }

      if (this.op === 'delete') {
        await p.query(`DELETE FROM ${qt} ${whereSql}`, params);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'MySQL error', code: err?.code } };
    }
  }
}

export function createMysqlScriptClient() {
  return {
    from(table) {
      return new ScriptQueryBuilder(table);
    },
    async rpc(fnName, params = {}) {
      if (fnName !== 'relink_report_children_batch') {
        return { data: null, error: { message: `Unsupported script RPC: ${fnName}` } };
      }
      const pairs = Array.isArray(params.p_pairs) ? params.p_pairs : [];
      if (pairs.length === 0) return { data: { pairs: 0 }, error: null };
      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        for (const pair of pairs) {
          if (!pair.previous_id || !pair.new_id || pair.previous_id === pair.new_id) continue;
          const tmp = `relink-tmp:${pair.previous_id}`;
          await conn.query('UPDATE `report_comments` SET `report_id` = ? WHERE `report_id` = ?', [tmp, pair.previous_id]);
          if (pair.previous_sheet_id) {
            await conn.query('UPDATE `report_comments` SET `report_id` = ? WHERE `report_id` = ?', [tmp, pair.previous_sheet_id]);
          }
          await conn.query('UPDATE `report_comment_notifications` SET `report_id` = ? WHERE `report_id` = ?', [tmp, pair.previous_id]);
          await conn.query('UPDATE `report_documents` SET `report_id` = ? WHERE `report_id` = ?', [tmp, pair.previous_id]);
          await conn.query('UPDATE `evidence_files` SET `report_id` = ? WHERE `report_id` = ?', [tmp, pair.previous_id]);
        }
        for (const pair of pairs) {
          if (!pair.previous_id || !pair.new_id || pair.previous_id === pair.new_id) continue;
          const tmp = `relink-tmp:${pair.previous_id}`;
          await conn.query('UPDATE `report_comments` SET `report_id` = ?, `sheet_id` = COALESCE(?, `sheet_id`) WHERE `report_id` = ?', [pair.new_id, pair.new_sheet_id || null, tmp]);
          await conn.query('UPDATE `report_comment_notifications` SET `report_id` = ? WHERE `report_id` = ?', [pair.new_id, tmp]);
          await conn.query('UPDATE IGNORE `report_documents` SET `report_id` = ? WHERE `report_id` = ?', [pair.new_id, tmp]);
          await conn.query('UPDATE `evidence_files` SET `report_id` = ?, `report_sheet_id` = COALESCE(?, `report_sheet_id`) WHERE `report_id` = ?', [pair.new_id, pair.new_sheet_id || null, tmp]);
        }
        await conn.commit();
        return { data: { pairs: pairs.length }, error: null };
      } catch (err) {
        await conn.rollback();
        return { data: null, error: { message: err?.message || 'Relink failed' } };
      } finally {
        conn.release();
      }
    },
  };
}
