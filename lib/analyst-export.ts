
import { STATUS_CONFIG } from '@/lib/constants/report-status';
import { type Report } from '@/types';
import {
  addAdvancedExcelTable,
  configureExcelWorkbook,
  styleExcelSectionHeader,
  styleExcelTitle,
} from '@/lib/excel-export-style';

interface AnalyticsSummary {

  totalReports: number;

  resolvedReports: number;

  pendingReports: number;

  highSeverity: number;

  avgResolutionRate: number;

  slaBreachCount?: number;
}

interface AnalyticsPayload {

  summary: AnalyticsSummary;

  stationData: Array<{ station: string; total: number; resolved: number }>;

  divisionData?: Array<{ division: string; count: number }>;
}

interface ExportContext {

  reports: Report[];

  filteredReports: Report[];

  analytics: AnalyticsPayload | null;

  dateRange: 'all' | 'week' | 'month' | { from: string; to: string };
}

export async function exportToExcel(ctx: ExportContext): Promise<void> {
  const exceljs = await import('exceljs');
  const workbook = new exceljs.Workbook();
  const { reports, analytics, dateRange } = ctx;
  const now = new Date();
  const exportDate = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
  const exportTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const period = typeof dateRange === 'string' ? dateRange.toUpperCase() : `${dateRange.from} → ${dateRange.to}`;
  configureExcelWorkbook(workbook, 'Gapura Oneclick Analytics Export');

  const summarySheet = workbook.addWorksheet('📊 Ringkasan');
  styleExcelTitle(summarySheet, 1, 1, 4, 'Gapura Oneclick Analytics Summary');
  summarySheet.getCell('A2').value = 'Export date';
  summarySheet.getCell('B2').value = exportDate;
  summarySheet.getCell('C2').value = 'Export time';
  summarySheet.getCell('D2').value = exportTime;
  summarySheet.getCell('A3').value = 'Period';
  summarySheet.getCell('B3').value = period;
  summarySheet.mergeCells('B3:D3');
  for (let rowNumber = 2; rowNumber <= 3; rowNumber += 1) {
    summarySheet.getRow(rowNumber).eachCell((cell) => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF475569' } };
      cell.alignment = { vertical: 'middle' };
    });
  }
  styleExcelSectionHeader(summarySheet, 5, 1, 4, 'Executive Summary');
  const metricRows = [
    ['Total Reports', analytics?.summary.totalReports || 0, 'Operational volume'],
    ['Resolved Reports', analytics?.summary.resolvedReports || 0, 'Closed or completed'],
    ['Pending Reports', analytics?.summary.pendingReports || 0, 'Requires follow-up'],
    ['Resolution Rate', (analytics?.summary.avgResolutionRate || 0) / 100, 'Completion performance'],
    ['High Severity Cases', analytics?.summary.highSeverity || 0, 'Priority monitoring'],
    ['SLA Breaches', analytics?.summary.slaBreachCount || 0, 'Service-level exceptions'],
  ];
  addAdvancedExcelTable({
    workbook,
    worksheet: summarySheet,
    name: 'AnalyticsMetricsTable',
    startRow: 6,
    freezeRows: 6,
    columns: [
      { header: 'Metric', kind: 'text', width: 28 },
      { header: 'Value', kind: 'number', width: 16 },
      { header: 'Interpretation', kind: 'text', width: 30 },
    ],
    rows: metricRows,
  });
  summarySheet.getCell('B10').numFmt = '0.0%';

  const divisionStart = 14;
  styleExcelSectionHeader(summarySheet, divisionStart, 1, 4, 'Distribution by Division');
  const divisionData = analytics?.divisionData || [];
  const divisionTotal = divisionData.reduce((sum, item) => sum + item.count, 0) || 1;
  addAdvancedExcelTable({
    workbook,
    worksheet: summarySheet,
    name: 'DivisionDistributionTable',
    startRow: divisionStart + 1,
    freezeRows: 6,
    columns: [
      { header: 'Division', kind: 'text', width: 28 },
      { header: 'Report Count', kind: 'number', width: 16 },
      { header: 'Percentage', kind: 'percentage', width: 16 },
    ],
    rows: divisionData.map((item) => [item.division, item.count, item.count / divisionTotal]),
    emptyMessage: 'No division data available',
  });

  const detailSheet = workbook.addWorksheet('📋 Detail Laporan');
  styleExcelTitle(detailSheet, 1, 1, 12, 'Gapura Oneclick Report Details');
  detailSheet.mergeCells('A2:L2');
  detailSheet.getCell('A2').value = `Total: ${reports.length} reports | Export: ${exportDate}`;
  detailSheet.getCell('A2').font = { name: 'Aptos', italic: true, size: 9, color: { argb: 'FF64748B' } };
  detailSheet.getCell('A2').alignment = { indent: 1 };
  addAdvancedExcelTable({
    workbook,
    worksheet: detailSheet,
    name: 'AnalystReportDetails',
    startRow: 4,
    freezeRows: 4,
    freezeColumns: 2,
    columns: [
      { header: 'No', kind: 'number', width: 7 },
      { header: 'Report ID', kind: 'identifier', width: 14 },
      { header: 'Report Title', kind: 'multiline', width: 40 },
      { header: 'Status', kind: 'status', width: 18 },
      { header: 'Severity', kind: 'severity', width: 14 },
      { header: 'Station', kind: 'identifier', width: 12 },
      { header: 'Station Name', kind: 'text', width: 26 },
      { header: 'Target Division', kind: 'text', width: 18 },
      { header: 'Reporter', kind: 'text', width: 22 },
      { header: 'Location', kind: 'text', width: 24 },
      { header: 'Created Date', kind: 'date', width: 15 },
      { header: 'Created Time', kind: 'text', width: 13 },
    ],
    rows: reports.map((report, index) => {
      const created = new Date(report.created_at);
      return [
        index + 1,
        report.id.slice(0, 8).toUpperCase(),
        report.title,
        STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.label || report.status,
        report.severity?.toUpperCase() || '-',
        report.stations?.code || report.branch || '-',
        report.stations?.name || '-',
        report.target_division || '-',
        report.users?.full_name || '-',
        report.location || '-',
        Number.isNaN(created.getTime()) ? report.created_at : created,
        Number.isNaN(created.getTime()) ? '' : created.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      ];
    }),
    emptyMessage: 'No report data available',
  });

  const performanceSheet = workbook.addWorksheet('📍 Performa Bandara');
  styleExcelTitle(performanceSheet, 1, 1, 7, 'Gapura Oneclick Station Performance');
  performanceSheet.mergeCells('A2:G2');
  performanceSheet.getCell('A2').value = 'Report resolution efficiency by station';
  performanceSheet.getCell('A2').font = { name: 'Aptos', italic: true, size: 9, color: { argb: 'FF64748B' } };
  performanceSheet.getCell('A2').alignment = { indent: 1 };
  addAdvancedExcelTable({
    workbook,
    worksheet: performanceSheet,
    name: 'StationPerformanceTable',
    startRow: 4,
    freezeRows: 4,
    columns: [
      { header: 'No', kind: 'number', width: 7 },
      { header: 'Station Code', kind: 'identifier', width: 15 },
      { header: 'Total Reports', kind: 'number', width: 15 },
      { header: 'Resolved', kind: 'number', width: 13 },
      { header: 'Pending', kind: 'number', width: 13 },
      { header: 'Efficiency', kind: 'percentage', width: 15 },
      { header: 'Rating', kind: 'text', width: 15 },
    ],
    rows: (analytics?.stationData || []).map((station, index) => {
      const efficiency = station.resolved / Math.max(station.total, 1);
      return [
        index + 1,
        station.station,
        station.total,
        station.resolved,
        station.total - station.resolved,
        efficiency,
        efficiency >= 0.9 ? 'Excellent' : efficiency >= 0.75 ? 'Very Good' : efficiency >= 0.6 ? 'Good' : efficiency >= 0.4 ? 'Needs Improvement' : 'Critical',
      ];
    }),
    emptyMessage: 'No station performance data available',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const filename = `Gapura-Oneclick-Analytics-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function exportToPDF(ctx: ExportContext): Promise<void> {
  const { reports, analytics, dateRange } = ctx;
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN ANALITIK IRRS', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const periodLabel = typeof dateRange === 'string' ? dateRange.toUpperCase() : `${dateRange.from} → ${dateRange.to}`;
  doc.text(`Periode: ${periodLabel} | Export: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 30, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  let yPos = 55;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN EKSEKUTIF', 14, yPos);
  yPos += 10;

  const summaryItems = [
    { label: 'Total Laporan', value: analytics?.summary.totalReports || 0 },
    { label: 'Selesai', value: analytics?.summary.resolvedReports || 0 },
    { label: 'Resolusi', value: `${analytics?.summary.avgResolutionRate || 0}%` },
    { label: 'High Sev.', value: analytics?.summary.highSeverity || 0 },
  ];

  const cardWidth = (pageWidth - 28 - 15) / 4;
  summaryItems.forEach((item, idx) => {
    const x = 14 + (idx * (cardWidth + 5));
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPos, cardWidth, 25, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 5, yPos + 8);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.value), x + 5, yPos + 20);
  });

  yPos += 35;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DETAIL LAPORAN TERBARU', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['ID', 'Judul', 'Status', 'Severity', 'Bandara', 'Tanggal']],
    body: reports.slice(0, 15).map(r => [
      r.id.slice(0, 8),
      r.title.substring(0, 30) + (r.title.length > 30 ? '...' : ''),
      STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status,
      r.severity,
      r.stations?.code || r.branch || '-',
      new Date(r.created_at).toLocaleDateString('id-ID')
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gapura Angkasa - OneClick Analytics | Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Analytics-IRRS-${new Date().toISOString().split('T')[0]}.pdf`);
}
