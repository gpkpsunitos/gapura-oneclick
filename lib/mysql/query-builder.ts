import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getMysqlPool, normalizeMysqlRow, quoteIdent, toMysqlValue } from './pool';

export interface PostgrestError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export interface PostgrestResponse<T = unknown> {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
  status?: number;
}

interface RelationSpec {
  alias: string;
  table: string;
  fkColumn: string;
  selectExpr: string;
}

type FilterClause =
  | { kind: 'cmp'; col: string; op: string; val: unknown }
  | { kind: 'is'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[]; negate?: boolean }
  | { kind: 'contains'; col: string; val: unknown }
  | { kind: 'not'; col: string; op: string; val: unknown }
  | { kind: 'or'; expr: string };

const NON_UUID_PK_TABLES = new Set([
  'rate_limits',
  'sync_state',
  'security_configs',
  'blocked_ips',
  'external_links',
  'quick_access_settings',
  'ai_cache_entries',
  'dashboard_cache_entries',
  'evidence_upload_sessions',
]);

function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let escaped = false;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inQuotes) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        const token = input.slice(start, i).trim();
        if (token) parts.push(token);
        start = i + 1;
      }
    }
  }
  const tail = input.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function unquotePostgrestValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return trimmed;
}

function parseSelectExpression(selectExpr: string): {
  columns: string[];
  relations: RelationSpec[];
} {
  const tokens = splitTopLevelCommas(selectExpr || '*');
  const columns: string[] = [];
  const relations: RelationSpec[] = [];

  for (const token of tokens) {
    const relMatch = /^([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?(?:!([a-zA-Z0-9_]+))?\s*\(([\s\S]*)\)$/.exec(token);
    if (relMatch) {
      const [, first, second, fkHint, inner] = relMatch;
      let alias = first;
      let table = first;
      let fkColumn = fkHint || '';

      if (second) {
        // e.g. stations:station_id(...), users:created_by(...), created_by_user:created_by(...), or user:users!user_id(...)
        const userFkCols = new Set(['created_by', 'updated_by', 'reviewed_by', 'deleted_by', 'assigned_to', 'actor_id', 'user_id']);
        const isFkHint = second.endsWith('_id') || second.endsWith('_by') || userFkCols.has(second);
        if (isFkHint) {
          alias = first;
          table = userFkCols.has(second) ? 'users' : first;
          fkColumn = fkHint || second;
        } else {
          alias = first;
          table = second;
          fkColumn = fkHint || `${second.replace(/s$/, '')}_id`;
        }
      } else {
        fkColumn = fkHint || `${first.replace(/s$/, '')}_id`;
      }

      relations.push({
        alias,
        table,
        fkColumn,
        selectExpr: inner.trim() || '*',
      });
      continue;
    }

    // Handle column alias like "alias:col" -> "`col` AS `alias`"
    const aliasMatch = /^([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)$/.exec(token);
    if (aliasMatch) {
      columns.push(`${quoteIdent(aliasMatch[2])} AS ${quoteIdent(aliasMatch[1])}`);
      continue;
    }

    if (token === '*') {
      columns.push('*');
    } else {
      columns.push(quoteIdent(token));
    }
  }

  return {
    columns: columns.length > 0 ? columns : ['*'],
    relations,
  };
}

function parseOrCondition(expr: string): { sql: string; params: unknown[] } {
  const parts = splitTopLevelCommas(expr);
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const raw of parts) {
    // Support nested and(...)
    if (raw.startsWith('and(') && raw.endsWith(')')) {
      const inner = raw.slice(4, -1);
      const subParts = splitTopLevelCommas(inner);
      const subClauses: string[] = [];
      for (const sp of subParts) {
        const built = buildSinglePostgrestToken(sp, params);
        if (built) subClauses.push(built);
      }
      if (subClauses.length > 0) clauses.push(`(${subClauses.join(' AND ')})`);
      continue;
    }
    const built = buildSinglePostgrestToken(raw, params);
    if (built) clauses.push(built);
  }

  return {
    sql: clauses.length > 0 ? `(${clauses.join(' OR ')})` : '1=1',
    params,
  };
}

function buildSinglePostgrestToken(token: string, params: unknown[]): string | null {
  const m = /^([a-zA-Z0-9_]+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|not)\.(.*)$/.exec(token.trim());
  if (!m) return null;
  const [, col, op, rawVal] = m;
  const qCol = quoteIdent(col);

  if (op === 'is') {
    if (rawVal === 'null') return `${qCol} IS NULL`;
    if (rawVal === 'true') return `${qCol} = 1`;
    if (rawVal === 'false') return `${qCol} = 0`;
    return `${qCol} IS NULL`;
  }
  if (op === 'in') {
    const inner = rawVal.replace(/^\(/, '').replace(/\)$/, '');
    const items = splitTopLevelCommas(inner).map((s) => unquotePostgrestValue(s)).filter(Boolean);
    if (items.length === 0) return '1 = 0';
    params.push(...items);
    return `${qCol} IN (${items.map(() => '?').join(', ')})`;
  }
  const unquoted = unquotePostgrestValue(rawVal);
  if (op === 'like' || op === 'ilike') {
    params.push(unquoted.replace(/\*/g, '%'));
    return `${qCol} LIKE ?`;
  }
  const opMap: Record<string, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  const sqlOp = opMap[op] || '=';
  params.push(toMysqlValue(unquoted, col));
  return `${qCol} ${sqlOp} ?`;
}

function buildWhereSql(filters: FilterClause[]): { sql: string; params: unknown[] } {
  if (filters.length === 0) return { sql: '', params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];

  for (const f of filters) {
    if (f.kind === 'cmp') {
      const qCol = quoteIdent(f.col);
      if (f.val === null) {
        parts.push(f.op === '!=' ? `${qCol} IS NOT NULL` : `${qCol} IS NULL`);
      } else {
        parts.push(`${qCol} ${f.op} ?`);
        params.push(toMysqlValue(f.val, f.col));
      }
    } else if (f.kind === 'is') {
      const qCol = quoteIdent(f.col);
      if (f.val === null) parts.push(`${qCol} IS NULL`);
      else if (f.val === true) parts.push(`${qCol} = 1`);
      else if (f.val === false) parts.push(`${qCol} = 0`);
      else {
        parts.push(`${qCol} IS NULL`);
      }
    } else if (f.kind === 'in') {
      const qCol = quoteIdent(f.col);
      if (!f.vals || f.vals.length === 0) {
        parts.push(f.negate ? '1 = 1' : '1 = 0');
      } else {
        const placeholders = f.vals.map(() => '?').join(', ');
        parts.push(f.negate ? `${qCol} NOT IN (${placeholders})` : `${qCol} IN (${placeholders})`);
        for (const v of f.vals) params.push(toMysqlValue(v, f.col));
      }
    } else if (f.kind === 'contains') {
      const qCol = quoteIdent(f.col);
      parts.push(`JSON_CONTAINS(${qCol}, ?)`);
      params.push(JSON.stringify(f.val));
    } else if (f.kind === 'not') {
      const qCol = quoteIdent(f.col);
      if (f.op === 'is' && f.val === null) {
        parts.push(`${qCol} IS NOT NULL`);
      } else if (f.op === 'in') {
        const raw = Array.isArray(f.val)
          ? f.val
          : String(f.val).replace(/^\(/, '').replace(/\)$/, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
        if (raw.length === 0) {
          parts.push('1 = 1');
        } else {
          parts.push(`${qCol} NOT IN (${raw.map(() => '?').join(', ')})`);
          for (const v of raw) params.push(toMysqlValue(v, f.col));
        }
      } else if (f.op === 'eq') {
        parts.push(`${qCol} != ?`);
        params.push(toMysqlValue(f.val, f.col));
      } else if (f.op === 'ilike' || f.op === 'like') {
        parts.push(`${qCol} NOT LIKE ?`);
        params.push(String(f.val).replace(/\*/g, '%'));
      }
    } else if (f.kind === 'or') {
      const built = parseOrCondition(f.expr);
      parts.push(built.sql);
      params.push(...built.params);
    }
  }

  return {
    sql: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '',
    params,
  };
}

export class MysqlQueryBuilder<T = any> implements PromiseLike<PostgrestResponse<T>> {
  private readonly table: string;
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selectExpr = '*';
  private returnSelect = false;
  private countMode: 'exact' | 'planned' | 'estimated' | null = null;
  private headOnly = false;
  private filters: FilterClause[] = [];
  private orders: Array<{ col: string; ascending: boolean }> = [];
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(table: string) {
    this.table = table;
  }

  select(
    columns = '*',
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ): this {
    if (this.operation === 'select') {
      this.selectExpr = columns;
    } else {
      this.returnSelect = true;
      this.selectExpr = columns;
    }
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.headOnly = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(
    values: Record<string, unknown>,
    options?: { count?: 'exact' | 'planned' | 'estimated' },
  ): this {
    this.operation = 'update';
    this.payload = values;
    if (options?.count) this.countMode = options.count;
    return this;
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean; count?: 'exact' | 'planned' | 'estimated' },
  ): this {
    this.operation = 'upsert';
    this.payload = values;
    this.upsertOptions = options || {};
    if (options?.count) this.countMode = options.count;
    return this;
  }

  delete(options?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    this.operation = 'delete';
    if (options?.count) this.countMode = options.count;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '=', val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '!=', val });
    return this;
  }

  gt(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '>', val });
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '>=', val });
    return this;
  }

  lt(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '<', val });
    return this;
  }

  lte(col: string, val: unknown): this {
    this.filters.push({ kind: 'cmp', col, op: '<=', val });
    return this;
  }

  like(col: string, pattern: string): this {
    this.filters.push({ kind: 'cmp', col, op: 'LIKE', val: pattern });
    return this;
  }

  ilike(col: string, pattern: string): this {
    this.filters.push({ kind: 'cmp', col, op: 'LIKE', val: pattern });
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push({ kind: 'is', col, val });
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push({ kind: 'in', col, vals });
    return this;
  }

  contains(col: string, val: unknown): this {
    this.filters.push({ kind: 'contains', col, val });
    return this;
  }

  not(col: string, op: string, val: unknown): this {
    this.filters.push({ kind: 'not', col, op, val });
    return this;
  }

  filter(col: string, op: string, val: unknown): this {
    const cleanOp = op.replace(/^not\./, '');
    if (op.startsWith('not.')) {
      return this.not(col, cleanOp, val);
    }
    const opMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      like: 'LIKE',
      ilike: 'LIKE',
    };
    if (cleanOp === 'is') return this.is(col, val);
    if (cleanOp === 'in') {
      const arr = Array.isArray(val)
        ? val
        : String(val).replace(/^\(/, '').replace(/\)$/, '').split(',').map((s) => s.trim());
      return this.in(col, arr);
    }
    this.filters.push({ kind: 'cmp', col, op: opMap[cleanOp] || '=', val });
    return this;
  }

  match(obj: Record<string, unknown>): this {
    for (const [col, val] of Object.entries(obj)) {
      this.eq(col, val);
    }
    return this;
  }

  or(expr: string): this {
    this.filters.push({ kind: 'or', expr });
    return this;
  }

  order(col: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push({ col, ascending: options?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetVal = Math.max(0, from);
    this.limitVal = Math.max(1, to - from + 1);
    return this;
  }

  single(): MysqlQueryBuilder<any> {
    this.singleMode = 'single';
    return this as unknown as MysqlQueryBuilder<any>;
  }

  maybeSingle(): MysqlQueryBuilder<any> {
    this.singleMode = 'maybeSingle';
    return this as unknown as MysqlQueryBuilder<any>;
  }

  then<TResult1 = PostgrestResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<PostgrestResponse<T>> {
    try {
      switch (this.operation) {
        case 'select':
          return await this.executeSelect();
        case 'insert':
          return await this.executeInsert();
        case 'update':
          return await this.executeUpdate();
        case 'upsert':
          return await this.executeUpsert();
        case 'delete':
          return await this.executeDelete();
      }
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      return {
        data: null,
        error: {
          message: e?.message || 'MySQL query failed',
          code: e?.code,
        },
        count: null,
      };
    }
  }

  private async hydrateRelations(
    rows: Record<string, unknown>[],
    relations: RelationSpec[],
  ): Promise<void> {
    if (rows.length === 0 || relations.length === 0) return;
    const pool = getMysqlPool();

    for (const rel of relations) {
      const fkValues = Array.from(
        new Set(
          rows
            .map((r) => r[rel.fkColumn])
            .filter((v): v is string => typeof v === 'string' && v.length > 0),
        ),
      );

      if (fkValues.length === 0) {
        for (const r of rows) r[rel.alias] = null;
        continue;
      }

      const { columns, relations: nestedRelations } = parseSelectExpression(rel.selectExpr);
      const colList = columns.includes('*')
        ? '*'
        : Array.from(new Set([...columns, quoteIdent('id')])).join(', ');
      const placeholders = fkValues.map(() => '?').join(', ');
      const sql = `SELECT ${colList} FROM ${quoteIdent(rel.table)} WHERE \`id\` IN (${placeholders})`;
      const [relRows] = await pool.query<RowDataPacket[]>(sql, fkValues);
      const normalized = relRows.map((rr) => normalizeMysqlRow(rr));

      if (nestedRelations.length > 0) {
        await this.hydrateRelations(normalized, nestedRelations);
      }

      const byId = new Map<string, Record<string, unknown>>();
      for (const nr of normalized) {
        if (typeof nr.id === 'string') byId.set(nr.id, nr);
      }

      for (const r of rows) {
        const fk = r[rel.fkColumn];
        r[rel.alias] = typeof fk === 'string' ? (byId.get(fk) ?? null) : null;
      }
    }
  }

  private async executeSelect(): Promise<PostgrestResponse<T>> {
    const pool = getMysqlPool();
    const qTable = quoteIdent(this.table);
    const { columns, relations } = parseSelectExpression(this.selectExpr);
    const { sql: whereSql, params } = buildWhereSql(this.filters);

    let totalCount: number | null = null;
    if (this.countMode) {
      const countSql = `SELECT COUNT(*) AS total FROM ${qTable} ${whereSql}`;
      const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
      totalCount = Number(countRows[0]?.total ?? 0);
    }

    if (this.headOnly) {
      return { data: null, error: null, count: totalCount };
    }

    const selectCols = [...columns];
    if (!selectCols.includes('*')) {
      for (const rel of relations) {
        const qFk = quoteIdent(rel.fkColumn);
        if (!selectCols.includes(qFk)) selectCols.push(qFk);
      }
    }

    const orderSql =
      this.orders.length > 0
        ? `ORDER BY ${this.orders.map((o) => `${quoteIdent(o.col)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')}`
        : '';

    let limitSql = '';
    if (this.limitVal !== null && this.offsetVal !== null) {
      limitSql = `LIMIT ${this.limitVal} OFFSET ${this.offsetVal}`;
    } else if (this.limitVal !== null) {
      limitSql = `LIMIT ${this.limitVal}`;
    } else if (this.singleMode !== 'none') {
      limitSql = 'LIMIT 2';
    }

    const sql = `SELECT ${selectCols.join(', ')} FROM ${qTable} ${whereSql} ${orderSql} ${limitSql}`;
    const [rawRows] = await pool.query<RowDataPacket[]>(sql, params);
    const rows = rawRows.map((r) => normalizeMysqlRow(r));

    await this.hydrateRelations(rows, relations);

    if (this.singleMode === 'single') {
      if (rows.length === 0) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, count: totalCount };
      }
      if (rows.length > 1) {
        return { data: null, error: { message: 'JSON object requested, multiple rows returned', code: 'PGRST116' }, count: totalCount };
      }
      return { data: rows[0] as unknown as T, error: null, count: totalCount };
    }

    if (this.singleMode === 'maybeSingle') {
      if (rows.length > 1) {
        return { data: null, error: { message: 'JSON object requested, multiple rows returned', code: 'PGRST116' }, count: totalCount };
      }
      return { data: (rows[0] ?? null) as unknown as T, error: null, count: totalCount };
    }

    return { data: rows as unknown as T, error: null, count: totalCount };
  }

  private async executeInsert(): Promise<PostgrestResponse<T>> {
    const pool = getMysqlPool();
    const qTable = quoteIdent(this.table);
    const items = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
    if (items.length === 0) return { data: [] as unknown as T, error: null };

    const prepared = items.map((item) => {
      const copy = { ...item };
      if (!NON_UUID_PK_TABLES.has(this.table) && copy.id === undefined) {
        copy.id = randomUUID();
      }
      return copy;
    });

    const cols = Array.from(new Set(prepared.flatMap((row) => Object.keys(row))));
    const colList = cols.map((c) => quoteIdent(c)).join(', ');
    const rowPlaceholders = `(${cols.map(() => '?').join(', ')})`;
    const allPlaceholders = prepared.map(() => rowPlaceholders).join(', ');
    const params: unknown[] = [];

    for (const row of prepared) {
      for (const col of cols) {
        params.push(toMysqlValue(row[col], col));
      }
    }

    const sql = `INSERT INTO ${qTable} (${colList}) VALUES ${allPlaceholders}`;
    const [result] = await pool.query<ResultSetHeader>(sql, params);

    if (!this.returnSelect) {
      return { data: null, error: null };
    }

    const ids = prepared.map((r) => r.id).filter(Boolean);
    if (ids.length > 0) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${qTable} WHERE \`id\` IN (${ids.map(() => '?').join(', ')})`,
        ids,
      );
      const normalized = rows.map((r) => normalizeMysqlRow(r));
      return {
        data: (this.singleMode !== 'none' ? (normalized[0] ?? null) : normalized) as unknown as T,
        error: null,
      };
    }

    if (result.insertId) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${qTable} WHERE \`id\` = ?`,
        [result.insertId],
      );
      const normalized = rows.map((r) => normalizeMysqlRow(r));
      return {
        data: (this.singleMode !== 'none' ? (normalized[0] ?? null) : normalized) as unknown as T,
        error: null,
      };
    }

    return { data: prepared as unknown as T, error: null };
  }

  private async executeUpdate(): Promise<PostgrestResponse<T>> {
    const pool = getMysqlPool();
    const qTable = quoteIdent(this.table);
    const patch = (this.payload || {}) as Record<string, unknown>;
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return { data: null, error: null };

    const { sql: whereSql, params: whereParams } = buildWhereSql(this.filters);

    let targetIds: unknown[] = [];
    if (this.returnSelect) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${qTable} ${whereSql}`,
        whereParams,
      );
      targetIds = existing.map((r) => r.id).filter(Boolean);
    }

    const setClause = entries.map(([col]) => `${quoteIdent(col)} = ?`).join(', ');
    const setParams = entries.map(([col, val]) => toMysqlValue(val, col));
    const sql = `UPDATE ${qTable} SET ${setClause} ${whereSql}`;
    const [updateRes] = await pool.query<ResultSetHeader>(sql, [...setParams, ...whereParams]);
    const totalCount = this.countMode ? updateRes.affectedRows : null;

    if (!this.returnSelect) {
      return { data: null, error: null, count: totalCount };
    }

    if (updateRes.affectedRows === 0) {
      if (this.singleMode === 'single') {
        return {
          data: null,
          error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
          count: totalCount,
        };
      }
      return {
        data: (this.singleMode === 'maybeSingle' ? null : []) as unknown as T,
        error: null,
        count: totalCount,
      };
    }

    const [updatedRows] =
      targetIds.length > 0
        ? await pool.query<RowDataPacket[]>(
            `SELECT * FROM ${qTable} WHERE \`id\` IN (${targetIds.map(() => '?').join(', ')})`,
            targetIds,
          )
        : await pool.query<RowDataPacket[]>(`SELECT * FROM ${qTable} ${whereSql}`, whereParams);

    const normalized = updatedRows.map((r) => normalizeMysqlRow(r));
    return {
      data: (this.singleMode !== 'none' ? (normalized[0] ?? null) : normalized) as unknown as T,
      error: null,
      count: totalCount,
    };
  }

  private async executeUpsert(): Promise<PostgrestResponse<T>> {
    const pool = getMysqlPool();
    const qTable = quoteIdent(this.table);
    const items = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
    if (items.length === 0) return { data: [] as unknown as T, error: null };

    const prepared = items.map((item) => {
      const copy = { ...item };
      if (!NON_UUID_PK_TABLES.has(this.table) && copy.id === undefined) {
        copy.id = randomUUID();
      }
      return copy;
    });

    const cols = Array.from(new Set(prepared.flatMap((row) => Object.keys(row))));
    const colList = cols.map((c) => quoteIdent(c)).join(', ');
    const rowPlaceholders = `(${cols.map(() => '?').join(', ')})`;
    const allPlaceholders = prepared.map(() => rowPlaceholders).join(', ');
    const params: unknown[] = [];

    for (const row of prepared) {
      for (const col of cols) {
        params.push(toMysqlValue(row[col], col));
      }
    }

    const conflictCols = new Set(
      (this.upsertOptions.onConflict || 'id')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );

    let sql: string;
    if (this.upsertOptions.ignoreDuplicates) {
      sql = `INSERT IGNORE INTO ${qTable} (${colList}) VALUES ${allPlaceholders}`;
    } else {
      const updateCols = cols.filter((c) => !conflictCols.has(c) && c !== 'id');
      const updateClause =
        updateCols.length > 0
          ? updateCols.map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`).join(', ')
          : `${quoteIdent(cols[0])} = VALUES(${quoteIdent(cols[0])})`;
      sql = `INSERT INTO ${qTable} (${colList}) VALUES ${allPlaceholders} ON DUPLICATE KEY UPDATE ${updateClause}`;
    }

    await pool.query<ResultSetHeader>(sql, params);

    if (!this.returnSelect) {
      return { data: null, error: null };
    }

    const conflictKey = Array.from(conflictCols)[0] || 'id';
    const keyValues = prepared.map((r) => r[conflictKey]).filter((v) => v !== undefined && v !== null);
    if (keyValues.length > 0) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${qTable} WHERE ${quoteIdent(conflictKey)} IN (${keyValues.map(() => '?').join(', ')})`,
        keyValues,
      );
      const normalized = rows.map((r) => normalizeMysqlRow(r));
      return {
        data: (this.singleMode !== 'none' ? (normalized[0] ?? null) : normalized) as unknown as T,
        error: null,
      };
    }

    return { data: prepared as unknown as T, error: null };
  }

  private async executeDelete(): Promise<PostgrestResponse<T>> {
    const pool = getMysqlPool();
    const qTable = quoteIdent(this.table);
    const { sql: whereSql, params } = buildWhereSql(this.filters);

    let deletedRows: Record<string, unknown>[] = [];
    if (this.returnSelect) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${qTable} ${whereSql}`,
        params,
      );
      deletedRows = existing.map((r) => normalizeMysqlRow(r));
    }

    await pool.query<ResultSetHeader>(`DELETE FROM ${qTable} ${whereSql}`, params);

    if (!this.returnSelect) {
      return { data: null, error: null };
    }

    return {
      data: (this.singleMode !== 'none' ? (deletedRows[0] ?? null) : deletedRows) as unknown as T,
      error: null,
    };
  }
}
