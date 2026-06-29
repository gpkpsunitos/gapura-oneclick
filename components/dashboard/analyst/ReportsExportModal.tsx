"use client";

import { useMemo, useState, useEffect, type ElementType } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  Layers,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Report } from "@/types";
import {
  DEFAULT_REPORT_EXPORT_FILTERS,
  buildReportFilterOptions,
  exportReportsToDocx,
  exportReportsToExcel,
  exportReportsToPdf,
  filterReportsForExport,
  reportFilterSummary,
  type ReportExportFilters,
} from "@/lib/reports-export";

interface ReportsExportModalProps {
  open: boolean;
  reports: Report[];
  onClose: () => void;
}

type ExportFormat = "excel" | "pdf" | "docx";

function SelectField({
  label,
  value,
  options,
  icon: Icon,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  icon: ElementType;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="relative">
        <Icon className="pointer-events-none absolute left-5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-700" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function ReportsExportModal({ open, reports, onClose }: ReportsExportModalProps) {
  const [filters, setFilters] = useState<ReportExportFilters>(DEFAULT_REPORT_EXPORT_FILTERS);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [joumpaReports, setJoumpaReports] = useState<Report[]>([]);
  const [joumpaLoading, setJoumpaLoading] = useState(false);

  const isJoumpa = filters.source === "JOUMPA";

  useEffect(() => {
    if (!isJoumpa || !open) return;
    setJoumpaLoading(true);
    fetch("/api/joumpa")
      .then((r) => r.json())
      .then((data) => setJoumpaReports((data.reports as Report[]) || []))
      .catch(() => setJoumpaReports([]))
      .finally(() => setJoumpaLoading(false));
  }, [isJoumpa, open]);

  const activeReports = isJoumpa ? joumpaReports : reports;

  const options = useMemo(() => {
    const base = buildReportFilterOptions(activeReports);
    if (!base.sources.includes("JOUMPA")) base.sources.push("JOUMPA");
    return base;
  }, [activeReports]);

  // When not JOUMPA, always include JOUMPA in source options from the IRRS reports
  const sourceOptions = useMemo(() => {
    if (isJoumpa) return options.sources;
    const base = buildReportFilterOptions(reports);
    if (!base.sources.includes("JOUMPA")) base.sources.push("JOUMPA");
    return base.sources;
  }, [isJoumpa, options.sources, reports]);

  const filteredReports = useMemo(() => filterReportsForExport(activeReports, filters), [activeReports, filters]);
  const summary = useMemo(() => reportFilterSummary(filters), [filters]);

  if (!open || typeof document === "undefined") return null;

  const updateFilter = (key: keyof ReportExportFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "source") {
        // Reset mode-specific filters when switching source
        next.area = "";
        next.caseClassification = "";
        next.customerType = "";
        next.joumpaCategory = "";
      }
      return next;
    });
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      if (format === "excel") await exportReportsToExcel(filteredReports, filters);
      if (format === "pdf") await exportReportsToPdf(filteredReports, filters);
      if (format === "docx") await exportReportsToDocx(filteredReports, filters);
    } finally {
      setExporting(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[min(1120px,calc(100vw-32px))] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600">Export All Reports</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-teal-800">Select export scope</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Export filters are independent of screen filters. Best for Excel / PDF / DOCX archives.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Close export modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-190px)] overflow-y-auto bg-[#fbfcf8] px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* Date range */}
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Start Date</span>
              <span className="relative">
                <CalendarDays className="pointer-events-none absolute left-5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-700" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter("startDate", event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">End Date</span>
              <span className="relative">
                <CalendarDays className="pointer-events-none absolute left-5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-700" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter("endDate", event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </span>
            </label>

            {/* Common */}
            <SelectField label="Branch" value={filters.branch} options={options.branches} icon={Building2} emptyLabel="All branches" onChange={(v) => updateFilter("branch", v)} />
            <SelectField label="Airlines" value={filters.airline} options={options.airlines} icon={Plane} emptyLabel="All airlines" onChange={(v) => updateFilter("airline", v)} />

            {/* Source — always visible, drives JOUMPA mode */}
            <SelectField label="Source" value={filters.source} options={sourceOptions} icon={Database} emptyLabel="All sources" onChange={(v) => updateFilter("source", v)} />

            {/* IRRS-specific filters */}
            {!isJoumpa && (
              <>
                <SelectField label="Area" value={filters.area} options={options.areas} icon={MapPin} emptyLabel="All areas" onChange={(v) => updateFilter("area", v)} />
                <SelectField label="Case Classification" value={filters.caseClassification} options={options.caseClassifications} icon={Tag} emptyLabel="All classifications" onChange={(v) => updateFilter("caseClassification", v)} />
              </>
            )}

            {/* JOUMPA-specific filters */}
            {isJoumpa && (
              <>
                <SelectField label="Category" value={filters.caseClassification} options={options.caseClassifications} icon={Tag} emptyLabel="All categories" onChange={(v) => updateFilter("caseClassification", v)} />
                <SelectField label="Sub-Category" value={filters.joumpaCategory} options={options.joumpaCategories} icon={Layers} emptyLabel="All sub-categories" onChange={(v) => updateFilter("joumpaCategory", v)} />
                <SelectField label="Customer Type" value={filters.customerType} options={options.customerTypes} icon={Users} emptyLabel="All customer types" onChange={(v) => updateFilter("customerType", v)} />
              </>
            )}

            {/* Common tail */}
            <SelectField label="Status" value={filters.status} options={options.statuses} icon={CheckCircle2} emptyLabel="All statuses" onChange={(v) => updateFilter("status", v)} />
            <SelectField label="Severity" value={filters.severity} options={options.severities} icon={ShieldCheck} emptyLabel="All severities" onChange={(v) => updateFilter("severity", v)} />
          </div>

          <label className="mt-6 flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Search in Export</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-700" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="ID, reference number, report, flight, branch, airlines…"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </span>
          </label>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              {joumpaLoading ? (
                <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-800">Loading JOUMPA data…</p>
              ) : (
                <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-800">
                  {filteredReports.length.toLocaleString("en-US")} / {activeReports.length.toLocaleString("en-US")} reports ready to export
                </p>
              )}
              <p className="mt-2 text-sm font-semibold text-slate-600">{summary}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(DEFAULT_REPORT_EXPORT_FILTERS)}
              className="h-12 rounded-2xl px-5 text-xs font-black uppercase tracking-[0.18em]"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
          {[
            { format: "excel" as const, label: "Export Excel", icon: FileSpreadsheet, className: "bg-emerald-700 hover:bg-emerald-800" },
            { format: "pdf" as const, label: "Export PDF", icon: FileText, className: "bg-teal-700 hover:bg-teal-800" },
            { format: "docx" as const, label: "Export DOCX", icon: FileText, className: "bg-amber-600 hover:bg-amber-700" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.format}
                type="button"
                disabled={exporting !== null || filteredReports.length === 0 || joumpaLoading}
                onClick={() => handleExport(item.format)}
                className={cn("h-14 rounded-2xl px-6 text-xs font-black uppercase tracking-[0.18em] text-white", item.className)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {exporting === item.format ? "Exporting…" : item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
