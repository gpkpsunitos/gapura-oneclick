import { MysqlQueryBuilder, type PostgrestResponse } from './query-builder';
import { executeMysqlRpc } from './rpc';
import { createLocalStorageBucket } from './storage';

class MysqlRpcBuilder<T = any> implements PromiseLike<PostgrestResponse<T>> {
  private readonly fnName: string;
  private readonly params: Record<string, unknown>;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(fnName: string, params: Record<string, unknown> = {}) {
    this.fnName = fnName;
    this.params = params;
  }

  single(): MysqlRpcBuilder<any> {
    this.singleMode = 'single';
    return this as unknown as MysqlRpcBuilder<any>;
  }

  maybeSingle(): MysqlRpcBuilder<any> {
    this.singleMode = 'maybeSingle';
    return this as unknown as MysqlRpcBuilder<any>;
  }

  then<TResult1 = PostgrestResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<PostgrestResponse<T>> {
    const res = await executeMysqlRpc<unknown>(this.fnName, this.params);
    if (res.error || this.singleMode === 'none') {
      return res as PostgrestResponse<T>;
    }
    const rows = Array.isArray(res.data) ? res.data : res.data !== null ? [res.data] : [];
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
        };
      }
      return { data: rows[0] as T, error: null };
    }
    if (rows.length > 1) {
      return {
        data: null,
        error: { message: 'JSON object requested, multiple rows returned', code: 'PGRST116' },
      };
    }
    return { data: (rows[0] ?? null) as T, error: null };
  }
}

export function createMysqlClient() {
  return {
    from<T = any[]>(table: string): MysqlQueryBuilder<T> {
      return new MysqlQueryBuilder<T>(table);
    },
    rpc<T = any>(fnName: string, params?: Record<string, unknown>): MysqlRpcBuilder<T> {
      return new MysqlRpcBuilder<T>(fnName, params);
    },
    storage: {
      from(bucket: string) {
        return createLocalStorageBucket(bucket);
      },
    },
  };
}
