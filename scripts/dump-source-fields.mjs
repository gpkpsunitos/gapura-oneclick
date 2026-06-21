// ponytail: one-off probe — dumps unique values of the columns we need to
// classify reports as Landside / Airside / GSE on the Summary tab.
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
const COLUMNS_OF_INTEREST = [
  "Area",
  "Terminal Area Category",
  "Apron Area Category",
  "GSE Availability Area",
  "GSE Available Requirement",
  "Source Sheet",
  "Service / Business Type",
];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
const sheetNames = meta.data.sheets.map((s) => s.properties.title);
console.error("Sheets:", sheetNames.join(", "));

const uniq = {};
for (const sheetName of sheetNames) {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const rows = r.data.values || [];
  if (rows.length < 2) continue;
  const headers = rows[0].map((h) => String(h).trim());
  const colIdxByName = Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), i]));
  for (const col of COLUMNS_OF_INTEREST) {
    const idx = colIdxByName[col.toLowerCase()];
    if (idx == null) continue;
    const key = `${sheetName}::${col}`;
    uniq[key] = uniq[key] || new Set();
    for (let i = 1; i < rows.length; i++) {
      const v = String(rows[i][idx] || "").trim();
      if (v) uniq[key].add(v);
    }
  }
}

for (const [key, set] of Object.entries(uniq)) {
  console.log(`\n=== ${key} (${set.size}) ===`);
  console.log(Array.from(set).sort().join("\n"));
}
