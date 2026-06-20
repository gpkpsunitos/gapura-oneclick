"use client";

import { type Report } from "@/types";
import { generateWord } from "@/lib/utils/document-generator";

export interface ReportExportFilters {
  startDate: string;
  endDate: string;
  branch: string;
  airline: string;
  caseClassification: string;
  status: string;
  severity: string;
  source: string;
  search: string;
}

export interface ReportFilterOptions {
  branches: string[];
  airlines: string[];
  caseClassifications: string[];
  statuses: string[];
  severities: string[];
  sources: string[];
}

export const DEFAULT_REPORT_EXPORT_FILTERS: ReportExportFilters = {
  startDate: "",
  endDate: "",
  branch: "",
  airline: "",
  caseClassification: "",
  status: "",
  severity: "",
  source: "",
  search: "",
};

export function cleanReportValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || text === "-" || text === "#N/A" || text.toLowerCase() === "null") return "";
  return text;
}

export function reportDateValue(report: Report): Date | null {
  const raw = report.date_of_event || report.event_date || report.incident_date || report.created_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveReportBranch(report: Report): string {
  return cleanReportValue(report.branch)
    || cleanReportValue(report.reporting_branch)
    || cleanReportValue(report.station_code)
    || cleanReportValue(report.stations?.code)
    || cleanReportValue(report.kode_cabang);
}

export function resolveReportAirline(report: Report): string {
  return cleanReportValue(report.airlines)
    || cleanReportValue(report.airline)
    || cleanReportValue(report.maskapai_lookup);
}

export function resolveReportCaseClassification(report: Report): string {
  return cleanReportValue(report.case_classification)
    || cleanReportValue(report.case_category)
    || cleanReportValue(report.category)
    || cleanReportValue(report.main_category)
    || cleanReportValue(report.irregularity_complain_category);
}

export function resolveReportSeverity(report: Report): string {
  return cleanReportValue(report.severity_level)
    || cleanReportValue(report.severity)
    || "LOW";
}

export function reportMatchesSeverity(report: Report, severity: string): boolean {
  if (!severity) return true;
  const current = resolveReportSeverity(report).toUpperCase();
  const target = severity.toUpperCase();
  if (target === "TOP RISK") return current === "TOP RISK" || current === "CRITICAL";
  return current === target;
}

export function resolveReportSource(report: Report): string {
  return cleanReportValue(report.source_sheet)
    || cleanReportValue(report.primary_tag)
    || cleanReportValue(report.service_business_type)
    || "Manual";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function buildReportFilterOptions(reports: Report[]): ReportFilterOptions {
  return {
    branches: uniqueSorted(reports.map(resolveReportBranch)),
    airlines: uniqueSorted(reports.map(resolveReportAirline)),
    caseClassifications: uniqueSorted(reports.map(resolveReportCaseClassification)),
    statuses: uniqueSorted(reports.map((report) => cleanReportValue(report.status))),
    severities: uniqueSorted(reports.map(resolveReportSeverity)),
    sources: uniqueSorted(reports.map(resolveReportSource)),
  };
}

export function filterReportsForExport(reports: Report[], filters: ReportExportFilters): Report[] {
  const query = filters.search.trim().toLowerCase();
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;

  return reports.filter((report) => {
    const date = reportDateValue(report);
    if (start && date && date < start) return false;
    if (end && date && date > end) return false;
    if (filters.branch && resolveReportBranch(report) !== filters.branch) return false;
    if (filters.airline && resolveReportAirline(report) !== filters.airline) return false;
    if (filters.caseClassification && resolveReportCaseClassification(report) !== filters.caseClassification) return false;
    if (filters.status && cleanReportValue(report.status).toUpperCase() !== filters.status.toUpperCase()) return false;
    if (!reportMatchesSeverity(report, filters.severity)) return false;
    if (filters.source && resolveReportSource(report) !== filters.source) return false;
    if (!query) return true;

    const haystack = [
      report.id,
      report.reference_number,
      report.title,
      report.report,
      report.description,
      report.flight_number,
      report.route,
      resolveReportBranch(report),
      resolveReportAirline(report),
      resolveReportCaseClassification(report),
      resolveReportSource(report),
    ].map(cleanReportValue).join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function reportFilterSummary(filters: ReportExportFilters): string {
  const date = filters.startDate || filters.endDate
    ? `${filters.startDate || "awal"} - ${filters.endDate || "akhir"}`
    : "Periode semua waktu";
  return [
    date,
    filters.branch || "Semua branch",
    filters.airline || "Semua airlines",
    filters.caseClassification || "Semua case classification",
    filters.status || "Semua status",
    filters.severity || "Semua severity",
    filters.source || "Semua source",
  ].join(" | ");
}

function formatDate(value: unknown): string {
  const text = cleanReportValue(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportTitle(report: Report): string {
  return cleanReportValue(report.report) || cleanReportValue(report.title) || cleanReportValue(report.description) || "Untitled report";
}

function fileSafe(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "report";
}

export async function exportReportsToExcel(reports: Report[], filters: ReportExportFilters): Promise<void> {
  const exceljs = await import("exceljs");
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("All Reports");
  const now = new Date();

  sheet.addRow(["IRRS All Reports Export"]);
  sheet.addRow([reportFilterSummary(filters)]);
  sheet.addRow([`Generated: ${now.toLocaleString("id-ID")}`]);
  sheet.addRow([]);

  const header = sheet.addRow([
    "No",
    "Reference",
    "Date",
    "Status",
    "Severity",
    "Branch",
    "Airline",
    "Flight",
    "Route",
    "Case Classification",
    "Report",
    "Root Cause",
    "Action Taken",
    "Evidence",
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };

  reports.forEach((report, index) => {
    sheet.addRow([
      index + 1,
      cleanReportValue(report.reference_number) || report.id,
      formatDate(reportDateValue(report)?.toISOString()),
      cleanReportValue(report.status),
      resolveReportSeverity(report),
      resolveReportBranch(report),
      resolveReportAirline(report),
      cleanReportValue(report.flight_number),
      cleanReportValue(report.route),
      resolveReportCaseClassification(report),
      reportTitle(report),
      cleanReportValue(report.root_cause) || cleanReportValue(report.root_caused) || cleanReportValue(report.identification_of_root),
      cleanReportValue(report.action_taken) || cleanReportValue(report.immediate_action),
      [...(report.evidence_urls || []), report.evidence_url].filter(Boolean).join("\n"),
    ]);
  });

  sheet.columns = [
    { width: 6 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 24 },
    { width: 60 },
    { width: 42 },
    { width: 42 },
    { width: 48 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `All-Reports-${Date.now()}.xlsx`);
}

export async function exportReportsToPdf(reports: Report[], filters: ReportExportFilters): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IRRS All Reports Export", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(reportFilterSummary(filters), 14, y, { maxWidth: pageWidth - 28 });
  y += 10;

  reports.forEach((report, index) => {
    if (y > 185) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${index + 1}. ${cleanReportValue(report.flight_number) || cleanReportValue(report.reference_number) || report.id}`, 14, y);
    doc.text(`${cleanReportValue(report.status)} - ${resolveReportSeverity(report)}`, pageWidth - 74, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(reportTitle(report), 14, y, { maxWidth: pageWidth - 28 });
    y += 7;
    doc.setTextColor(90);
    doc.text(`${resolveReportBranch(report)} | ${resolveReportAirline(report)} | ${resolveReportCaseClassification(report)} | ${formatDate(reportDateValue(report)?.toISOString())}`, 14, y);
    doc.setTextColor(0);
    y += 8;
  });

  doc.save(`All-Reports-${Date.now()}.pdf`);
}

export async function exportReportsToDocx(reports: Report[], filters: ReportExportFilters): Promise<void> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = docx;

  const headerCell = (text: string) => new TableCell({
    shading: { fill: "047857" },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })] })],
  });
  const bodyCell = (text: string) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: text || "-", size: 18 })] })],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } },
    rows: [
      new TableRow({ children: ["No", "Date", "Status", "Severity", "Branch", "Flight", "Report"].map(headerCell) }),
      ...reports.map((report, index) => new TableRow({
        children: [
          String(index + 1),
          formatDate(reportDateValue(report)?.toISOString()),
          cleanReportValue(report.status),
          resolveReportSeverity(report),
          resolveReportBranch(report),
          cleanReportValue(report.flight_number),
          reportTitle(report),
        ].map(bodyCell),
      })),
    ],
  });

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "IRRS ALL REPORTS EXPORT", bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: reportFilterSummary(filters), size: 18 })] }),
        new Paragraph({ text: "" }),
        table,
      ],
    }],
  });
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `All-Reports-${Date.now()}.docx`);
}

function evidenceLinks(report: Report): string[] {
  return [...(report.evidence_urls || []), report.evidence_url, ...(report.partner_evidence_urls || [])]
    .map(cleanReportValue)
    .filter(Boolean);
}

export async function exportSingleReportToDocx(report: Report): Promise<void> {
  const reference = cleanReportValue(report.reference_number) || report.id.slice(0, 8).toUpperCase();
  const flight = cleanReportValue(report.flight_number);
  const links = evidenceLinks(report);
  const normalizedForIrregularityTemplate = {
    ...report,
    reference_no: reference,
    incident_date: cleanReportValue(report.date_of_event)
      || cleanReportValue(report.event_date)
      || cleanReportValue(report.incident_date)
      || cleanReportValue(report.created_at),
    branch: resolveReportBranch(report),
    airline: resolveReportAirline(report),
    airlines: resolveReportAirline(report),
    main_category: resolveReportCaseClassification(report),
    category: resolveReportCaseClassification(report),
    subject: `${[resolveReportAirline(report), flight].filter(Boolean).join(" ")} - ${resolveReportCaseClassification(report)} - ${resolveReportSeverity(report)}`,
    attachment: links.length ? `${links.length} Files` : "",
    description: reportTitle(report),
    report: reportTitle(report),
    root_cause: cleanReportValue(report.root_cause)
      || cleanReportValue(report.root_caused)
      || cleanReportValue(report.identification_of_root)
      || cleanReportValue(report.issue_caused),
    root_caused: cleanReportValue(report.root_cause)
      || cleanReportValue(report.root_caused)
      || cleanReportValue(report.identification_of_root)
      || cleanReportValue(report.issue_caused),
    action_taken: cleanReportValue(report.action_taken)
      || cleanReportValue(report.immediate_action)
      || cleanReportValue(report.gapura_kps_action_taken),
    preventive_action: cleanReportValue(report.preventive_action)
      || cleanReportValue(report.remarks_case)
      || cleanReportValue(report.remarks_gapura_kps)
      || cleanReportValue(report.kps_remarks),
    reporter_name: cleanReportValue(report.reporter_name)
      || cleanReportValue(report.users?.full_name)
      || cleanReportValue(report.reporter_email),
    evidence_urls: links,
  };
  const nameParts = [flight, resolveReportBranch(report), reference].map(cleanReportValue).filter(Boolean).join("-");
  await generateWord(normalizedForIrregularityTemplate, null, {
    filename: `Download-This-Case-Report-${fileSafe(nameParts)}.docx`,
  });
}
