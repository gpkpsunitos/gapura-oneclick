import type { DivisionDocument } from '@/types';
import { resolveMaterialLinks } from '@/lib/division-documents-material-links';

function fmtDate(value?: string | null) {
    if (!value) return '';
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export async function exportDivisionDocumentsToExcel(documents: DivisionDocument[]) {
    const exceljs = await import('exceljs');
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet('Circulars & Materials');

    const headers = [
        'Tanggal', 'Tempat', 'Agenda', 'PIC / Divisi', 'Cabang', 'Airlines', 'Peserta', 'Material Links',
    ];
    sheet.addRow(headers).font = { bold: true };

    for (const doc of documents) {
        const links = resolveMaterialLinks(doc).map((link) => `${link.title || 'Link'}: ${link.url}`).join('\n');
        const row = sheet.addRow([
            fmtDate(doc.meeting_date || doc.created_at),
            doc.activity_location || '',
            doc.title || '',
            doc.activity_pic || '',
            doc.station_code || doc.station_name || '',
            doc.airline || '',
            doc.participants || '',
            links,
        ]);
        row.getCell(8).alignment = { wrapText: true, vertical: 'top' };
    }

    sheet.columns = [
        { width: 14 }, { width: 20 }, { width: 28 }, { width: 18 }, { width: 12 },
        { width: 16 }, { width: 24 }, { width: 40 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const now = new Date();
    anchor.download = `Circulars-Materials-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}
