"use client";

import type { Report } from "@/types";
import type { jsPDF as JsPdfDocument } from "jspdf";

export interface ReportExportFilters {
  startDate: string;
  endDate: string;
  branch: string;
  airline: string;
  area: string;
  caseClassification: string;
  status: string;
  severity: string;
  source: string;
  customerType: string;
  joumpaCategory: string;
  search: string;
}

export interface ReportFilterOptions {
  branches: string[];
  airlines: string[];
  areas: string[];
  caseClassifications: string[];
  statuses: string[];
  severities: string[];
  sources: string[];
  customerTypes: string[];
  joumpaCategories: string[];
}

export const DEFAULT_REPORT_EXPORT_FILTERS: ReportExportFilters = {
  startDate: "",
  endDate: "",
  branch: "",
  airline: "",
  area: "",
  caseClassification: "",
  status: "",
  severity: "",
  source: "",
  customerType: "",
  joumpaCategory: "",
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

export function resolveReportArea(report: Report): string {
  return cleanReportValue(report.area);
}

export function resolveCustomerType(report: Report): string {
  return cleanReportValue(report.customer_joumpa);
}

export function resolveJoumpaCategory(report: Report): string {
  return cleanReportValue(report.category_case_joumpa);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function buildReportFilterOptions(reports: Report[]): ReportFilterOptions {
  return {
    branches: uniqueSorted(reports.map(resolveReportBranch)),
    airlines: uniqueSorted(reports.map(resolveReportAirline)),
    areas: uniqueSorted(reports.map(resolveReportArea)),
    caseClassifications: uniqueSorted(reports.map(resolveReportCaseClassification)),
    statuses: uniqueSorted(reports.map((report) => cleanReportValue(report.status))),
    severities: uniqueSorted(reports.map(resolveReportSeverity)),
    sources: uniqueSorted(reports.map(resolveReportSource)),
    customerTypes: uniqueSorted(reports.map(resolveCustomerType)),
    joumpaCategories: uniqueSorted(reports.map(resolveJoumpaCategory)),
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
    if (filters.area && resolveReportArea(report) !== filters.area) return false;
    if (filters.caseClassification && resolveReportCaseClassification(report) !== filters.caseClassification) return false;
    if (filters.status && cleanReportValue(report.status).toUpperCase() !== filters.status.toUpperCase()) return false;
    if (!reportMatchesSeverity(report, filters.severity)) return false;
    if (filters.source && resolveReportSource(report) !== filters.source) return false;
    if (filters.customerType && resolveCustomerType(report) !== filters.customerType) return false;
    if (filters.joumpaCategory && resolveJoumpaCategory(report) !== filters.joumpaCategory) return false;
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
      resolveReportArea(report),
      resolveReportCaseClassification(report),
      resolveReportSource(report),
      resolveCustomerType(report),
      resolveJoumpaCategory(report),
    ].map(cleanReportValue).join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function reportFilterSummary(filters: ReportExportFilters): string {
  const date = filters.startDate || filters.endDate
    ? `${filters.startDate || "start"} – ${filters.endDate || "now"}`
    : "All time";
  const parts = [
    date,
    filters.branch || "All branches",
    filters.airline || "All airlines",
    filters.area || "All areas",
    filters.caseClassification || "All classifications",
    filters.status || "All statuses",
    filters.severity || "All severities",
    filters.source || "All sources",
  ];
  if (filters.customerType) parts.push(filters.customerType);
  if (filters.joumpaCategory) parts.push(filters.joumpaCategory);
  return parts.join(" | ");
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

export interface PdfReportField {
  label: string;
  value: string;
}

export interface PdfReportSection {
  title: string;
  fields: PdfReportField[];
}

export interface PdfReportContent {
  reference: string;
  title: string;
  status: string;
  severity: string;
  facts: PdfReportField[];
  sections: PdfReportSection[];
  evidence: string[];
  videos: string[];
  comments: PdfReportField[];
}

const PDF_INTERNAL_FIELDS = new Set([
  "id",
  "user_id",
  "station_id",
  "unit_id",
  "location_id",
  "incident_type_id",
  "evidence_file_ids",
  "evidence_submission_id",
  "source_spreadsheet_id",
  "sheet_id",
  "source_fingerprint",
  "original_id",
  "stations",
  "users",
  "comments",
]);

const PDF_PAGE = {
  marginX: 14,
  contentTop: 36,
  contentBottom: 194,
  footerLineY: 199,
  footerTextY: 203,
} as const;

function normalizedComparableValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatPdfFieldValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map(cleanReportValue).filter(Boolean).join("\n");
  }
  return cleanReportValue(value);
}

function humanizeReportKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bGse\b/g, "GSE")
    .replace(/\bKps\b/g, "KPS")
    .replace(/\bJoumpa\b/g, "JOUMPA")
    .replace(/\bSla\b/g, "SLA");
}

