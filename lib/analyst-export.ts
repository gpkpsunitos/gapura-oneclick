import { STATUS_CONFIG } from '@/lib/constants/report-status';
import { type Report } from '@/types';

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

// Complexity: Time O(N) where N = reports.length | Space O(N)
export async function exportToExcel(ctx: ExportContext): Promise<void> {
  const exceljs = await import('exceljs');
  const workbook = new exceljs.Workbook();
  const summarySheet = workbook.addWorksheet('📊 Ringkasan');
  
  const { reports, analytics, dateRange } = ctx;
  const now = new Date();
  const exportDate = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
  const exportTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Styling
  const titleStyle: any = {
    font: { bold: true, size: 14, color: { argb: 'FF10B981' } },
    alignment: { horizontal: 'left' }
  };
  const headerStyle: any = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } },
    alignment: { horizontal: 'center' }
  };

  summarySheet.addRow([]);
  summarySheet.addRow(['', 'LAPORAN ANALITIK OneClick']).getCell(2).style = titleStyle;
  summarySheet.addRow(['', 'Gapura Angkasa - Incident Report & Resolution System']).getCell(2).font = { bold: true };
  summarySheet.addRow([]);
  summarySheet.addRow(['', 'Tanggal Export:', exportDate]);
  summarySheet.addRow(['', 'Waktu Export:', exportTime]);
  const period = typeof dateRange === 'string' ? dateRange.toUpperCase() : `${dateRange.from} → ${dateRange.to}`;
  summarySheet.addRow(['', 'Periode:', period]);
  summarySheet.addRow([]);
  summarySheet.addRow(['', '═══════════════════════════════════════════════════']);
  summarySheet.addRow(['', 'RINGKASAN EKSEKUTIF']).getCell(2).font = { bold: true };
  summarySheet.addRow(['', '═══════════════════════════════════════════════════']);
  summarySheet.addRow([]);
  
  const metricsHeader = summarySheet.addRow(['', 'Metrik', 'Nilai', 'Status']);
  metricsHeader.getCell(2).style = headerStyle;
  metricsHeader.getCell(3).style = headerStyle;
  metricsHeader.getCell(4).style = headerStyle;

  summarySheet.addRow(['', 'Total Laporan', analytics?.summary.totalReports || 0, '📊']);
  summarySheet.addRow(['', 'Laporan Selesai', analytics?.summary.resolvedReports || 0, '✅']);
  summarySheet.addRow(['', 'Laporan Pending', analytics?.summary.pendingReports || 0, '⏳']);
  summarySheet.addRow(['', 'Tingkat Resolusi', `${analytics?.summary.avgResolutionRate || 0}%`, analytics?.summary.avgResolutionRate && analytics.summary.avgResolutionRate >= 80 ? '🟢' : '🟡']);
  summarySheet.addRow(['', 'Kasus High Severity', analytics?.summary.highSeverity || 0, '🔴']);
  summarySheet.addRow(['', 'SLA Breach', analytics?.summary.slaBreachCount || 0, '⚠️']);
  summarySheet.addRow([]);
  summarySheet.addRow(['', '═══════════════════════════════════════════════════']);
  summarySheet.addRow(['', 'DISTRIBUSI PER DIVISI']).getCell(2).font = { bold: true };
  summarySheet.addRow(['', '═══════════════════════════════════════════════════']);
  summarySheet.addRow([]);
  
  const divHeader = summarySheet.addRow(['', 'Divisi', 'Jumlah Laporan', 'Persentase']);
  divHeader.getCell(2).style = headerStyle;
  divHeader.getCell(3).style = headerStyle;
  divHeader.getCell(4).style = headerStyle;

  if (analytics?.divisionData) {
    const total = analytics.divisionData.reduce((sum, x) => sum + x.count, 0) || 1;
    analytics.divisionData.forEach(d => {
      summarySheet.addRow(['', d.division, d.count, `${Math.round((d.count / total) * 100)}%`]);
    });
  }

  summarySheet.addRow([]);
  summarySheet.addRow(['', '═══════════════════════════════════════════════════']);
  summarySheet.addRow(['', 'Digenerate oleh OneClick Analytics Engine']);
  summarySheet.addRow(['', `© ${now.getFullYear()} Gapura Angkasa. All rights reserved.`]);

  summarySheet.getColumn(2).width = 35;
  summarySheet.getColumn(3).width = 20;
  summarySheet.getColumn(4).width = 15;

  // Detail Sheet
  const detailSheet = workbook.addWorksheet('📋 Detail Laporan');
  detailSheet.addRow(['DETAIL LAPORAN - OneClick']).getCell(1).style = titleStyle;
  detailSheet.addRow(['Total: ' + reports.length + ' laporan | Export: ' + exportDate]);
  detailSheet.addRow([]);

  const detailHeader = detailSheet.addRow([
    'No', 'ID Laporan', 'Judul Laporan', 'Status', 'Severity', 'Stasiun', 
    'Nama Stasiun', 'Divisi Tujuan', 'Pelapor', 'Lokasi', 'Tanggal Dibuat', 'Waktu'
  ]);
  detailHeader.eachCell(cell => { cell.style = headerStyle; });

  reports.forEach((r, idx) => {
    detailSheet.addRow([
      idx + 1,
      r.id.slice(0, 8).toUpperCase(),
      r.title,
      STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status,
      r.severity?.toUpperCase() || '-',
      r.stations?.code || r.branch || '-',
      r.stations?.name || '-',
      r.target_division || '-',
      r.users?.full_name || '-',
      r.location || '-',
      new Date(r.created_at).toLocaleDateString('id-ID'),
      new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    ]);
  });

  detailSheet.columns = [
    { width: 5 }, { width: 12 }, { width: 40 }, { width: 18 }, { width: 10 },
    { width: 8 }, { width: 25 }, { width: 12 }, { width: 20 }, { width: 20 },
    { width: 14 }, { width: 8 }
  ];

  // Performa Sheet
  const performanceSheet = workbook.addWorksheet('📍 Performa Stasiun');
  performanceSheet.addRow(['PERFORMA PER STASIUN']).getCell(1).style = titleStyle;
  performanceSheet.addRow(['Analisis efisiensi penyelesaian laporan']);
  performanceSheet.addRow([]);

  const perfHeader = performanceSheet.addRow([
    'No', 'Kode Stasiun', 'Total Laporan', 'Selesai', 'Pending', 'Efisiensi (%)', 'Rating'
  ]);
  perfHeader.eachCell(cell => { cell.style = headerStyle; });

  (analytics?.stationData || []).forEach((s, idx) => {
    const efficiency = Math.round((s.resolved / Math.max(s.total, 1)) * 100);
    performanceSheet.addRow([
      idx + 1,
      s.station,
      s.total,
      s.resolved,
      s.total - s.resolved,
      `${efficiency}%`,
      efficiency >= 90 ? '⭐⭐⭐⭐⭐' : efficiency >= 75 ? '⭐⭐⭐⭐' : efficiency >= 60 ? '⭐⭐⭐' : efficiency >= 40 ? '⭐⭐' : '⭐'
    ]);
  });

  performanceSheet.columns = [
    { width: 5 }, { width: 15 }, { width: 14 }, { width: 12 },
    { width: 12 }, { width: 14 }, { width: 15 }
  ];

  // Buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const filename = `IRRS-Analytics-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

// Complexity: Time O(N) where N = reports.length | Space O(N)
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
    head: [['ID', 'Judul', 'Status', 'Severity', 'Stasiun', 'Tanggal']],
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
