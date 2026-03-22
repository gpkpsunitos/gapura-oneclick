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
  const XLSX = await import('xlsx');
  const { reports, filteredReports, analytics, dateRange } = ctx;
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const exportDate = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
  const exportTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const summaryData = [
    [''],
    ['', 'LAPORAN ANALITIK IRRS'],
    ['', 'Gapura Angkasa - Incident Report & Resolution System'],
    [''],
    ['', 'Tanggal Export:', exportDate],
    ['', 'Waktu Export:', exportTime],
    ['', 'Periode:', typeof dateRange === 'string' ? dateRange.toUpperCase() : `${dateRange.from} → ${dateRange.to}`],
    [''],
    ['', '═══════════════════════════════════════════════════'],
    ['', 'RINGKASAN EKSEKUTIF'],
    ['', '═══════════════════════════════════════════════════'],
    [''],
    ['', 'Metrik', 'Nilai', 'Status'],
    ['', 'Total Laporan', analytics?.summary.totalReports || 0, '📊'],
    ['', 'Laporan Selesai', analytics?.summary.resolvedReports || 0, '✅'],
    ['', 'Laporan Pending', analytics?.summary.pendingReports || 0, '⏳'],
    ['', 'Tingkat Resolusi', `${analytics?.summary.avgResolutionRate || 0}%`, analytics?.summary.avgResolutionRate && analytics.summary.avgResolutionRate >= 80 ? '🟢' : '🟡'],
    ['', 'Kasus High Severity', analytics?.summary.highSeverity || 0, '🔴'],
    ['', 'SLA Breach', analytics?.summary.slaBreachCount || 0, '⚠️'],
    [''],
    ['', '═══════════════════════════════════════════════════'],
    ['', 'DISTRIBUSI PER DIVISI'],
    ['', '═══════════════════════════════════════════════════'],
    [''],
    ['', 'Divisi', 'Jumlah Laporan', 'Persentase'],
    ...(analytics?.divisionData?.map(d => {
      const total = analytics?.divisionData?.reduce((sum, x) => sum + x.count, 0) || 1;
      return ['', d.division, d.count, `${Math.round((d.count / total) * 100)}%`];
    }) || []),
    [''],
    ['', '═══════════════════════════════════════════════════'],
    ['', 'Digenerate oleh IRRS Analytics Engine'],
    ['', `© ${now.getFullYear()} Gapura Angkasa. All rights reserved.`],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 3 }, { wch: 35 }, { wch: 20 }, { wch: 15 }];
  ws1['!merges'] = [
    { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '📊 Ringkasan');

  const reportsHeader = [
    ['DETAIL LAPORAN - IRRS'],
    ['Total: ' + reports.length + ' laporan | Export: ' + exportDate],
    [],
  ];

  const reportsTableData = reports.map((r, idx) => ({
    'No': idx + 1,
    'ID Laporan': r.id.slice(0, 8).toUpperCase(),
    'Judul Laporan': r.title,
    'Status': STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status,
    'Severity': r.severity?.toUpperCase() || '-',
    'Stasiun': r.stations?.code || r.branch || '-',
    'Nama Stasiun': r.stations?.name || '-',
    'Divisi Tujuan': r.target_division || '-',
    'Pelapor': r.users?.full_name || '-',
    'Lokasi': r.location || '-',
    'Tanggal Dibuat': new Date(r.created_at).toLocaleDateString('id-ID'),
    'Waktu': new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  }));

  const ws2Header = XLSX.utils.aoa_to_sheet(reportsHeader);
  XLSX.utils.sheet_add_json(ws2Header, reportsTableData, { origin: 'A4' });
  ws2Header['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 10 },
    { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2Header, '📋 Detail Laporan');

  const stationHeader = [
    ['PERFORMA PER STASIUN'],
    ['Analisis efisiensi penyelesaian laporan'],
    [],
  ];

  const stationTableData = (analytics?.stationData || []).map((s, idx) => {
    const efficiency = Math.round((s.resolved / Math.max(s.total, 1)) * 100);
    return {
      'No': idx + 1,
      'Kode Stasiun': s.station,
      'Total Laporan': s.total,
      'Selesai': s.resolved,
      'Pending': s.total - s.resolved,
      'Efisiensi (%)': `${efficiency}%`,
      'Rating': efficiency >= 90 ? '⭐⭐⭐⭐⭐' : efficiency >= 75 ? '⭐⭐⭐⭐' : efficiency >= 60 ? '⭐⭐⭐' : efficiency >= 40 ? '⭐⭐' : '⭐',
    };
  });

  const ws3Header = XLSX.utils.aoa_to_sheet(stationHeader);
  XLSX.utils.sheet_add_json(ws3Header, stationTableData, { origin: 'A4' });
  ws3Header['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3Header, '📍 Performa Stasiun');

  const statusData = [
    ['DISTRIBUSI STATUS LAPORAN'],
    [`Per tanggal ${exportDate}`],
    [],
    ['Status', 'Jumlah', 'Persentase', 'Indikator'],
    ['Open', filteredReports.filter(r => r.status === 'OPEN').length, `${Math.round((filteredReports.filter(r => r.status === 'OPEN').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🟡'],
    ['On Progress', filteredReports.filter(r => r.status === 'ON PROGRESS').length, `${Math.round((filteredReports.filter(r => r.status === 'ON PROGRESS').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🔵'],
    ['Closed', filteredReports.filter(r => r.status === 'CLOSED').length, `${Math.round((filteredReports.filter(r => r.status === 'CLOSED').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🟢'],
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(statusData);
  ws4['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws4, '📈 Distribusi Status');

  const filename = `IRRS-Analytics-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
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
    doc.text(`Gapura Angkasa - IRRS Analytics | Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Analytics-IRRS-${new Date().toISOString().split('T')[0]}.pdf`);
}
