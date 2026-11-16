import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const dbName = process.env.MYSQL_DATABASE || 'gapura_oneclick';
const outPath = path.resolve(process.cwd(), 'mysql/gapura_oneclick_backup.sql');

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: dbName,
  timezone: 'Z',
});

const out = fs.createWriteStream(outPath, { encoding: 'utf8' });
const write = (line) => out.write(line + '\n');

write(`-- Gapura OneClick MySQL/MariaDB Full Backup`);
write(`-- Exported: ${new Date().toISOString()}`);
write(`-- Database: ${dbName}`);
write(``);
write(`SET NAMES utf8mb4;`);
write(`SET FOREIGN_KEY_CHECKS = 0;`);
write(`SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';`);
write(``);
write(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
write(`USE \`${dbName}\`;`);
write(``);

const [tableRows] = await conn.query(
  `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY TABLE_NAME`,
  [dbName],
);

let totalRows = 0;

for (const { TABLE_NAME: table } of tableRows) {
  const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  const createSql = createRow['Create Table'];

  write(`-- --------------------------------------------------------`);
  write(`-- Table structure for \`${table}\``);
  write(`-- --------------------------------------------------------`);
  write(`DROP TABLE IF EXISTS \`${table}\`;`);
  write(`${createSql};`);
  write(``);

  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  if (rows.length > 0) {
    totalRows += rows.length;
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `\`${c}\``).join(', ');
    const batchSize = 100;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const valuesSql = batch
        .map((row) => {
          const vals = cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (v instanceof Date) {
              return mysql.escape(v.toISOString().replace('T', ' ').replace('Z', ''));
            }
            if (typeof v === 'object') {
              return mysql.escape(JSON.stringify(v));
            }
            return mysql.escape(v);
          });
          return `(${vals.join(', ')})`;
        })
        .join(',\n');

      write(`INSERT INTO \`${table}\` (${colList}) VALUES\n${valuesSql};`);
    }
    write(``);
  }
}

const [triggers] = await conn.query(`SHOW TRIGGERS FROM \`${dbName}\``);
if (triggers.length > 0) {
  write(`-- --------------------------------------------------------`);
  write(`-- Triggers`);
  write(`-- --------------------------------------------------------`);
  write(`DELIMITER $$`);
  for (const trg of triggers) {
    write(`DROP TRIGGER IF EXISTS \`${trg.Trigger}\`$$`);
    write(`CREATE TRIGGER \`${trg.Trigger}\` ${trg.Timing} ${trg.Event} ON \`${trg.Table}\` FOR EACH ROW ${trg.Statement}$$`);
  }
  write(`DELIMITER ;`);
  write(``);
}

write(`SET FOREIGN_KEY_CHECKS = 1;`);

await new Promise((resolve) => out.end(resolve));
await conn.end();

const sizeBytes = fs.statSync(outPath).size;
console.log(`Exported ${tableRows.length} tables (${totalRows} total rows) to ${outPath} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
