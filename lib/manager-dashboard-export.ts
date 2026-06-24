interface ReportRow {
    id: string;
    status: string | null;
    severity: string | null;
    main_category: string | null;
    category: string | null;
    airline: string | null;
    airlines: string | null;
    area: string | null;
    date_of_event: string | null;
    created_at: string;
    source_sheet: string | null;
}

interface DashboardExportData {
    station: { code: string; name: string };
    summary: { total: number; open: number; closed: number; resolutionRate: number };
    categoryDistribution: { name: string; value: number }[];
    severityDistribution: { name: string; value: number }[];
    areaDistribution: { name: string; value: number }[];
    topAirlines: { name: string; value: number }[];
    monthlyTrend: { month: string; total: number; Irregularity: number; Complaint: number; Compliment: number }[];
    statusDistribution: { name: string; value: number }[];
    rows: ReportRow[];
}

const BLUE_DARK  = '003D73';
const BLUE_MID   = '0072B2';
const BLUE_LIGHT = 'D6EAF8';
const GREY_ALT   = 'F4F6F8';
const WHITE      = 'FFFFFF';
const ACCENT_RED = 'C0392B';
const ACCENT_GRN = '1D8348';
const ACCENT_YLW = 'B7950B';

function fmtDate(value?: string | null) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function pct(value: number, total: number) {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
}