function pdfSafeText(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00a0/g, " ");
}

function formatDateTime(value: unknown): string {
  const text = cleanReportValue(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function uniqueReportLinks(values: unknown[]): string[] {
  return Array.from(new Set(values.flatMap((value) => Array.isArray(value) ? value : [value])
    .map(cleanReportValue)
    .filter(Boolean)));
}

export function buildPdfReportContent(report: Report): PdfReportContent {
  const consumed = new Set<string>();
  const seenValues = new Set<string>();

  const take = (label: string, keys: string[], options?: { date?: boolean; dateTime?: boolean; allowDuplicate?: boolean }): PdfReportField | null => {
    keys.forEach((key) => consumed.add(key));
    const raw = keys.map((key) => report[key]).find((value) => formatPdfFieldValue(value));
    const value = options?.dateTime ? formatDateTime(raw) : options?.date ? formatDate(raw) : formatPdfFieldValue(raw);
    if (!value) return null;
    const comparable = normalizedComparableValue(value);
    if (!options?.allowDuplicate && seenValues.has(comparable)) return null;
    seenValues.add(comparable);
    return { label, value };
  };
  const direct = (label: string, raw: unknown, consumedKeys: string[]): PdfReportField | null => {
    consumedKeys.forEach((key) => consumed.add(key));
    const value = formatPdfFieldValue(raw);
    if (!value) return null;
    const comparable = normalizedComparableValue(value);
    if (seenValues.has(comparable)) return null;
    seenValues.add(comparable);
    return { label, value };
  };

  const fields = (...entries: Array<PdfReportField | null>): PdfReportField[] => entries.filter((entry): entry is PdfReportField => Boolean(entry));
  const reference = cleanReportValue(report.reference_number)
    || cleanReportValue(report.flight_number)
    || report.id.slice(0, 8).toUpperCase();
  const compactTitle = cleanReportValue(report.title)
    || resolveReportCaseClassification(report)
    || cleanReportValue(report.flight_number)
    || "Untitled report";

  const facts = fields(
    take("Event date", ["date_of_event", "event_date", "incident_date"], { date: true }),
    direct("Branch", resolveReportBranch(report), ["branch", "reporting_branch", "station_code", "kode_cabang"]),
    take("Hub", ["hub", "kode_hub"]),
    direct("Airline", resolveReportAirline(report), ["airlines", "airline", "maskapai_lookup", "jenis_maskapai"]),
    take("Flight", ["flight_number"]),
    take("Aircraft registration", ["aircraft_reg"]),
    take("Route", ["route"]),
    take("Area", ["area"]),
    take("Location", ["specific_location", "location"]),
    take("Airport", ["airport_name", "airport_code", "branch_code"]),
    direct("Case classification", resolveReportCaseClassification(report), ["case_classification", "case_category", "category", "main_category", "irregularity_complain_category"]),
    take("Priority", ["priority"]),
  );

  // The report header already displays these values. Mark every alias consumed so
  // fallback handling cannot print them again under Additional Information.
  ["reference_number", "status", "severity", "severity_level", "title", "created_at"].forEach((key) => consumed.add(key));
  [reference, compactTitle, cleanReportValue(report.status), resolveReportSeverity(report)]
    .map(normalizedComparableValue)
    .filter(Boolean)
    .forEach((value) => seenValues.add(value));

  const sections: PdfReportSection[] = [
    {
      title: "Report narrative",
      fields: fields(
        take("Report", ["report"]),
        take("Description", ["description"]),
        take("Accident / incident", ["accident_incident"]),
        take("Issue caused", ["issue_caused"]),
        take("Breakdown caused", ["breakdown_caused"]),
      ),
    },
    {
      title: "Classification and operational context",
      fields: fields(
        take("Terminal area category", ["terminal_area_category"]),
        take("Apron area category", ["apron_area_category"]),
        take("General category", ["general_category"]),
        take("Subcategory note", ["sub_category_note"]),
        take("Service business type", ["service_business_type"]),
        take("GSE case category", ["category_case_gse"]),
        take("Cargo case category", ["category_case_cargo"]),
        take("JOUMPA case category", ["category_case_joumpa"]),
        take("Primary tag", ["primary_tag"]),
        take("Domestic / international", ["dom_inter", "kode_inter"]),
        take("Delay code", ["delay_code"]),
        take("Delay duration", ["delay_duration"]),
        take("Week in month", ["week_in_month"]),
        take("Local MPA", ["lokal_mpa_lookup"]),
      ),
    },
    {
      title: "Root cause and response",
      fields: fields(
        take("Root cause", ["root_cause", "root_caused", "identification_of_root"]),
        take("Immediate action", ["immediate_action"]),
        take("Action taken", ["action_taken"]),
        take("Gapura / KPS action", ["gapura_kps_action_taken"]),
        take("Preventive action", ["preventive_action"]),
        take("KPS remarks", ["kps_remarks", "remarks_gapura_kps"]),
        take("Remarks by", ["remarks_by"]),
        take("Case remarks", ["remarks_case"]),
        take("Final remarks", ["final_remarks"]),
      ),
    },
    {
      title: "Flight and GSE details",
      fields: fields(
        take("Flight related", ["is_flight_related"]),
        take("GSE related", ["is_gse_related"]),
        take("GSE number", ["gse_number"]),
        take("GSE name", ["gse_name"]),
        take("GSE availability requirement", ["gse_available_requirement"]),
        take("GSE requirement", ["gse_requirement"]),
        take("Motorized GSE", ["gse_motorized"]),
        take("Non-motorized GSE", ["gse_non_motorized"]),
      ),
    },
    {
      title: "Customer and service details",
      fields: fields(
        take("JOUMPA case", ["case_joumpa"]),
        take("JOUMPA compliment / excellent service", ["joumpa_compliment_report_excellent_service"]),
        take("JOUMPA customer", ["customer_joumpa"]),
        take("JOUMPA customer detail", ["detail_customer_joumpa"]),
        take("Corporate customer", ["corporate"]),
        take("Corporate profile", ["customer_company_profile_corporate"]),
        take("Corporate customer detail", ["detail_customer_corporate"]),
        take("Non-corporate customer", ["non_corporate"]),
        take("Non-corporate background", ["customer_background_non_corporate"]),
        take("Non-corporate customer detail", ["detail_customer_non_corporate"]),
        take("Cargo case", ["case_cgo"]),
        take("Reservation / scheduling", ["reservation_scheduling"]),
        take("Passenger assistance / staff performance", ["pax_assistance_staff_service_performance"]),
        take("Baggage delivery / assistance", ["baggage_delivery_baggage_assistance"]),
        take("Administration / payment / documentation / marketing", ["administration_payment_documentation_marketing"]),
        take("Customer satisfaction score", ["customer_satisfaction_score"]),
        take("Customer satisfaction label", ["customer_satisfaction_label"]),
      ),
    },
    {
      title: "Investigation and validation",
      fields: fields(
        take("Investigator notes", ["investigator_notes"]),
        take("Manager notes", ["manager_notes"]),
        take("Partner response", ["partner_response_notes"]),
        take("Validation notes", ["validation_notes"]),
        take("Escalation division", ["esklasi_divisi"]),
        take("Target division", ["target_division"]),
      ),
    },
    {
      title: "Reporter and timeline",
      fields: fields(
        direct("Reporter", cleanReportValue(report.reporter_name) || cleanReportValue(report.users?.full_name), ["reporter_name"]),
        take("Reporter email", ["reporter_email"]),
        take("Created", ["created_at"], { dateTime: true }),
        take("Updated", ["updated_at"], { dateTime: true }),
        take("Resolved", ["resolved_at"], { dateTime: true }),
        take("SLA deadline", ["sla_deadline"], { dateTime: true }),
        take("Source", ["source_sheet"]),
        take("Source row", ["row_number"]),
      ),
    },
  ].filter((section) => section.fields.length > 0);

  const evidence = uniqueReportLinks([report.evidence_urls, report.evidence_url, report.partner_evidence_urls]);
  const videos = uniqueReportLinks([report.video_urls, report.video_url]);
  ["evidence_urls", "evidence_url", "partner_evidence_urls", "video_urls", "video_url"].forEach((key) => consumed.add(key));
  const supportingEvidence = take("Supporting evidence", ["supporting_evidence"]);
  if (supportingEvidence) sections.push({ title: "Supporting evidence notes", fields: [supportingEvidence] });

  const comments = (report.comments || []).flatMap((comment, index) => {
    const author = cleanReportValue(comment.users?.full_name) || "Comment author";
    const timestamp = formatDateTime(comment.created_at);
    const attachmentText = uniqueReportLinks(comment.attachments || []).length
      ? `\nAttachments:\n${uniqueReportLinks(comment.attachments || []).join("\n")}`
      : "";
    const value = `${cleanReportValue(comment.content)}${attachmentText}`.trim();
    return value ? [{ label: `${index + 1}. ${author}${timestamp ? ` - ${timestamp}` : ""}`, value }] : [];
  });

  const additionalFields: PdfReportField[] = [];
  Object.entries(report).forEach(([key, rawValue]) => {
    if (consumed.has(key) || PDF_INTERNAL_FIELDS.has(key) || key.endsWith("_id") || key.endsWith("_ids")) return;
    if (key.startsWith("source_") && key !== "source_sheet") return;
    if (typeof rawValue === "object" && !Array.isArray(rawValue)) return;
    const value = formatPdfFieldValue(rawValue);
    if (!value) return;
    const comparable = normalizedComparableValue(value);
    if (seenValues.has(comparable)) return;
    seenValues.add(comparable);
    additionalFields.push({ label: humanizeReportKey(key), value });
  });
  if (additionalFields.length) sections.push({ title: "Additional information", fields: additionalFields });

  return {
    reference,
    title: compactTitle,
    status: cleanReportValue(report.status) || "UNKNOWN",
    severity: resolveReportSeverity(report),
    facts,
    sections,
    evidence,
    videos,
    comments,
  };
}

async function loadPdfLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") return null;
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Unable to decode PDF logo"));
        element.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(320, image.naturalWidth);
      canvas.height = Math.round(canvas.width * (image.naturalHeight / image.naturalWidth));
      const drawing = canvas.getContext("2d");
      if (!drawing) return null;
      drawing.fillStyle = "#ffffff";
      drawing.fillRect(0, 0, canvas.width, canvas.height);
      drawing.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

interface PdfRenderContext {
  doc: JsPdfDocument;
  filters: ReportExportFilters;
  logoDataUrl: string | null;
  reportCount: number;
  y: number;
  currentReportLabel: string;
}

function drawPdfHeader(context: PdfRenderContext): void {
  const { doc, filters, logoDataUrl, reportCount } = context;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  if (logoDataUrl) {
    try {
      const imageFormat = logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, imageFormat, PDF_PAGE.marginX, 5, 32, 18, "gapura-oneclick-logo", "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 118, 110);
      doc.text("Gapura Oneclick", PDF_PAGE.marginX, 14);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Gapura Oneclick", PDF_PAGE.marginX, 14);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Gapura Oneclick All Reports Export", pageWidth - PDF_PAGE.marginX, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Complete operational report archive", pageWidth - PDF_PAGE.marginX, 16, { align: "right" });

  const summary = pdfSafeText(reportFilterSummary(filters));
  const summaryLines = doc.splitTextToSize(summary, pageWidth - 110) as string[];
  doc.setFontSize(6.7);
  doc.text(summaryLines.slice(0, 2), 52, 23);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text(`${reportCount} REPORTS`, pageWidth - PDF_PAGE.marginX, 24, { align: "right" });
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.7);
  doc.line(PDF_PAGE.marginX, 30, pageWidth - PDF_PAGE.marginX, 30);
  doc.setTextColor(15, 23, 42);
}

function addPdfContinuationPage(context: PdfRenderContext): void {
  context.doc.addPage();
  drawPdfHeader(context);
  context.y = PDF_PAGE.contentTop;
  if (context.currentReportLabel) {
    context.doc.setFillColor(241, 247, 245);
    context.doc.roundedRect(PDF_PAGE.marginX, context.y - 1, context.doc.internal.pageSize.getWidth() - PDF_PAGE.marginX * 2, 7, 1.5, 1.5, "F");
    context.doc.setFont("helvetica", "bold");
    context.doc.setFontSize(7);
    context.doc.setTextColor(15, 118, 110);
    context.doc.text(`${pdfSafeText(context.currentReportLabel)} - CONTINUED`, PDF_PAGE.marginX + 3, context.y + 3.6);
    context.doc.setTextColor(15, 23, 42);
    context.y += 10;
  }
}

function ensurePdfSpace(context: PdfRenderContext, requiredHeight: number): void {
  if (context.y + requiredHeight <= PDF_PAGE.contentBottom) return;
  addPdfContinuationPage(context);
}

function drawPdfSectionHeading(context: PdfRenderContext, title: string): void {
  ensurePdfSpace(context, 8);
  const { doc } = context;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 118, 110);
  doc.text(pdfSafeText(title).toUpperCase(), PDF_PAGE.marginX, context.y + 2.5);
  const textWidth = doc.getTextWidth(pdfSafeText(title).toUpperCase());
  doc.setDrawColor(219, 229, 226);
  doc.setLineWidth(0.25);
  doc.line(PDF_PAGE.marginX + textWidth + 4, context.y + 1.7, pageWidth - PDF_PAGE.marginX, context.y + 1.7);
  doc.setTextColor(15, 23, 42);
  context.y += 6;
}

function drawPdfField(context: PdfRenderContext, sectionTitle: string, field: PdfReportField): void {
  const { doc } = context;
  const width = doc.internal.pageSize.getWidth() - PDF_PAGE.marginX * 2;
  const innerWidth = width - 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(pdfSafeText(field.value), innerWidth) as string[];
  const lineHeight = 3.8;
  let offset = 0;
  let continued = false;

  while (offset < lines.length) {
    const labelHeight = 4.2;
    ensurePdfSpace(context, labelHeight + lineHeight + 4);
    if (continued) drawPdfSectionHeading(context, `${sectionTitle} - continued`);
    const availableLines = Math.max(1, Math.floor((PDF_PAGE.contentBottom - context.y - labelHeight - 3) / lineHeight));
    const chunk = lines.slice(offset, offset + availableLines);
    const blockHeight = labelHeight + chunk.length * lineHeight + 3;

    doc.setFillColor(247, 249, 248);
    doc.roundedRect(PDF_PAGE.marginX, context.y, width, blockHeight, 1.4, 1.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 110);
    doc.text(`${pdfSafeText(field.label)}${continued ? " (continued)" : ""}`.toUpperCase(), PDF_PAGE.marginX + 3, context.y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(chunk, PDF_PAGE.marginX + 3, context.y + labelHeight + 2.2, { lineHeightFactor: 1.2 });
    context.y += blockHeight + 2;
    offset += chunk.length;
    if (offset < lines.length) {
      addPdfContinuationPage(context);
      continued = true;
    }
  }
}

function drawPdfFactGrid(context: PdfRenderContext, facts: PdfReportField[]): void {
  const { doc } = context;
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - PDF_PAGE.marginX * 2;
  const columns = 4;
  const cellWidth = width / columns;
  for (let start = 0; start < facts.length; start += columns) {
    const row = facts.slice(start, start + columns);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    const values = row.map((field) => doc.splitTextToSize(pdfSafeText(field.value), cellWidth - 6) as string[]);
    const rowHeight = Math.max(12, 8 + Math.max(...values.map((lines) => lines.length)) * 3.2);
    ensurePdfSpace(context, rowHeight + 2);
    row.forEach((field, index) => {
      const x = PDF_PAGE.marginX + index * cellWidth;
      doc.setFillColor(247, 249, 248);
      doc.setDrawColor(220, 229, 226);
      doc.roundedRect(x, context.y, cellWidth - 1.2, rowHeight, 1.2, 1.2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 110);
      doc.text(pdfSafeText(field.label).toUpperCase(), x + 2.5, context.y + 3.8);
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(values[index], x + 2.5, context.y + 8, { lineHeightFactor: 1.15 });
    });
    context.y += rowHeight + 2;
  }
}

function drawPdfLinks(context: PdfRenderContext, title: string, links: string[]): void {
  if (!links.length) return;
  drawPdfSectionHeading(context, title);
  const { doc } = context;
  const width = doc.internal.pageSize.getWidth() - PDF_PAGE.marginX * 2 - 6;
  links.forEach((link, index) => {
    const display = `${index + 1}. ${pdfSafeText(link)}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const lines = doc.splitTextToSize(display, width) as string[];
    lines.forEach((line) => {
      ensurePdfSpace(context, 4.2);
      doc.setTextColor(15, 118, 110);
      doc.text(line, PDF_PAGE.marginX + 3, context.y + 2.8);
      const linkWidth = Math.min(width, doc.getTextWidth(line));
      doc.link(PDF_PAGE.marginX + 3, context.y, linkWidth, 3.6, { url: link });
      context.y += 3.8;
    });
    context.y += 1;
  });
  doc.setTextColor(15, 23, 42);
}

function drawPdfReport(context: PdfRenderContext, content: PdfReportContent, index: number): void {
  const { doc } = context;
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportLabel = `Report ${content.reference}`;
  const minimumReportStartHeight = 52;
  if (context.y + minimumReportStartHeight > PDF_PAGE.contentBottom) {
    context.currentReportLabel = "";
    addPdfContinuationPage(context);
  }
  context.currentReportLabel = reportLabel;

  if (context.y > PDF_PAGE.contentTop + 2) {
    doc.setDrawColor(203, 213, 210);
    doc.setLineWidth(0.35);
    doc.line(PDF_PAGE.marginX, context.y, pageWidth - PDF_PAGE.marginX, context.y);
    context.y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 118, 110);
  doc.text(`REPORT ${index + 1} OF ${context.reportCount} - ${pdfSafeText(content.reference)}`, PDF_PAGE.marginX, context.y + 3);
  const stateText = `${pdfSafeText(content.status).toUpperCase()} - ${pdfSafeText(content.severity).toUpperCase()}`;
  const stateWidth = doc.getTextWidth(stateText) + 8;
  doc.setFillColor(255, 240, 241);
  doc.roundedRect(pageWidth - PDF_PAGE.marginX - stateWidth, context.y - 0.5, stateWidth, 6, 3, 3, "F");
  doc.setTextColor(190, 24, 93);
  doc.text(stateText, pageWidth - PDF_PAGE.marginX - 4, context.y + 3.2, { align: "right" });
  context.y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(pdfSafeText(content.title), pageWidth - PDF_PAGE.marginX * 2) as string[];
  doc.text(titleLines, PDF_PAGE.marginX, context.y + 3, { lineHeightFactor: 1.15 });
  context.y += titleLines.length * 4.5 + 4;
  drawPdfFactGrid(context, content.facts);

  content.sections.forEach((section) => {
    drawPdfSectionHeading(context, section.title);
    section.fields.forEach((field) => drawPdfField(context, section.title, field));
  });
  drawPdfLinks(context, "Evidence", content.evidence);
  drawPdfLinks(context, "Video evidence", content.videos);
  if (content.comments.length) {
    drawPdfSectionHeading(context, "Comments and activity");
    content.comments.forEach((comment) => drawPdfField(context, "Comments and activity", comment));
  }
  context.y += 4;
}

function finalizePdfPages(doc: JsPdfDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(219, 229, 226);
    doc.setLineWidth(0.25);
    doc.line(PDF_PAGE.marginX, PDF_PAGE.footerLineY, pageWidth - PDF_PAGE.marginX, PDF_PAGE.footerLineY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Gapura Oneclick - Internal operational document", PDF_PAGE.marginX, PDF_PAGE.footerTextY);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - PDF_PAGE.marginX, PDF_PAGE.footerTextY, { align: "right" });
  }
}

export async function buildReportsPdf(
  reports: Report[],
  filters: ReportExportFilters,
  options: { logoDataUrl?: string | null } = {},
): Promise<JsPdfDocument> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
  const logoDataUrl = options.logoDataUrl === undefined ? await loadPdfLogoDataUrl() : options.logoDataUrl;
  const context: PdfRenderContext = {
    doc,
    filters,
    logoDataUrl,
    reportCount: reports.length,
    y: PDF_PAGE.contentTop,
    currentReportLabel: "",
  };
  drawPdfHeader(context);

  if (!reports.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("No reports matched the selected export filters.", PDF_PAGE.marginX, context.y + 8);
  } else {
    reports.map(buildPdfReportContent).forEach((content, index) => drawPdfReport(context, content, index));
  }
  finalizePdfPages(doc);
  return doc;
}

export async function exportReportsToExcel(reports: Report[], filters: ReportExportFilters): Promise<void> {
  const [exceljs, excelStyles] = await Promise.all([
    import("exceljs"),
    import("@/lib/excel-export-style"),
  ]);
  const { addAdvancedExcelTable, configureExcelWorkbook, excelHyperlink, styleExcelTitle } = excelStyles;
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("All Reports");
  const now = new Date();
  configureExcelWorkbook(workbook, "Gapura Oneclick All Reports Export");
  styleExcelTitle(sheet, 1, 1, 14, "Gapura Oneclick All Reports Export");
  sheet.mergeCells("A2:N2");
  sheet.getCell("A2").value = reportFilterSummary(filters);
  sheet.getCell("A2").font = { name: "Aptos", size: 10, color: { argb: "FF64748B" } };
  sheet.getCell("A2").alignment = { vertical: "middle", indent: 1 };
  sheet.mergeCells("A3:N3");
  sheet.getCell("A3").value = `Generated: ${now.toLocaleString("id-ID")}`;
  sheet.getCell("A3").font = { name: "Aptos", italic: true, size: 9, color: { argb: "FF64748B" } };
  sheet.getCell("A3").alignment = { vertical: "middle", indent: 1 };

  const columns = [
    { header: "No", kind: "number" as const, width: 7 },
    { header: "Reference", kind: "identifier" as const, width: 20 },
    { header: "Date", kind: "date" as const, width: 15 },
    { header: "Status", kind: "status" as const, width: 15 },
    { header: "Severity", kind: "severity" as const, width: 15 },
    { header: "Branch", kind: "identifier" as const, width: 12 },
    { header: "Airline", kind: "text" as const, width: 20 },
    { header: "Flight", kind: "identifier" as const, width: 14 },
    { header: "Route", kind: "identifier" as const, width: 17 },
    { header: "Case Classification", kind: "text" as const, width: 24 },
    { header: "Report", kind: "multiline" as const, width: 48 },
    { header: "Root Cause", kind: "multiline" as const, width: 38 },
    { header: "Action Taken", kind: "multiline" as const, width: 38 },
    { header: "Evidence", kind: "url" as const, width: 36 },
  ];
  const rows = reports.map((report, index) => {
    const evidence = [...(report.evidence_urls || []), report.evidence_url]
      .map((value) => cleanReportValue(value))
      .filter((value, valueIndex, values) => value && values.indexOf(value) === valueIndex);
    return [
      index + 1,
      cleanReportValue(report.reference_number) || report.id,
      reportDateValue(report) ?? "",
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
      evidence.length ? excelHyperlink(evidence[0], evidence.join("\n")) : "",
    ];
  });
  addAdvancedExcelTable({
    workbook,
    worksheet: sheet,
    name: "AllReportsTable",
    columns,
    rows,
    startRow: 5,
    freezeRows: 5,
    freezeColumns: 2,
    emptyMessage: "No reports matched the selected export filters.",
  });
  sheet.pageSetup.printTitlesRow = "5:5";

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `All-Reports-${Date.now()}.xlsx`);
}

export async function exportReportsToPdf(reports: Report[], filters: ReportExportFilters): Promise<void> {
  const doc = await buildReportsPdf(reports, filters);
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
  const { generateWord } = await import("@/lib/utils/document-generator");
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
