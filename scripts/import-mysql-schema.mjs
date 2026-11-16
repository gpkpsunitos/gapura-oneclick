import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const schemaPath = path.resolve(process.cwd(), 'mysql/schema.sql');
const raw = fs.readFileSync(schemaPath, 'utf8');

// Split statements respecting DELIMITER $$ blocks
const statements = [];
let delimiter = ';';
let buf = '';

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') || trimmed === '') continue;
  const delimMatch = /^DELIMITER\s+(\S+)$/i.exec(trimmed);
  if (delimMatch) {
    delimiter = delimMatch[1];
    continue;
  }
  buf += line + '\n';
  if (trimmed.endsWith(delimiter)) {
    const stmt = buf.trim().slice(0, -delimiter.length).trim();
    if (stmt) statements.push(stmt);
    buf = '';
  }
}
if (buf.trim()) statements.push(buf.trim());

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
});

for (let i = 0; i < statements.length; i++) {
  try {
    await conn.query(statements[i]);
  } catch (err) {
    console.error(`Statement #${i + 1} failed:\n${statements[i].slice(0, 300)}\nError:`, err.message);
    await conn.end();
    process.exit(1);
  }
}

const [tables] = await conn.query(
  "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?",
  [process.env.MYSQL_DATABASE || 'gapura_oneclick'],
);
console.log(`Schema imported successfully. Total tables in ${process.env.MYSQL_DATABASE || 'gapura_oneclick'}:`, tables[0].cnt);
await conn.end();