export async function exportManagerDashboardToExcel(data: DashboardExportData) {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gapura IRRS';
    workbook.created = new Date();

    const { station, summary, categoryDistribution, severityDistribution, areaDistribution, topAirlines, monthlyTrend, statusDistribution, rows } = data;
    const now = new Date();
    const exportDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    const ws = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });

    ws.getColumn('A').width = 28;
    ws.getColumn('B').width = 18;
    ws.getColumn('C').width = 18;
    ws.getColumn('D').width = 18;
    ws.getColumn('E').width = 18;

    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `Dashboard Cabang ${station.code}`;
    titleCell.font  = { name: 'Calibri', bold: true, size: 18, color: { argb: WHITE } };
    titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:E2');
    const subCell = ws.getCell('A2');
    subCell.value = station.name;
    subCell.font  = { name: 'Calibri', bold: false, size: 12, color: { argb: WHITE } };
    subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_MID } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 22;

    ws.mergeCells('A3:E3');
    const dateCell = ws.getCell('A3');
    dateCell.value = `Exported: ${exportDate}`;
    dateCell.font  = { name: 'Calibri', italic: true, size: 9, color: { argb: '5D6D7E' } };
    dateCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_LIGHT } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(3).height = 18;

    ws.getRow(4).height = 10;

    function addSectionHeader(row: number, label: string) {
        ws.mergeCells(`A${row}:E${row}`);
        const h = ws.getCell(`A${row}`);
        h.value = label;
        h.font  = { name: 'Calibri', bold: true, size: 11, color: { argb: WHITE } };
        h.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_MID } };
        h.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(row).height = 20;
    }

    function addTableHeader(row: number, cols: string[]) {
        const r = ws.getRow(row);
        cols.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val;
            cell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } };
            cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
            cell.border = { bottom: { style: 'thin', color: { argb: BLUE_LIGHT } } };
        });
        r.height = 18;
    }

    function addDataRow(row: number, cols: (string | number)[], alt: boolean) {
        const r = ws.getRow(row);
        cols.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val;
            cell.font  = { name: 'Calibri', size: 10 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? GREY_ALT : WHITE } };
            cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', indent: i === 0 ? 1 : 0 };
        });
        r.height = 16;
    }

    let r = 5;
    addSectionHeader(r++, 'KEY PERFORMANCE INDICATORS');
    addTableHeader(r++, ['Metric', 'Value', '', '', '']);
    const kpis: [string, string | number][] = [
        ['Total Reports', summary.total],
        ['Open Reports', summary.open],
        ['Closed Reports', summary.closed],
        ['Resolution Rate', `${summary.resolutionRate}%`],
    ];
    kpis.forEach(([label, val], i) => {
        ws.getRow(r).getCell(1).value = label;
        ws.getRow(r).getCell(1).font  = { name: 'Calibri', size: 10 };
        ws.getRow(r).getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : GREY_ALT } };
        ws.getRow(r).getCell(1).alignment = { indent: 1 };
        ws.mergeCells(`B${r}:E${r}`);
        ws.getRow(r).getCell(2).value = val;
        ws.getRow(r).getCell(2).font  = { name: 'Calibri', bold: true, size: 11, color: { argb: BLUE_DARK } };
        ws.getRow(r).getCell(2).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : GREY_ALT } };
        ws.getRow(r).getCell(2).alignment = { horizontal: 'center' };
        ws.getRow(r).height = 18;
        r++;
    });

    r++;

    addSectionHeader(r++, 'CATEGORY DISTRIBUTION');
    addTableHeader(r++, ['Category', 'Count', 'Percentage', '', '']);
    categoryDistribution.forEach((d, i) => {
        addDataRow(r++, [d.name, d.value, pct(d.value, summary.total)], i % 2 !== 0);
    });
    r++;

    addSectionHeader(r++, 'SEVERITY DISTRIBUTION');
    addTableHeader(r++, ['Severity', 'Count', 'Percentage', '', '']);
    severityDistribution.forEach((d, i) => {
        const rowRef = ws.getRow(r);
        addDataRow(r, [d.name, d.value, pct(d.value, summary.total)], i % 2 !== 0);
        const sev = d.name.toUpperCase();
        const color = sev === 'CRITICAL' ? ACCENT_RED : sev === 'HIGH' ? 'E67E22' : sev === 'MEDIUM' ? ACCENT_YLW : ACCENT_GRN;
        rowRef.getCell(1).font = { name: 'Calibri', bold: true, size: 10, color: { argb: color } };
        r++;
    });
    r++;

    addSectionHeader(r++, 'REPORT STATUS');
    addTableHeader(r++, ['Status', 'Count', 'Percentage', '', '']);
    statusDistribution.forEach((d, i) => {
        addDataRow(r++, [d.name, d.value, pct(d.value, summary.total)], i % 2 !== 0);
    });
    r++;

    addSectionHeader(r++, 'AREA DISTRIBUTION');
    addTableHeader(r++, ['Area', 'Count', 'Percentage', '', '']);
    areaDistribution.forEach((d, i) => {
        addDataRow(r++, [d.name, d.value, pct(d.value, summary.total)], i % 2 !== 0);
    });
    r++;

    addSectionHeader(r++, 'TOP AIRLINES');
    addTableHeader(r++, ['#', 'Airline', 'Reports', 'Percentage', '']);
    topAirlines.forEach((d, i) => {
        const rw = ws.getRow(r);
        [i + 1, d.name, d.value, pct(d.value, summary.total)].forEach((val, col) => {
            const cell = rw.getCell(col + 1);
            cell.value = val;
            cell.font  = { name: 'Calibri', size: 10 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? WHITE : GREY_ALT } };
            cell.alignment = { horizontal: col === 1 ? 'left' : 'center', indent: col === 1 ? 1 : 0 };
        });
        rw.height = 16;
        r++;
    });
    r++;

    addSectionHeader(r++, 'MONTHLY TREND (LAST 12 MONTHS)');
    addTableHeader(r++, ['Month', 'Total', 'Irregularity', 'Complaint', 'Compliment']);
    monthlyTrend.forEach((d, i) => {
        addDataRow(r++, [d.month, d.total, d.Irregularity, d.Complaint, d.Compliment], i % 2 !== 0);
    });

    const ws2 = workbook.addWorksheet('Report Detail', { views: [{ showGridLines: false }] });

    const cols2 = [
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Severity', key: 'severity', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Airline', key: 'airline', width: 22 },
        { header: 'Area', key: 'area', width: 22 },
        { header: 'Source', key: 'source', width: 18 },
    ];

    ws2.mergeCells(`A1:G1`);
    const t2 = ws2.getCell('A1');
    t2.value = `Report Detail — ${station.code} (${station.name})`;
    t2.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: WHITE } };
    t2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } };
    t2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 30;

    const hdr2 = ws2.getRow(2);
    cols2.forEach((c, i) => {
        const cell = hdr2.getCell(i + 1);
        cell.value = c.header;
        cell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: WHITE } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_MID } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'medium', color: { argb: BLUE_DARK } } };
        ws2.getColumn(i + 1).width = c.width;
    });
    hdr2.height = 20;

    ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 2, showGridLines: false }];

    rows.forEach((row, i) => {
        const rw = ws2.addRow([
            fmtDate(row.date_of_event || row.created_at),
            row.main_category || row.category || '',
            row.severity || '',
            row.status || '',
            row.airline || row.airlines || '',
            row.area || '',
            row.source_sheet || '',
        ]);
        const alt = i % 2 !== 0;
        rw.eachCell((cell) => {
            cell.font  = { name: 'Calibri', size: 10 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? GREY_ALT : WHITE } };
            cell.alignment = { vertical: 'middle' };
            cell.border = { bottom: { style: 'hair', color: { argb: 'D5D8DC' } } };
        });

        const sevCell = rw.getCell(3);
        const sev = (row.severity || '').toUpperCase();
        if (sev === 'CRITICAL') sevCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: ACCENT_RED } };
        else if (sev === 'HIGH') sevCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'E67E22' } };
        else if (sev === 'MEDIUM') sevCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: ACCENT_YLW } };
        else if (sev === 'LOW') sevCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: ACCENT_GRN } };

        const stCell = rw.getCell(4);
        if (row.status === 'OPEN') stCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'E67E22' } };
        else if (row.status === 'CLOSED') stCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: ACCENT_GRN } };
        rw.height = 15;
    });

    ws2.autoFilter = { from: 'A2', to: `G2` };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.download = `Dashboard-${station.code}-${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
