import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import mysql from 'mysql2/promise';

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@gapura.local').trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
const fullName = process.env.SEED_ADMIN_NAME || 'Super Admin Local';

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'gapura_oneclick',
});

// Ensure at least one station exists
const stationId = 'cgk-station-001';
await conn.query(
  `INSERT IGNORE INTO \`stations\` (\`id\`, \`code\`, \`name\`) VALUES (?, 'CGK', 'Soekarno-Hatta International Airport')`,
  [stationId],
);

const hash = await bcrypt.hash(password, 10);
const userId = randomUUID();

await conn.query(
  `INSERT INTO \`users\` (\`id\`, \`email\`, \`password\`, \`full_name\`, \`role\`, \`status\`, \`station_id\`, \`division\`)
   VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 'active', ?, 'GENERAL')
   ON DUPLICATE KEY UPDATE
     \`password\` = VALUES(\`password\`),
     \`role\` = 'SUPER_ADMIN',
     \`status\` = 'active'`,
  [userId, email, hash, fullName, stationId],
);

console.log(`Seeded SUPER_ADMIN user: ${email} / ${password}`);
await conn.end();
