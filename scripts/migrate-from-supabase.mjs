import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const DRY_RUN = process.argv.includes('--dry-run');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES = [
  'stations',
  'units',
  'positions',
  'locations',
  'incident_types',
  'users',
  'external_links',
  'performance_links',
  'ocs_quick_links',
  'ocs_tab_records',
  'custom_dashboards',
  'dashboard_charts',
  'published_dashboards',
  'quick_access_sections',
  'quick_access_tiles',
  'quick_access_settings',
  'quick_access_submissions',
  'calendar_events',
  'hc_leave_records',
  'division_documents',
  'notification_recipients',
  'report_comments',
  'report_comment_notifications',
  'report_documents',
  'evidence_upload_sessions',
  'evidence_files',
  'security_configs',
  'blocked_ips',
  'security_alerts',
];

function toMysqlVal(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:Z|\+00:00)?$/.exec(v);
    if (m) return `${m[1]} ${m[2].slice(0, 15)}`;
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function fetchAllRows(table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

if (DRY_RUN) {
  console.log('Checking Supabase table counts (dry-run)...');
  for (const t of TABLES) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? 'ERR (' + error.message + ')' : count}`);
  }
  process.exit(0);
}

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'gapura_oneclick',
});

await conn.query('SET FOREIGN_KEY_CHECKS = 0');

for (const table of TABLES) {
  try {
    const rows = await fetchAllRows(table);
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skipped)`);
      continue;
    }

    const [colRows] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
    const validCols = new Set(colRows.map((c) => c.Field));
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((c) => validCols.has(c));

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const colList = cols.map((c) => `\`${c}\``).join(', ');
      const ph = `(${cols.map(() => '?').join(', ')})`;
      const allPh = batch.map(() => ph).join(', ');
      const vals = [];
      for (const r of batch) {
        for (const c of cols) vals.push(toMysqlVal(r[c]));
      }
      const updCols = cols.filter((c) => c !== 'id');
      const updSql = updCols.length > 0
        ? updCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')
        : `\`${cols[0]}\` = VALUES(\`${cols[0]}\`)`;

      await conn.query(
        `INSERT INTO \`${table}\` (${colList}) VALUES ${allPh} ON DUPLICATE KEY UPDATE ${updSql}`,
        vals,
      );
    }
    console.log(`  ${table}: imported ${rows.length} rows`);
  } catch (err) {
    console.error(`  ${table}: FAILED - ${err.message}`);
  }
}

await conn.query('SET FOREIGN_KEY_CHECKS = 1');
await conn.end();
console.log('Supabase -> MySQL migration complete.');
