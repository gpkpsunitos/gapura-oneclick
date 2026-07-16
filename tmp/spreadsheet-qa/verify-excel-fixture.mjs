import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'outputs/019f6715-cfdb-7cc2-8e49-6e9bb3ce8436/Gapura-Oneclick-Advanced-Excel-Fixture.xlsx');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(source);

const expectedSheets = ['All Reports', 'Analytics Summary', 'Manager Detail', 'Dashboard Tiles', 'Circulars & Materials', 'OCS Records'];
assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), expectedSheets);

const tables = workbook.worksheets.flatMap((worksheet) => Object.values(worksheet.tables));
assert.equal(tables.length, 7);
assert.equal(new Set(tables.map((table) => table.name.toLowerCase())).size, tables.length);
assert.equal(tables.every((table) => table.table.columns.every((column) => column.filterButton !== false)), true);
assert.equal(workbook.worksheets.every((worksheet) => worksheet.views[0]?.showGridLines === false), true);
assert.equal(workbook.worksheets.every((worksheet) => worksheet.views[0]?.state === 'frozen'), true);
assert.equal(workbook.getWorksheet('All Reports')?.getCell('C5').value instanceof Date, true);
assert.equal(workbook.getWorksheet('All Reports')?.getCell('C5').value.toISOString().slice(0, 10), '2026-07-12');
assert.equal(workbook.getWorksheet('Dashboard Tiles')?.getCell('C5').numFmt, '0.0%');

console.log(JSON.stringify({ sheets: workbook.worksheets.length, tables: tables.length, filters: 'enabled', dates: 'typed', percentages: 'typed' }));
