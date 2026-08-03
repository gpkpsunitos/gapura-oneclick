import 'server-only';

import mysql, { type Pool } from 'mysql2/promise';

import { getMySqlConfig } from './mysql-config.mjs';
import { getOperationalDatabaseProvider } from './provider-config.mjs';

type MySqlPoolGlobal = typeof globalThis & {
  __gapuraOneclickMySqlPool?: Pool;
};

const poolGlobal = globalThis as MySqlPoolGlobal;

export function getMySqlPool(): Pool {
  const provider = getOperationalDatabaseProvider();
  if (provider !== 'mysql') {
    throw new Error(
      'MariaDB pool requested while APP_DB_PROVIDER is not set to mysql'
    );
  }

  if (poolGlobal.__gapuraOneclickMySqlPool) {
    return poolGlobal.__gapuraOneclickMySqlPool;
  }

  const config = getMySqlConfig();
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionLimit: config.connectionLimit,
    connectTimeout: config.connectTimeout,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  poolGlobal.__gapuraOneclickMySqlPool = pool;
  return pool;
}

export async function closeMySqlPool(): Promise<void> {
  const pool = poolGlobal.__gapuraOneclickMySqlPool;
  if (!pool) return;

  delete poolGlobal.__gapuraOneclickMySqlPool;
  await pool.end();
}
