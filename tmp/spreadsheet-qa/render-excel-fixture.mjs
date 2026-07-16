import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.resolve('../..');
const source = path.join(root, 'outputs/019f6715-cfdb-7cc2-8e49-6e9bb3ce8436/Gapura-Oneclick-Advanced-Excel-Fixture.xlsx');
const previewDir = path.join(root, 'tmp/spreadsheet-qa/previews');
await fs.mkdir(previewDir, { recursive: true });

const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);
const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 12000,
  tableMaxRows: 6,
  tableMaxCols: 12,
  tableMaxCellChars: 100,
});
console.log(overview.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

const sheets = ['All Reports', 'Analytics Summary', 'Manager Detail', 'Dashboard Tiles', 'Circulars & Materials', 'OCS Records'];
for (const sheetName of sheets) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 1.5, format: 'png' });
  const filename = `${sheetName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.png`;
  await fs.writeFile(path.join(previewDir, filename), new Uint8Array(await preview.arrayBuffer()));
  console.log(`rendered:${sheetName}:${filename}`);
}
