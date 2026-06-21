// ponytail: full-row dumper. Writes one JSON file with all tabs of IRRS_MAIN
// as {tab_name: [{col: val, ...}, ...]} — the shape train_rca.py expects.
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv();
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
const out = {};
for (const t of meta.data.sheets) {
  const name = t.properties.title;
  const range = `'${name}'!A:ZZ`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId, range,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  const rows = res.data.values || [];
  if (rows.length < 2) { out[name] = []; continue; }
  const headers = rows[0].map((h, i) => String(h ?? `col_${i}`).trim() || `col_${i}`);
  out[name] = rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  console.error(`${name}: ${out[name].length} rows`);
}

const outPath = path.join(process.cwd(), 'docs/audit/records.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.error(`wrote ${outPath}`);
