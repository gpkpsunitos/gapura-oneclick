// ponytail: schema dumper. Uses .env creds directly (no server-only import).
// Output: docs/audit/schema.json + tab dumps to /tmp.
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

const TARGETS = [
  { name: 'IRRS_MAIN',         id: env.GOOGLE_SHEET_ID },
  { name: 'JOUMPA',            id: env.JOUMPA_SHEET_ID },
  { name: 'SLA_FULL_SERVICE',  id: env.SLA_FULL_SERVICE_SHEET_ID },
  { name: 'WSN',               id: env.WSN_SHEET_ID },
  { name: 'HC_SHEETS',         id: env.HC_SHEETS },
];

function inferType(values) {
  const non = values.filter(v => v !== '' && v != null);
  if (non.length === 0) return 'empty';
  const isNum = non.every(v => /^-?\d+(\.\d+)?$/.test(String(v).trim()));
  if (isNum) return 'number';
  const isDate = non.every(v => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(v)) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(String(v)));
  if (isDate) return 'date';
  const isBool = non.every(v => /^(true|false|yes|no|y|n|0|1)$/i.test(String(v).trim()));
  if (isBool) return 'bool';
  return 'string';
}

async function profileTab(spreadsheetId, sheetName, gridRowCount) {
  // Pull up to first 2000 rows for profiling. Lazy ceiling.
  const range = `'${sheetName}'!A1:ZZ${Math.min(gridRowCount, 2001)}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' });
  const rows = res.data.values || [];
  if (rows.length === 0) return { sheetName, rowsProfiled: 0, columns: [] };
  const headers = rows[0].map((h, i) => String(h ?? `col_${i}`).trim() || `col_${i}`);
  const body = rows.slice(1);
  const columns = headers.map((h, i) => {
    const col = body.map(r => (r[i] ?? ''));
    const nonEmpty = col.filter(v => v !== '' && v != null);
    const unique = new Set(nonEmpty.map(v => String(v)));
    const samples = [...unique].slice(0, 5);
    return {
      name: h,
      index: i,
      type: inferType(col),
      nullRate: body.length ? +((1 - nonEmpty.length / body.length).toFixed(3)) : 1,
      cardinality: unique.size,
      samples,
    };
  });
  return {
    sheetName,
    rowsProfiled: body.length,
    rowsTotal: gridRowCount,
    columns,
  };
}

async function dump(target) {
  if (!target.id) return { ...target, error: 'no sheet id in env' };
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: target.id, fields: 'properties.title,sheets.properties' });
    const title = meta.data.properties.title;
    const tabs = meta.data.sheets.map(s => s.properties);
    const profiled = [];
    for (const t of tabs) {
      try {
        profiled.push(await profileTab(target.id, t.title, t.gridProperties.rowCount));
      } catch (e) {
        profiled.push({ sheetName: t.title, error: e.message });
      }
    }
    return { ...target, title, tabs: profiled };
  } catch (e) {
    return { ...target, error: e.message };
  }
}

const result = {};
for (const t of TARGETS) {
  console.error(`-> ${t.name} (${t.id})`);
  result[t.name] = await dump(t);
}

const outDir = path.join(process.cwd(), 'docs/audit');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'schema.json'), JSON.stringify(result, null, 2));
console.error(`\nwrote ${outDir}/schema.json`);
