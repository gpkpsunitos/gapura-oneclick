"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Edit3,
  ExternalLink,
  FileText,
  FileType,
  Image as ImageIcon,
  Link,
  Loader2,
  MapPin,
  MessageSquare,
  Plane,
  Plus,
  RotateCcw,
  Save,
  Tag,
  User,
  X,
} from "lucide-react";

// Cache bust: 2026-03-01T06:58:00
import {
  STATUS_CONFIG,
  getAllowedTransitions,
  normalizeStatus,
  type ReportStatus,
} from "@/lib/constants/report-status";
import { cn, formatDate } from "@/lib/utils";
import { type Report, type UserRole } from "@/types";
import { CommentInput } from "@/components/dashboard/reports/CommentInput";
import { generatePDF, generateWord } from "@/lib/utils/document-generator";
import { DocxEditorModal } from "@/components/dashboard/DocxEditorModal";
import { BriefingEditorModal } from "@/components/dashboard/BriefingEditorModal";
import { EvidenceViewModal } from "@/components/dashboard/EvidenceViewModal";
import { AIAnalysisSection } from "@/components/dashboard/ai-summary";
import { canExportBranchData, canEditReport } from "@/lib/permissions";

/* ============================================
   DESIGN TOKENS — PRISM v3 Compliant
   ============================================ */

