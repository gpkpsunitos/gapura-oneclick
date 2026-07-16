import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  addAdvancedExcelTable,
  configureExcelWorkbook,
  excelDate,
  excelHyperlink,
  styleExcelSectionHeader,
  styleExcelTitle,
} from '../lib/excel-export-style.ts';

const outputDir = path.resolve('outputs/019f6715-cfdb-7cc2-8e49-6e9bb3ce8436');
const outputPath = path.join(outputDir, 'Gapura-Oneclick-Advanced-Excel-Fixture.xlsx');
await fs.mkdir(outputDir, { recursive: true });

const workbook = new ExcelJS.Workbook();
configureExcelWorkbook(workbook, 'Gapura Oneclick Advanced Excel Export Fixture');

const reports = workbook.addWorksheet('All Reports');
styleExcelTitle(reports, 1, 1, 10, 'Gapura Oneclick All Reports Export');
reports.mergeCells('A2:J2');
reports.getCell('A2').value = '01 Jul 2026 - 16 Jul 2026 | All branches | All statuses';
reports.getCell('A2').font = { name: 'Aptos', italic: true, size: 9, color: { argb: 'FF64748B' } };
addAdvancedExcelTable({
  workbook,
  worksheet: reports,
  name: 'AllReportsTable',
  startRow: 4,
  freezeRows: 4,
  freezeColumns: 2,
  columns: [
    { header: 'No', kind: 'number', width: 7 },
    { header: 'Reference', kind: 'identifier', width: 18 },
    { header: 'Date of Event', kind: 'date', width: 16 },
    { header: 'Status', kind: 'status', width: 15 },
    { header: 'Severity', kind: 'severity', width: 15 },
    { header: 'Station', kind: 'identifier', width: 12 },
    { header: 'Airline', kind: 'text', width: 20 },
    { header: 'Flight', kind: 'identifier', width: 14 },
    { header: 'Report', kind: 'multiline', width: 44 },
    { header: 'Evidence', kind: 'url', width: 28 },
  ],
  rows: [
    [1, 'GA152', excelDate('2026-07-12'), 'OPEN', 'LOW', 'CGK', 'Pelita Air', 'GA152', 'Passenger handling report with enough narrative text to demonstrate wrapping without clipping.', excelHyperlink('https://example.com/evidence/ga152', 'Open evidence')],
    [2, 'IP302', excelDate('2026-07-09'), 'CLOSED', 'HIGH', 'CGK', 'Garuda Indonesia', 'GA648', 'Baggage was routed to the wrong destination and required a coordinated operational response.', excelHyperlink('https://example.com/evidence/ip302', 'Open evidence')],
    [3, 'DPR-CGKGA59728', excelDate('2026-07-09'), 'OPEN', 'TOP RISK', 'CGK', 'Garuda Indonesia', 'GA597', 'Long-form operational narrative used to verify alternating rows and semantic severity treatment.', excelHyperlink('https://example.com/evidence/dpr', 'Open evidence')],
  ],
});

const analyst = workbook.addWorksheet('Analytics Summary');
styleExcelTitle(analyst, 1, 1, 4, 'Gapura Oneclick Analytics Summary');
styleExcelSectionHeader(analyst, 3, 1, 4, 'Executive Summary');
addAdvancedExcelTable({
  workbook,
  worksheet: analyst,
  name: 'AnalyticsMetricsTable',
  startRow: 4,
  freezeRows: 4,
  columns: [
    { header: 'Metric', kind: 'text', width: 26 },
    { header: 'Value', kind: 'number', width: 14 },
    { header: 'Status', kind: 'status', width: 16 },
    { header: 'Interpretation', kind: 'text', width: 30 },
  ],
  rows: [
    ['Total Reports', 128, 'OPEN', 'Current filtered report volume'],
    ['Resolved Reports', 93, 'CLOSED', 'Completed reports'],
    ['High Severity Cases', 11, 'OPEN', 'Requires priority monitoring'],
  ],
});

const manager = workbook.addWorksheet('Manager Detail');
styleExcelTitle(manager, 1, 1, 7, 'Gapura Oneclick Manager Report Detail - CGK');
addAdvancedExcelTable({
  workbook,
  worksheet: manager,
  name: 'ManagerReportDetail',
  startRow: 2,
  freezeRows: 2,
  columns: [
    { header: 'Date', kind: 'date' },
    { header: 'Category', kind: 'text' },
    { header: 'Severity', kind: 'severity' },
    { header: 'Status', kind: 'status' },
    { header: 'Airline', kind: 'text' },
    { header: 'Area', kind: 'text' },
    { header: 'Source', kind: 'text' },
  ],
  rows: [[excelDate('2026-07-12'), 'Irregularity', 'MEDIUM', 'OPEN', 'Garuda Indonesia', 'Terminal Area', 'NON CARGO']],
});

const dashboard = workbook.addWorksheet('Dashboard Tiles');
styleExcelTitle(dashboard, 1, 1, 4, 'Gapura Oneclick Operations Dashboard');
styleExcelSectionHeader(dashboard, 3, 1, 4, 'Status Distribution');
addAdvancedExcelTable({
  workbook,
  worksheet: dashboard,
  name: 'DashboardStatusDistribution',
  startRow: 4,
  freezeRows: 2,
  columns: [
    { header: 'Status', kind: 'status' },
    { header: 'Count', kind: 'number' },
    { header: 'Percentage', kind: 'percentage' },
  ],
  rows: [['OPEN', 35, 0.273], ['CLOSED', 93, 0.727]],
});
styleExcelSectionHeader(dashboard, 8, 1, 4, 'Severity Distribution');
addAdvancedExcelTable({
  workbook,
  worksheet: dashboard,
  name: 'DashboardSeverityDistribution',
  startRow: 9,
  freezeRows: 2,
  columns: [
    { header: 'Severity', kind: 'severity' },
    { header: 'Count', kind: 'number' },
    { header: 'Percentage', kind: 'percentage' },
  ],
  rows: [['TOP RISK', 4, 0.031], ['HIGH', 7, 0.055], ['MEDIUM', 31, 0.242], ['LOW', 86, 0.672]],
});

const documents = workbook.addWorksheet('Circulars & Materials');
addAdvancedExcelTable({
  workbook,
  worksheet: documents,
  name: 'DivisionDocumentsTable',
  columns: [
    { header: 'Date', kind: 'date' },
    { header: 'Location', kind: 'text' },
    { header: 'Agenda', kind: 'multiline', width: 36 },
    { header: 'PIC / Division', kind: 'text' },
    { header: 'Station', kind: 'identifier' },
    { header: 'Material Links', kind: 'url', width: 30 },
  ],
  rows: [[excelDate('2026-07-15'), 'Meeting Room A', 'Operational coordination and follow-up briefing', 'OCS', 'CGK', excelHyperlink('https://example.com/material', 'Open material')]],
});

const ocs = workbook.addWorksheet('OCS Records');
addAdvancedExcelTable({
  workbook,
  worksheet: ocs,
  name: 'OCS_Weekly_Report_Table',
  columns: [
    { header: 'Date', kind: 'date' },
    { header: 'Weekly Period', kind: 'text', width: 20 },
    { header: 'Remarks', kind: 'multiline', width: 40 },
    { header: 'Upload Link', kind: 'url', width: 30 },
  ],
  rows: [[excelDate('2026-07-14'), 'Week 28', 'Weekly operational report has been reviewed and published.', excelHyperlink('https://example.com/weekly-report', 'Open weekly report')]],
});

await workbook.xlsx.writeFile(outputPath);
console.log(outputPath);
