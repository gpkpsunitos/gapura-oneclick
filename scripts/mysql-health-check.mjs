#!/usr/bin/env node

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

import { getMySqlConfig } from '../lib/db/mysql-config.mjs';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const REQUIRED_REFERENCE_TABLES = [
  'app_schema_migrations',
  'stations',
  'units',
  'positions',
  'incident_types',
  'locations',
];

const config = getMySqlConfig();
const connection = await mysql.createConnection({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  connectTimeout: config.connectTimeout,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
});

try {
  const [identityRows] = await connection.query(
    'SELECT VERSION() AS version, DATABASE() AS database_name, CURRENT_USER() AS account_name'
  );
  const identity = identityRows[0];
  const version = String(identity?.version ?? '');
  if (!version.toLowerCase().includes('mariadb')) {
    throw new Error(`Expected MariaDB, received ${version || 'unknown server'}`);
  }

  const [tableRows] = await connection.query(
    `SELECT TABLE_NAME AS table_name
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (${REQUIRED_REFERENCE_TABLES.map(() => '?').join(', ')})`,
    [config.database, ...REQUIRED_REFERENCE_TABLES]
  );
  const present = new Set(tableRows.map((row) => String(row.table_name)));
  const missing = REQUIRED_REFERENCE_TABLES.filter(
    (tableName) => !present.has(tableName)
  );
  if (missing.length > 0) {
    throw new Error(`Missing required reference tables: ${missing.join(', ')}`);
  }

  const [counts] = await connection.query(
    `SELECT
       (SELECT COUNT(*) FROM stations) AS stations,
       (SELECT COUNT(*) FROM units) AS units,
       (SELECT COUNT(*) FROM positions) AS positions`
  );

  console.log(JSON.stringify({
    ok: true,
    engine: version,
    database: String(identity.database_name),
    account: String(identity.account_name),
    requiredTables: REQUIRED_REFERENCE_TABLES,
    counts: counts[0],
  }, null, 2));
} finally {
  await connection.end();
}