const SEVERITY_BADGES: Record<string, { label: string; classes: string }> = {
  urgent: { label: "URGENT", classes: "bg-red-100 text-red-700 ring-red-200" },
  high: { label: "HIGH", classes: "bg-orange-100 text-orange-700 ring-orange-200" },
  medium: { label: "MEDIUM", classes: "bg-amber-100 text-amber-700 ring-amber-200" },
  low: { label: "LOW", classes: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

const AREA_LABELS: Record<string, string> = {
  TERMINAL: "Terminal Area",
  APRON: "Apron Area",
  GENERAL: "General",
};

/* ============================================
   COMPONENT: DataField (Definition List Item)
   ============================================ */
function DataField({ 
  label, 
  value, 
  icon: Icon,
  span = 1 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon?: React.ElementType;
  span?: 1 | 2;
}) {
  const isEmpty = !value || value === "" || value === "-" || value === "—";
  return (
    <div className={cn("group", span === 2 && "col-span-2")}>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {Icon && <Icon size={12} strokeWidth={2} className="opacity-60" />}
        {label}
      </dt>
      <dd className={cn(
        "text-[14px] md:text-[15px] leading-snug break-words",
        isEmpty ? "text-gray-300 italic" : "text-[var(--text-primary)] font-medium"
      )}>
        {isEmpty ? "Tidak ditentukan" : value}
      </dd>
    </div>
  );
}

/* ============================================
   COMPONENT: SectionCard
   ============================================ */
function SectionCard({ 
  title, 
  children, 
  className,
  headerAction
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className={cn(
      "bg-[var(--surface-2)] rounded-2xl border border-gray-200/80 shadow-[var(--shadow-sm)]",
      "transition-shadow duration-200 hover:shadow-[var(--shadow-md)]",
      className
    )}>
      {title && (
        <header className="flex items-center justify-between px-4 md:px-5 py-3 md:py-3.5 border-b border-gray-100">
          <h3 className="text-[12px] md:text-[13px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{title}</h3>
          {headerAction}
        </header>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

/* ============================================
   PROPS INTERFACE
   ============================================ */
interface ReportDetailViewProps {
  report: Report | null;
  onUpdateStatus?: (reportId: string, status: string, notes?: string, evidenceUrl?: string) => Promise<void>;
  onRefresh?: (updatedReport?: Report) => void;
  onClose?: () => void;
  userRole?: string;
  divisionColor?: string;
  isModal?: boolean;
  currentUserId?: string;
  currentUserStationId?: string;
  onDispatchOpenChange?: (open: boolean) => void;
}

/* ============================================
   MAIN COMPONENT: ReportDetailView
   ============================================ */
export function ReportDetailView({
  report,
  onUpdateStatus,
  onRefresh,
  onClose,
  userRole = "PARTNER_ADMIN",
  divisionColor = "#10b981",
  onDispatchOpenChange,
  currentUserId,
  currentUserStationId,
}: ReportDetailViewProps) {
  // State
  const [isDocxModalOpen, setIsDocxModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [showBriefingEditor, setShowBriefingEditor] = useState(false);
  const [lampiranActionType, setLampiranActionType] = useState<"CORRECTIVE" | "PREVENTIVE" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    title: "", description: "", flight_number: "", aircraft_reg: "", location: "",
    route: "", airline: "", area: "", target_division: "", branch: "",
    date_of_event: "", root_caused: "", action_taken: "", preventive_action: "",
    sub_category_note: ""
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCommentRef = useRef<HTMLDivElement>(null);

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ primary_tag: "", sub_category_note: "", target_division: "" });
  const [mounted, setMounted] = useState(false);
  const prefillOnceRef = useRef(false);

  useEffect(() => {
    onDispatchOpenChange?.(showDispatchModal);
  }, [showDispatchModal, onDispatchOpenChange]);

  // Auto scroll to bottom when new comments arrive
  useEffect(() => {
    if (report?.comments?.length) {
      lastCommentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [report?.comments?.length]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Sync edit form with report
  useEffect(() => {
    if (report) {
      setEditForm({
        title: report.title || "",
        description: report.description || "",
        flight_number: report.flight_number || "",
        aircraft_reg: report.aircraft_reg || "",
        location: report.location || report.specific_location || "",
        route: report.route || "",
        airline: report.airline || report.airlines || "",
        area: report.area || "",
        target_division: report.target_division || "",
        branch: report.branch || report.stations?.code || "",
        date_of_event: report.date_of_event || report.event_date || report.created_at || "",
        root_caused: report.root_caused || report.root_cause || "",
        action_taken: report.action_taken || report.gapura_kps_action_taken || "",
        preventive_action: report.preventive_action || report.immediate_action || "",
        sub_category_note: report.sub_category_note || report.kps_remarks || report.remarks_gapura_kps || ""
      });
      if (!showDispatchModal) {
        setDispatchForm({
          primary_tag: report.primary_tag || "",
          sub_category_note: report.sub_category_note || "",
          target_division: report.target_division || ""
        });
      }
    }
  }, [report, showDispatchModal]);

  useEffect(() => {
    if (showDispatchModal) {
      if (!prefillOnceRef.current && report) {
        setDispatchForm({
          primary_tag: report.primary_tag || "",
          sub_category_note: report.sub_category_note || "",
          target_division: report.target_division || ""
        });
        prefillOnceRef.current = true;
      }
    } else {
      prefillOnceRef.current = false;
    }
  }, [showDispatchModal]);

  useEffect(() => {}, []);



  // Handlers
  const handleRefresh = async () => {
    if (!onRefresh || refreshing || showDispatchModal) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (status: string, notes?: string, evidenceUrl?: string) => {
    if (!onUpdateStatus || !report) return;
    setActionLoading(true);
    try {
      await onUpdateStatus(report.id, status, notes, evidenceUrl);
      onRefresh?.();
      setShowCloseModal(false);
      setShowReopenModal(false);
      setShowVerifyModal(false);
      setCloseNotes("");
      setVerifyNotes("");
      setReopenNotes("");
    } finally { setActionLoading(false); }
  };

  const handleDispatch = async () => {
      if (!report) return;
      setActionLoading(true);
      try {
          // dispatchForm contains primary_tag, sub_category_note, target_division
          // We update these fields via the same API route with is_dispatch flag
          const res = await fetch(`/api/reports/${report.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...dispatchForm,
                is_dispatch: true
              })
          });
          
          if (!res.ok) throw new Error("Failed to dispatch");
          
          const updatedReport = await res.json();
          setShowDispatchModal(false);
          setTimeout(() => {
            onRefresh?.(updatedReport);
          }, 0);
      } catch (error) {
          console.error(error);
          alert("Gagal melakukan dispatch");
      } finally {
          setActionLoading(false);
      }
  };

  const compressImage = (file: File, opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}) => {
    const { maxWidth = 1600, maxHeight = 1600, quality = 0.8, mimeType = 'image/webp' } = opts;
    return new Promise<File>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('Canvas not supported')); }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Compression failed'));
          const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type });
          resolve(compressed);
        }, mimeType, quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load error')); };
      img.src = url;
    });
  };

  const handleUploadEvidence = async () => {
    if (!report || evidenceFiles.length === 0) return;
    setActionLoading(true);
    try {
      const currentEvidence = report.evidence_urls || (report.evidence_url ? [report.evidence_url] : []);
      const uploaded: string[] = [];
      for (const file of evidenceFiles) {
        const compressed = await compressImage(file);
        const typeTag = lampiranActionType; // e.g. CORRECTIVE or PREVENTIVE
        const uploader = userRole || 'Unknown';
        const cleanUploader = uploader.replace(/[^a-zA-Z0-9]/g, '-');
        const newFilename = `${typeTag}__${cleanUploader}__${new Date().getTime()}__${compressed.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const renamedFile = new File([compressed], newFilename, { type: compressed.type });
        const fd = new FormData();
        fd.append('file', renamedFile);
        const res = await fetch(`/api/reports/${report.id}/evidence`, { method: 'POST', body: fd });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Upload gagal');
        }
        const data = await res.json();
        const url = data.url as string;
        uploaded.push(url);
      }
      const newEvidence = [...currentEvidence, ...uploaded];
      const resPatch = await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidence_urls: newEvidence }) });
      if (!resPatch.ok) throw new Error("Gagal mengupdate evidence di laporan");
      const patchData = await resPatch.json();
      setEvidenceFiles([]);
      onRefresh?.(patchData.data || patchData);
    } catch (error) {
      console.error(error);
      alert('Gagal mengunggah bukti');
    } finally { setActionLoading(false); }
  };

  const handleSaveChanges = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (!res.ok) throw new Error("Failed to update");
      const patchData = await res.json();
      setIsEditing(false);
      onRefresh?.(patchData.data || patchData);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan perubahan");
    } finally { setActionLoading(false); }
  };


  // Empty State
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3 p-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FileText size={28} strokeWidth={1.5} />
        </div>
        <p className="text-sm">Pilih laporan untuk melihat detail</p>
      </div>
    );
  }

  // Derived values
  const severityKey = (report.severity || report.priority || "medium").toLowerCase();
  const severityBadge = SEVERITY_BADGES[severityKey] || SEVERITY_BADGES.medium;
  const normalizedStatus = normalizeStatus(report.status);
  const statusConfig = STATUS_CONFIG[normalizedStatus];
  
  // Aggregate all possible evidence sources
  const extractUrls = (val: any): string[] => {
    if (!val || typeof val !== 'string') return [];
    const m = val.match(/https?:\/\/[^\s"',<>]+/g);
    return m ? m.map(s => s.trim()) : [];
  };
  const textFieldUrls = [
    ...(extractUrls(report.description)),
    ...(extractUrls(report.action_taken)),
    ...(extractUrls(report.preventive_action)),
    ...(extractUrls(report.immediate_action)),
    ...(extractUrls(report.sub_category_note)),
    ...(extractUrls(report.root_caused)),
    ...(extractUrls(report.kps_remarks)),
    ...(extractUrls(report.remarks_gapura_kps)),
    ...(extractUrls(report.partner_response_notes)),
  ];
  const commentUrls = (report.comments || []).flatMap(c => [
    ...(Array.isArray(c.attachments) ? c.attachments.filter(Boolean) : []),
    ...extractUrls(c.content || '')
  ]);
  const allEvidence = Array.from(new Set([
    ...(Array.isArray(report.evidence_urls) ? report.evidence_urls : (report.evidence_urls ? [report.evidence_urls as string] : [])),
    ...(report.evidence_url ? [report.evidence_url] : []),
    ...(Array.isArray(report.video_urls) ? report.video_urls : (report.video_urls ? [report.video_urls as string] : [])),
    ...(report.video_url ? [report.video_url] : []),
    ...(report.partner_evidence_urls || []),
    ...textFieldUrls,
    ...commentUrls
  ])).filter(Boolean);
  const nextActions = getAllowedTransitions(report.status, userRole);
  const primaryAction = nextActions[0] || null;
  const canEdit = canEditReport(
    userRole as UserRole,
    currentUserId || '',
    report.user_id,
    currentUserStationId,
    report.station_id
  );
  const isClosed = normalizedStatus === "CLOSED";

  let actionLabel = "Update Status";
  if (primaryAction === "ON PROGRESS") {
    actionLabel = "Update Progress";
  }
  else if (primaryAction === "CLOSED") actionLabel = "Selesaikan Kasus";
  else if (primaryAction === "OPEN") actionLabel = "Buka Kembali";

  return (
    <div className="min-h-full flex flex-col bg-[var(--surface-1)] md:p-4 gap-4 overflow-x-hidden">
      {/* =============================================
          HEADER CARD
          ============================================= */}
      <header className="shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Progress Indicator */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--brand-primary)] via-emerald-400 to-teal-500" />
        
        <div className="px-4 md:px-5 pb-5 pt-10 md:pt-3">
          <div className="flex flex-col gap-4">
            {/* Row 1: Badges & ID */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {report.primary_tag === 'CGO' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">CGO</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">LANDSIDE & AIRSIDE</span>
                )}
                <span className="text-[11px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  #{report?.id?.slice(0, 8).toUpperCase() ?? 'N/A'}
                </span>
              </div>

              {/* Status Badges Group (Desktop keeps them right, Mobile stacks below if needed) */}
              <div className="hidden md:flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm",
                  severityBadge.classes
                )}>
                  {severityBadge.label}
                </span>
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm",
                  statusConfig?.bgClass || "bg-gray-100",
                  statusConfig?.textClass || "text-gray-600"
                )}>
                  {statusConfig?.label || report.status}
                </span>
              </div>
            </div>

            {/* Row 2: Title & Category */}
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight tracking-tight">
                {report.report || report.title || `${report.airlines || ""} ${report.flight_number || ""}`.trim() || "Laporan Tanpa Judul"}
              </h1>
              <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                <Tag size={14} className="text-slate-400" />
                <span>{report.category || "Irregularity"}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{formatDate(report.date_of_event || report.event_date || report.created_at)}</span>
              </div>
            </div>

            {/* Row 3: Mobile Status Badges & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 md:hidden border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm",
                  severityBadge.classes
                )}>
                  {severityBadge.label}
                </span>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-colors",
                  statusConfig?.bgClass || "bg-gray-100",
                  statusConfig?.textClass || "text-gray-600"
                )}>
                  {statusConfig?.label || report.status}
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {/* Evidence Link */}
                {report.evidence_urls && report.evidence_urls.length > 0 && (
                  <button onClick={() => setIsEvidenceModalOpen(true)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-colors">
                    <ImageIcon size={14} strokeWidth={2.5} />
                  </button>
                )}
                
                {/* PDF/Word */}
                {(userRole === "CABANG" || canExportBranchData(userRole as UserRole)) && (
                   <div className="flex items-center gap-1 mr-1 pr-1 border-r border-slate-100">
                    <button onClick={() => generatePDF(report)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center transition-colors">
                      <FileType size={14} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setIsDocxModalOpen(true)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-colors">
                      <FileText size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
                {/* Edit */}
                {canEdit && !isClosed && (
                  <button 
                    onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)} 
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm",
                      isEditing ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Row 4: Desktop Actions Only */}
            <div className="hidden md:flex items-center justify-end gap-2 border-t border-slate-50 pt-3 mt-1">
               {/* Evidence Link */}
               {report.evidence_urls && report.evidence_urls.length > 0 && (
                <button onClick={() => setIsEvidenceModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-bold hover:bg-emerald-100 transition-colors mr-2 border-r border-emerald-100 pr-4">
                  <ImageIcon size={14} strokeWidth={2.5} /> View Evidence
                </button>
               )}

               {(userRole === "CABANG" || canExportBranchData(userRole as UserRole)) && (
                <div className="flex items-center gap-2 mr-2 pr-2 border-r border-slate-100">
                  <button onClick={() => generatePDF(report)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[12px] font-bold hover:bg-red-100 transition-colors">
                    <FileType size={14} strokeWidth={2.5} /> PDF
                  </button>
                  <button onClick={() => setIsDocxModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-bold hover:bg-blue-100 transition-colors">
                    <FileText size={14} strokeWidth={2.5} /> DOCX
                  </button>
                </div>
              )}
              {canEdit && !isClosed && (
                <button 
                  onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all shadow-sm",
                    isEditing ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                >
                  {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                  {isEditing ? "Simpan Perubahan" : "Edit Laporan"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =============================================
          MAIN CONTENT CARD
          ============================================= */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* LEFT COLUMN — Report Detail (8 cols) */}
          <main 
            className="lg:col-span-8 overflow-y-auto scroll-smooth border-r border-gray-100" 
            ref={scrollRef}
          >
            <div className="p-6 space-y-5">

              {/* REPORTER */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {report.users?.full_name?.charAt(0) || report.reporter_name?.charAt(0) || <User size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {report.users?.full_name || report.reporter_name || "Anonymous"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {report.users?.email || "Pelapor"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                  {report.users?.role?.replace("_ADMIN", "").replace("_", " ") || "EMPLOYEE"}
                </span>
              </div>

              {/* RINGKASAN — Summary Grid */}
              <SectionCard title="Ringkasan">
                {isEditing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Flight Number</label>
                      <input value={editForm.flight_number} onChange={e => setEditForm(p => ({...p, flight_number: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Aircraft Reg</label>
                      <input value={editForm.aircraft_reg} onChange={e => setEditForm(p => ({...p, aircraft_reg: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Route</label>
                      <input value={editForm.route} onChange={e => setEditForm(p => ({...p, route: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Airline</label>
                      <input value={editForm.airline} onChange={e => setEditForm(p => ({...p, airline: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Area</label>
                      <input value={editForm.area} onChange={e => setEditForm(p => ({...p, area: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Target Divisi</label>
                      <input value={editForm.target_division} onChange={e => setEditForm(p => ({...p, target_division: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Station / Branch</label>
                      <input value={editForm.branch} onChange={e => setEditForm(p => ({...p, branch: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Lokasi Detail</label>
                       <input value={editForm.location} onChange={e => setEditForm(p => ({...p, location: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                       <label className="text-[11px] font-semibold uppercase text-gray-500 block mb-1">Tanggal</label>
                       <input type="text" value={editForm.date_of_event} onChange={e => setEditForm(p => ({...p, date_of_event: e.target.value}))} className="w-full text-[14px] bg-gray-50 border border-gray-200 rounded-lg p-2 focus:border-[var(--brand-primary)] outline-none transition-all" placeholder="YYYY-MM-DD HH:mm (opsional)" />
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-6 md:gap-y-5">
                    <DataField label="Flight" value={`${report.flight_number || ""}${report.aircraft_reg ? ` (${report.aircraft_reg})` : ""}`} icon={Plane} />
                    <DataField label="Route" value={report.route} icon={MapPin} />
                    <DataField label="Airline" value={report.airlines} icon={Building2} />
                    <DataField label="Area" value={AREA_LABELS[report.area || ""] || report.area} icon={Tag} />
                    <DataField label="Target Divisi" value={report.target_division} />
                    <DataField label="Station" value={`${report.stations?.code || report.branch || ""}${report.stations?.name ? ` - ${report.stations.name}` : ""}`} icon={Building2} />
                    <DataField label="Lokasi Detail" value={report.specific_location || report.location} icon={MapPin} span={2} />
                    <DataField label="Tanggal" value={formatDate(report.date_of_event || report.event_date || report.created_at)} icon={Calendar} />
                  </dl>
                )}
              </SectionCard>

              {/* DESKRIPSI MASALAH */}
              <SectionCard title="Deskripsi Masalah">
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full text-[15px] bg-gray-50 border border-gray-200 rounded-xl p-4 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 outline-none resize-none transition-all"
                    rows={5}
                    placeholder="Deskripsikan masalah secara detail..."
                  />
                ) : (
                  <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {report.description || <span className="text-gray-300 italic">Tidak ada deskripsi</span>}
                  </p>
                )}
              </SectionCard>

              {/* AKAR MASALAH & TINDAKAN */}
              {(isEditing || report.root_caused || report.action_taken || report.immediate_action || report.preventive_action || report.sub_category_note) && (
                <SectionCard title="Analisis & Tindakan">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider mb-1 block">Tindakan Pencegahan</label>
                        <textarea value={editForm.preventive_action} onChange={e => setEditForm(p => ({...p, preventive_action: e.target.value}))} className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-[14px] text-emerald-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all resize-none" rows={3} placeholder="Masukkan tindakan pencegahan..." />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-1 block">Akar Masalah</label>
                        <textarea value={editForm.root_caused} onChange={e => setEditForm(p => ({...p, root_caused: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px] text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none transition-all resize-none" rows={3} placeholder="Masukkan akar masalah..." />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-1 block">Tindakan Perbaikan</label>
                        <textarea value={editForm.action_taken} onChange={e => setEditForm(p => ({...p, action_taken: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px] text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none transition-all resize-none" rows={3} placeholder="Masukkan tindakan perbaikan..." />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-indigo-600 tracking-wider mb-1 block">Remarks Gapura KPS</label>
                        <textarea value={editForm.sub_category_note} onChange={e => setEditForm(p => ({...p, sub_category_note: e.target.value}))} className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 text-[14px] text-indigo-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all resize-none" rows={3} placeholder="Remarks dari verifikator..." />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {report.immediate_action && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Tindakan Pencegahan</p>
                          <p className="text-[15px] text-emerald-800 leading-relaxed whitespace-pre-wrap">{report.immediate_action}</p>
                        </div>
                      )}
                      {report.preventive_action && !report.immediate_action && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Preventive Action</p>
                          <p className="text-[15px] text-blue-800 leading-relaxed whitespace-pre-wrap">{report.preventive_action}</p>
                        </div>
                      )}
                      {report.root_caused && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Akar Masalah</p>
                          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{report.root_caused}</p>
                        </div>
                      )}
                      {report.action_taken && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Tindakan Perbaikan</p>
                          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{report.action_taken}</p>
                        </div>
                      )}
                      {report.sub_category_note && (
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">Remarks Gapura KPS</p>
                          <p className="text-[15px] text-indigo-800 leading-relaxed whitespace-pre-wrap">{report.sub_category_note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* LAMPIRAN — Evidence */}
              <SectionCard title={`Lampiran (${allEvidence.length})`}>
                {allEvidence.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allEvidence.map((url, i) => {
                      const isPartnerEvidence = report.partner_evidence_urls?.includes(url);
                      const isImage = /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(url) || 
                                     (url.includes('/storage/v1/object/public/evidence/') && !/\.(docx|doc|pdf|xlsx|xls|pptx|ppt)$/i.test(url));
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "group rounded-xl border overflow-hidden bg-white",
                            isPartnerEvidence ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200"
                          )}
                        >
                          {isImage ? (
                            <div className="relative aspect-video bg-gray-50 group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`evidence-${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" />
                              
                              {/* Metadata Overlay for Images */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                {(() => {
                                  const filename = decodeURIComponent(url.split('/').pop() || '');
                                  const metadataMatch = filename.match(/^([A-Z]+)__(.*?)__/);
                                  if (metadataMatch) {
                                    const actionType = metadataMatch[1] === 'CORRECTIVE' ? 'Corrective Action' : 
                                                      metadataMatch[1] === 'PREVENTIVE' ? 'Preventive Action' : 
                                                      metadataMatch[1].replace(/-/g, ' ');
                                    return (
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{actionType}</span>
                                        <span className="text-[9px] text-gray-200">Oleh: {metadataMatch[2]}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col p-3 gap-2">
                              <div className="flex items-center gap-3">
                                <FileText size={16} className={isPartnerEvidence ? "text-emerald-600 shrink-0" : "text-blue-500 shrink-0"} />
                                <span className="text-sm text-[var(--text-secondary)] truncate flex-1 font-medium">
                                  {decodeURIComponent(url.split('/').pop() || '').split('__').pop() || 'Document'}
                                </span>
                              </div>
                              
                              {(() => {
                                const filename = decodeURIComponent(url.split('/').pop() || '');
                                const metadataMatch = filename.match(/^([A-Z]+)__(.*?)__/);
                                if (metadataMatch) {
                                  const actionType = metadataMatch[1] === 'CORRECTIVE' ? 'Corrective Action' : 
                                                    metadataMatch[1] === 'PREVENTIVE' ? 'Preventive Action' : 
                                                    metadataMatch[1].replace(/-/g, ' ');
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold uppercase ring-1 ring-gray-200">
                                        {actionType}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-medium">
                                        {metadataMatch[2]}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <Link size={32} strokeWidth={1.5} />
                    <p className="text-sm mt-3">Tidak ada lampiran</p>
                  </div>
                )}
                {/* Upload new evidence */}
                {/* Upload new evidence */}
                {!isClosed && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Jenis Action</label>
                      <select 
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]/20 outline-none"
                        value={lampiranActionType || ""}
                        onChange={(e) => setLampiranActionType(e.target.value as any)}
                      >
                        <option value="" disabled>-- Pilih Corrective / Preventive Action --</option>
                        <option value="CORRECTIVE">Corrective Action</option>
                        <option value="PREVENTIVE">Preventive Action</option>
                      </select>
                    </div>

                    {lampiranActionType && (
                      <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Opsi Briefing</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <a
                              href="/templates/form-briefing.docx"
                              download
                              className="flex-1 text-center px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors"
                            >
                              Download Template
                            </a>
                            <button
                              onClick={() => setShowBriefingEditor(true)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <FileText size={14} /> Isi Form Briefing
                            </button>
                        </div>
                      </div>
                    )}
                    
                    {lampiranActionType && (
                      <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none"
                        />
                        <button
                          onClick={handleUploadEvidence}
                          disabled={evidenceFiles.length === 0 || actionLoading}
                          className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Upload Foto
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* AI Analysis Section */}
              <SectionCard title="AI Analysis" headerAction={
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">BETA</span>
              }>
                <AIAnalysisSection report={report} autoFetch={true} />
              </SectionCard>
            </div>
          </main>

          {/* RIGHT COLUMN — Tindak Lanjut (4 cols) */}
          <aside className="lg:col-span-4 border-l border-gray-200 bg-gray-50/50 flex flex-col overflow-hidden">
            {/* Aside Header */}
            <header className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare size={18} className="text-[var(--brand-primary)]" />
                Tindak Lanjut
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {report.comments?.length || 0} aktivitas tercatat
              </p>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Quick Action Card */}
              {onUpdateStatus && primaryAction && !isEditing && (
                <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl">
                  <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-3">Status Selanjutnya</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{actionLabel}</span>
                    <button
                      onClick={() => {
                        if (primaryAction === "CLOSED") setShowCloseModal(true);
                        else if (primaryAction === "OPEN") setShowReopenModal(true);
                        else if (primaryAction === "ON PROGRESS") setShowVerifyModal(true);
                        else handleUpdateStatus(primaryAction);
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-white text-gray-900 rounded-xl text-[13px] font-bold flex items-center gap-2 hover:bg-gray-100 active:scale-95 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {actionLabel}
                    </button>
                  </div>
                </div>
              )}

              {/* Triage / Dispatch Action (Analyst Only) */}
              {userRole === "ANALYST" && !isClosed && (
                <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-xl">
                    <p className="text-[10px] uppercase text-indigo-200 tracking-wider mb-3">Analyst Triage</p>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                                {report.target_division && report.target_division !== "-" ? `Dispatched to ${report.target_division}` : "Unassigned"}
                            </span>
                            {report.primary_tag && <span className="text-[10px] opacity-80">{report.primary_tag}</span>}
                        </div>
                        <button
                            onClick={() => setShowDispatchModal(true)}
                            className="px-4 py-2.5 bg-white text-indigo-700 rounded-xl text-[13px] font-bold flex items-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
                        >
                            <Plane size={16} />
                            {report.target_division && report.target_division !== "-" ? "Update Dispatch" : "Dispatch"}
                        </button>
                    </div>
                </div>
              )}

              {/* Comment Input */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm relative overflow-hidden">
                {refreshing && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gray-100 overflow-hidden z-10">
                    <div className="h-full bg-[var(--brand-primary)] animate-progress-indeterminate origin-left" />
                  </div>
                )}
                <CommentInput reportId={report.id} onSuccess={handleRefresh} placeholder="Tambahkan tindak lanjut..." />
              </div>

              {/* Activity Feed */}
              <div>
                <p className="text-[11px] uppercase text-[var(--text-muted)] tracking-wider font-semibold mb-4">Riwayat Aktivitas</p>
                {report.comments && report.comments.length > 0 ? (
                  <div className="space-y-3">
                    {report.comments.slice().reverse().map((comment, idx) => {
                      const isLast = idx === 0;
                      if (comment.is_system_message) {
                        return (
                          <div 
                            key={comment.id} 
                            ref={isLast ? lastCommentRef : null}
                            className="flex items-start gap-2.5 text-[12px] text-[var(--text-muted)] italic animate-in fade-in slide-in-from-bottom-2 duration-300"
                          >
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <span>{comment.content}</span>
                              <span className="ml-2 text-[11px] opacity-60">
                                {new Date(comment.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div 
                          key={comment.id} 
                          ref={isLast ? lastCommentRef : null}
                          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
                        >
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                              {comment.users?.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{comment.users?.full_name}</span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-2">
                                {formatDate(comment.created_at)} • {new Date(comment.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{comment.content}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--text-muted)] italic text-center py-8">Belum ada aktivitas</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>



      {/* =============================================
          MODALS
          ============================================= */}
      
      {/* Dispatch / Triage Modal (Analyst Only) */}
      {showDispatchModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Triage & Dispatch</h3>
              <button onClick={() => setShowDispatchModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[13px] font-bold uppercase text-[var(--text-secondary)] mb-2 block">Kategori Area (Primary Tag)</label>
                <div className="flex gap-3">
                  {['Landside & Airside', 'CGO'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setDispatchForm(prev => ({ ...prev, primary_tag: tag }))}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                        dispatchForm.primary_tag === tag 
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold uppercase text-[var(--text-secondary)] mb-2 block">Target Divisi</label>
                <div className="grid grid-cols-3 gap-2">
                  {['OS', 'OP', 'OT', 'UQ', 'HC', 'HT'].map((div) => (
                    <button
                      key={div}
                      onClick={() => setDispatchForm(prev => ({ ...prev, target_division: div }))}
                      className={cn(
                        "py-2 rounded-lg border text-sm font-bold transition-all",
                        dispatchForm.target_division === div
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {div}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold uppercase text-[var(--text-secondary)] mb-2 block">Remarks Gapura KPS</label>
                <textarea
                  value={dispatchForm.sub_category_note}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, sub_category_note: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none bg-gray-50"
                  rows={3}
                  placeholder="Tambahkan catatan, konteks, atau instruksi khusus Gapura KPS..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDispatchModal(false)} 
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button 
                onClick={handleDispatch}
                disabled={actionLoading || !dispatchForm.target_division} 
                className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plane size={18} />}
                Dispatch
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Update Progress</h3>
              <button onClick={() => setShowVerifyModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-[13px] mb-5 flex items-center gap-3 border border-blue-100">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>Laporan akan ditandai sebagai ON PROGRESS. Tambahkan catatan di bawah ini.</span>
            </div>
            <textarea
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none bg-gray-50 mb-5 resize-none"
              rows={4}
              placeholder="Tambahkan catatan (wajib)..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button
                onClick={() => handleUpdateStatus("ON PROGRESS", verifyNotes)}
                disabled={actionLoading || !verifyNotes.trim()}
                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Buka Kembali Laporan</h3>
              <button onClick={() => setShowReopenModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-[13px] mb-5 flex items-center gap-3 border border-amber-100">
              <AlertCircle size={18} className="shrink-0" />
              <span>Kasus akan dibuka kembali dan status berubah ke Menunggu Feedback. Semua catatan dan komentar sebelumnya tetap tersimpan.</span>
            </div>
            <textarea
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none bg-gray-50 mb-5 resize-none"
              rows={4}
              placeholder="Jelaskan alasan pembukaan kembali..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReopenModal(false)}
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button
                onClick={() => handleUpdateStatus("OPEN", reopenNotes)}
                disabled={actionLoading}
                className="flex-1 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all text-[15px] flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={16} />}
                Buka Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Selesaikan Laporan</h3>
              <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            
            {/* Link bukti penyelesaian dihilangkan dari alur update status */}

            <textarea 
              value={closeNotes} 
              onChange={(e) => setCloseNotes(e.target.value)} 
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] outline-none bg-gray-50 mb-5 resize-none" 
              rows={3} 
              placeholder="Catatan penyelesaian (opsional)..." 
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCloseModal(false)} 
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button 
                onClick={() => handleUpdateStatus("CLOSED", closeNotes)}
                disabled={actionLoading} 
                className="flex-1 py-3.5 text-white font-bold rounded-xl text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{ background: divisionColor }}
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docx Editor Modal */}
      <DocxEditorModal
        isOpen={isDocxModalOpen}
        onClose={() => setIsDocxModalOpen(false)}
        reportData={report}
        onSuccess={(updatedReport) => {
          onRefresh?.(updatedReport);
        }}
      />

      {/* Evidence View Modal */}
      <EvidenceViewModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        evidenceUrls={(report.evidence_urls || []).filter(url => 
          /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(url) || 
          (url.includes('/storage/v1/object/public/evidence/') && !/\.(docx|doc|pdf|xlsx|xls|pptx|ppt)$/i.test(url))
        )}
      />

      {/* Briefing Editor Modal */}
      {showBriefingEditor && report && lampiranActionType && (
        <BriefingEditorModal
          isOpen={showBriefingEditor}
          onClose={() => setShowBriefingEditor(false)}
          reportData={report}
          uploadType={lampiranActionType}
          divisionName={userRole}
          onSuccess={(updatedReport) => {
             // Keep modal open to show success state and download button
             onRefresh?.(updatedReport);
          }}
        />
      )}
    </div>
  );
}
