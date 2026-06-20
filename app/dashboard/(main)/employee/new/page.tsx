/**
 * @file
 *
 * File ini berisi halaman pembuatan laporan baru dengan wizard 5 langkah
 * Mendukung mode offline dengan antrean pelaporan
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle, CheckCircle, ChevronRight, ChevronLeft,
    Loader2, Calendar,
    FileText, Plus, X,
    Trash2, PlusCircle, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';
import { queueOfflineReport } from '@/lib/pwa/offline-queue';
import { useAuth } from '@/lib/hooks/use-auth';
import { SignaturePad } from '@/components/public-report/SignaturePad';
import type { SignaturePadHandle } from '@/components/public-report/SignaturePad';
import {
    EDITED_IRREGULARITY_DOCX_MARKER,
    generatePDF,
    generateWord,
    persistEditedWordDocument,
} from '@/lib/utils/document-generator';

import { PRIORITY_CONFIG, type ReportPriority } from '@/lib/constants/report-status';
import { AIRLINES } from '@/lib/constants/airlines';
import { AREA_CATEGORIES as AREA_CATEGORIES_SHARED, AREA_LABELS, GSE_TYPES, GSE_EQUIPMENT, type GseType } from '@/lib/constants/incident-areas';

/** Opsi kategori laporan */
const REPORT_CATEGORIES = [
    { id: 'Irregularity', label: 'Irregularity' },
    { id: 'Complaint', label: 'Complaint' },
    { id: 'Compliment', label: 'Compliment' },
];

/** Opsi area operasional */
const AREA_OPTIONS = [
    { id: 'TERMINAL', label: AREA_LABELS.TERMINAL },
    { id: 'APRON', label: AREA_LABELS.APRON },
    { id: 'CARGO', label: AREA_LABELS.CARGO },
    { id: 'GENERAL', label: AREA_LABELS.GENERAL },
    { id: 'GSE', label: AREA_LABELS.GSE },
];

const INTERNAL_SEVERITY_OPTIONS: ReportPriority[] = ['urgent', 'medium', 'low'];

const AREA_CATEGORIES = AREA_CATEGORIES_SHARED as Record<string, string[]>;

// Airlines considered local (Indonesian carriers)
const LOKAL_AIRLINE_CODES = ['GA', 'QG', 'JT', 'ID', 'IW', 'IU', 'QZ', 'SJ', 'IN', 'IP', '8B', 'SI', 'IL'];

/**
 * Mendapatkan tipe airline (Lokal/MPA)
 * @param airlineName - Nama airline
 * @returns Tipe airline ('Lokal' atau 'MPA')
 */
function getAirlineType(airlineName: string): 'Lokal' | 'MPA' {
    const airline = AIRLINES.find(a => a.name === airlineName);
    if (!airline) return 'MPA';
    return LOKAL_AIRLINE_CODES.includes(airline.code) ? 'Lokal' : 'MPA';
}

/**
 * Mendapatkan hub untuk station tertentu
 * @param stationCode - Kode station
 * @returns Kode hub
 */
function getHubForStation(stationCode: string): string {
    if (['CGK', 'SUB', 'DPS'].includes(stationCode)) return stationCode;
    if (['UPG', 'MDC', 'BPN'].includes(stationCode)) return 'UPG';
    if (['KNO', 'PDG', 'PKU', 'BTH', 'PLM'].includes(stationCode)) return 'KNO';
    return 'CGK';
}

/**
 * Mendapatkan minggu dalam bulan
 * @param date - Tanggal
 * @returns Nomor minggu (1-5)
 */
function getWeekInMonth(date: Date): number {
    const day = date.getDate();
    return Math.ceil(day / 7);
}

/** Type untuk data form laporan */
type FormData = {
    // Step 1: Detail Report
    incident_date: string;
    airline: string;
    airline_other: string;
    flight_number: string;
    station_id: string; // Branch
    route: string;
    main_category: string; // Irregularity/Complaint/Compliment

    // GSE Availability (when area === 'GSE')
    gse_type: GseType | '';
    gse_equipment: string;

    // Delay Info
    delay_code: string;
    delay_duration: string;

    // Step 2: Area
    area: string;

    // Step 3: Area Category
    area_category: string; // Maps to incident_type_id and specific area columns

    // Step 4: Report Details
    description: string; // "Report"
    root_cause: string;
    action_taken: string;
    preventive_action: string;
    severity: ReportPriority; // Replacing SLA

    // Step 5: Evidence
    reporter_name: string;
    evidence_urls: string[];
};

/** Tipe data untuk pengeditan dokumen */
type DocEdits = {
  reference_no: string;
  to: string;
  from: string;
  cc: string;
  subject: string;
  attachment: string;
  incident_date: string;
  branch: string;
  flight_number: string;
  aircraft_reg: string;
  route: string;
  std_atd: string;
  pax: string;
  bge: string;
  gate_stand: string;
  delay: string;
  officers: { name: string; company: string; function: string }[];
  chronology: { time: string; description: string }[];
  root_cause: string;
  action_taken: string;
  preventive_action: string;
  reporter_name: string;
  reporter_title: string;
};

type TextDocEditKey = {
  [K in keyof DocEdits]: DocEdits[K] extends string ? K : never
}[keyof DocEdits];

type CreatedReport = {
  id: string;
  evidence_urls?: string[];
  [key: string]: unknown;
};

type ReportCreateResponse = {
  data?: { id?: string };
  error?: string;
};

/**
 * Komponen wizard pembuatan laporan baru
 * Menggunakan 5 langkah untuk mengumpulkan data laporan
 * Mendukung mode offline dengan antrean pelaporan
 * @returns JSX element wizard pembuatan laporan
 */
export default function NewReportWizard() {
    const router = useRouter();
    const { user } = useAuth(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isOnline, setIsOnline] = useState(true);
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
    const [evidenceSubmissionId] = useState(() => crypto.randomUUID());
    const [evidenceFileIds, setEvidenceFileIds] = useState<string[]>([]);
    const [submissionMode, setSubmissionMode] = useState<'submitted' | 'queued'>('submitted');
    const [docxSaving, setDocxSaving] = useState(false);
    const signatureRef = useRef<SignaturePadHandle | null>(null);
    const createdReportRef = useRef<CreatedReport | null>(null);
    const reportFinalizedRef = useRef(false);
    const cleanupStartedRef = useRef(false);

    /** State for live document editing at step 6 */
    const [docEdits, setDocEdits] = useState<DocEdits>({
      reference_no: '',
      to: '',
      from: '',
      cc: '',
      subject: '',
      attachment: '',
      incident_date: '',
      branch: '',
      flight_number: '',
      aircraft_reg: '',
      route: '',
      std_atd: '',
      pax: '',
      bge: '',
      gate_stand: '',
      delay: '',
      officers: [],
      chronology: [],
      root_cause: '',
      action_taken: '',
      preventive_action: '',
      reporter_name: '',
      reporter_title: 'Controller Operation Airside'
    });

    const [formData, setFormData] = useState<FormData>({
        incident_date: new Date().toISOString().split('T')[0],
        airline: '',
        airline_other: '',
        flight_number: '',
        station_id: '',
        route: '',
        main_category: 'Irregularity', // Default
        gse_type: '',
        gse_equipment: '',

        delay_code: '',
        delay_duration: '',

        area: '',
        area_category: '',

        description: '',
        root_cause: '',
        action_taken: '',
        preventive_action: '',
        severity: 'medium',

        reporter_name: '',
        evidence_urls: [],
    });

    useEffect(() => {
        createdReportRef.current = createdReport;
    }, [createdReport]);

    const cleanupUnfinishedReport = useCallback(async () => {
        const report = createdReportRef.current;
        if (!report?.id || reportFinalizedRef.current || cleanupStartedRef.current) return;
        if (String(report.id).startsWith('QUEUE-')) return;

        const reportId = String(report.original_id || report.sheet_id || report.id);
        cleanupStartedRef.current = true;
        try {
            await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
                method: 'DELETE',
                keepalive: true,
            });
        } catch (cleanupError) {
            console.warn('[CREATE_REPORT] Failed to cleanup unfinished report:', cleanupError);
        }
    }, []);

    // Fetch stations on mount; user comes from AuthContext
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchStations = async () => {
            try {
                const stationsRes = await fetch('/api/master-data?type=stations', { signal });

                let stationsData: unknown = [];
                try {
                    stationsData = await stationsRes.json();
                } catch {
                    stationsData = [];
                }
                if (Array.isArray(stationsData)) {
                    setStations(stationsData);
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('Failed to fetch stations:', err);
            }
        };
        fetchStations();

        return () => controller.abort();
    }, []);

    // Sync selected station from auth context user
    useEffect(() => {
        if (user?.station?.id) {
            setSelectedStationId(user.station.id);
        }
    }, [user]);

    // Monitor online status
    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Hide mobile bottom navigation on this page
    useEffect(() => {
        const hideMobileNav = () => {
            const mobileNav = document.querySelector('[data-hide-mobile-nav]');
            if (mobileNav) {
                (mobileNav as HTMLElement).style.display = 'none';
            }
        };

        hideMobileNav();

        // Show mobile nav when leaving the page
        return () => {
            const mobileNav = document.querySelector('[data-hide-mobile-nav]');
            if (mobileNav) {
                (mobileNav as HTMLElement).style.display = '';
            }
        };
    }, []);

    useEffect(() => {
        const handlePageHide = () => {
            void cleanupUnfinishedReport();
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            void cleanupUnfinishedReport();
        };
    }, [cleanupUnfinishedReport]);

    /**
     * Mengompres gambar untuk pengunggahan
     * @param file - File gambar yang akan dikompres
     * @param opts - Opsi kompresi (maxWidth, maxHeight, quality, mimeType)
     * @returns Promise<File> file yang sudah dikompres
     */
    const compressImage = (file: File, opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}) => {
        const { maxWidth = 1600, maxHeight = 1600, quality = 0.8, mimeType = 'image/webp' } = opts;
        return new Promise<File>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          let revoked = false;
          const cleanup = () => {
            if (!revoked) { URL.revokeObjectURL(url); revoked = true; }
          };
          img.onload = () => {
            cleanup();
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
              const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type });
              resolve(compressed);
            }, mimeType, quality);
          };
          img.onerror = () => { cleanup(); reject(new Error('Image load error')); };
          img.src = url;
        });
    };

    /**
     * Menangani file yang dipilih dan mengunggahnya
     */
    const handleFilesSelected = async () => {
        if (!selectedFiles.length) return;
        if (!navigator.onLine) {
            setError('You are offline. Photos will be added to the queue when the report is sent.');
            return;
        }
        try {
            const { uploadedUrls } = await uploadEvidenceFiles(selectedFiles);
            setFormData(prev => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...uploadedUrls] }));
            setSelectedFiles([]);
            setError('');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload evidence';
            setError(message);
        }
    };

    /**
     * Mengunggah file bukti ke server
     * @param files - Array file yang akan diunggah
     * @returns Promise<string[]> array URL file yang sudah diunggah
     */
    const uploadEvidenceFiles = async (files: File[]) => {
        const uploadedUrls: string[] = [];
        const uploadedFileIds: string[] = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressed);
            fd.append('evidence_submission_id', evidenceSubmissionId);
            fd.append('reporter_name', formData.reporter_name.trim());
            fd.append('station_id', selectedStationId);
            const res = await fetch('/api/uploads/evidence', { method: 'POST', body: fd });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to upload evidence');
            }
            const data = await res.json();
            uploadedUrls.push(data.url);
            if (data.evidence_file_id || data.evidenceFileId) {
                uploadedFileIds.push(data.evidence_file_id || data.evidenceFileId);
            }
        }
        if (uploadedFileIds.length > 0) {
            setEvidenceFileIds(prev => [...new Set([...prev, ...uploadedFileIds])]);
        }
        return { uploadedUrls, uploadedFileIds };
    };

    /**
     * Menghapus URL bukti pada index tertentu
     * @param index - Index URL yang akan dihapus
     */
    const removeEvidenceAt = (index: number) => {
        setFormData(prev => ({ ...prev, evidence_urls: prev.evidence_urls.filter((_, i) => i !== index) }));
        setEvidenceFileIds(prev => prev.filter((_, i) => i !== index));
    };

    const handleBack = async () => {
        if (step === 6) {
            // Step 6: just go back to step 5 — report is already saved, do NOT delete it
            setStep(5);
            return;
        }

        if (step > 1) {
            setStep(prev => Math.max(prev - 1, 1));
            return;
        }

        await cleanupUnfinishedReport();
        router.push('/dashboard/employee');
    };

    /** Pindah ke langkah berikutnya */
    const nextStep = () => setStep(prev => Math.min(prev + 1, 6));

    /** Handle PDF Export */
    const handleExportPDF = async () => {
      if (!signatureRef.current) return;
      const signature = signatureRef.current.getSignature();
      await generatePDF(docEdits, signature);
    };

    const saveEditedWord = async ({ download }: { download: boolean }) => {
      if (!signatureRef.current) return false;
      if (!createdReport?.id) {
        setError('Report has no ID yet, document cannot be saved permanently.');
        return false;
      }

      const signature = signatureRef.current.getSignature();
      setDocxSaving(true);
      setError('');

      try {
        // 1. Sync edited fields from docEdits back to the report in the backend
        // so that downloads from the dashboard use the same data.
        const descriptionFromChronology = docEdits.chronology.length > 0
          ? docEdits.chronology.map(c => c.description).filter(Boolean).join('\n')
          : undefined;

        const syncPayload: Record<string, unknown> = {};
        if (docEdits.root_cause)         syncPayload.root_cause       = docEdits.root_cause;
        if (docEdits.action_taken)       syncPayload.action_taken     = docEdits.action_taken;
        if (docEdits.preventive_action)  syncPayload.preventive_action= docEdits.preventive_action;
        if (docEdits.reporter_name)      syncPayload.reporter_name    = docEdits.reporter_name;
        if (descriptionFromChronology)   syncPayload.description      = descriptionFromChronology;
        if (docEdits.branch)             syncPayload.branch           = docEdits.branch;
        if (docEdits.flight_number)      syncPayload.flight_number    = docEdits.flight_number;
        if (docEdits.route)              syncPayload.route            = docEdits.route;
        if (docEdits.incident_date)      syncPayload.date_of_event    = docEdits.incident_date;

        if (Object.keys(syncPayload).length > 0) {
          try {
            const patchId = String(createdReport.original_id || createdReport.id);
            await fetch(`/api/reports/${encodeURIComponent(patchId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(syncPayload),
            });
          } catch (patchErr) {
            console.warn('[CREATE_REPORT] Non-blocking: failed to sync docEdits to report:', patchErr);
          }
        }

        // 2. Generate the DOCX blob from current docEdits and persist it
        const patchId = String(createdReport.original_id || createdReport.id);
        const safeReportId = patchId.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const filename = `${EDITED_IRREGULARITY_DOCX_MARKER}__${safeReportId}.docx`;
        const blob = await generateWord(docEdits, signature, { filename, download });
        const url = await persistEditedWordDocument(patchId, blob, filename);

        setCreatedReport(prev => prev ? ({
          ...prev,
          evidence_urls: [...new Set([...(prev.evidence_urls || []), url])],
        }) : prev);
        setFormData(prev => ({
          ...prev,
          evidence_urls: [...new Set([...prev.evidence_urls, url])],
        }));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save Word document permanently.';
        setError(message);
        return false;
      } finally {
        setDocxSaving(false);
      }
    };


    /** Handle Word Export */
    const handleExportWord = async () => {
      await saveEditedWord({ download: true });
    };

    const handleFinish = async () => {
      const saved = await saveEditedWord({ download: false });
      if (saved) {
        reportFinalizedRef.current = true;
        router.push('/dashboard/employee');
      }
    };

    /**
     * Validasi data form pada langkah saat ini
     * @returns Boolean valid atau tidak
     */
    const isStepValid = (): boolean => {
        switch (step) {
            case 1:
                return !!(formData.incident_date && formData.airline && formData.flight_number && selectedStationId && formData.route && formData.main_category);
            case 2:
                return !!formData.area;
            case 3:
                return !!formData.area_category;
            case 4:
                return !!(formData.description && formData.root_cause && formData.action_taken);
            case 5:
                return !!(formData.reporter_name && (formData.evidence_urls.length > 0 || selectedFiles.length > 0));
            default:
                return false;
        }
    };

    /**
     * Menangani submit form laporan
     * @param e - Event form submit
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Derive auto-populated fields
            const selectedStation = stations.find(s => s.id === selectedStationId);
            const stationCode = selectedStation?.code || '';
            const eventDate = new Date(formData.incident_date);
            let evidenceUrls = [...formData.evidence_urls];
            let currentEvidenceFileIds = [...evidenceFileIds];

            if (navigator.onLine && selectedFiles.length > 0) {
                const { uploadedUrls, uploadedFileIds } = await uploadEvidenceFiles(selectedFiles);
                evidenceUrls = [...evidenceUrls, ...uploadedUrls];
                currentEvidenceFileIds = [...new Set([...currentEvidenceFileIds, ...uploadedFileIds])];
                setFormData(prev => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...uploadedUrls] }));
                setSelectedFiles([]);
            }

            const payload = {
                ...formData,
                evidence_urls: evidenceUrls,
                evidence_url: evidenceUrls[0],
                evidence_file_ids: currentEvidenceFileIds,
                evidence_submission_id: evidenceSubmissionId,
                airline: formData.airline === 'Other / Lainnya'
                    ? (formData.airline_other.trim() || 'Other')
                    : formData.airline,
                title: `${formData.airline === 'Other / Lainnya' ? (formData.airline_other.trim() || 'Other') : formData.airline} ${formData.flight_number} - ${formData.main_category}`,
                station_id: selectedStationId,
                category: formData.main_category,
                // New CSV-aligned fields
                station_code: stationCode,
                hub: getHubForStation(stationCode),
                jenis_maskapai: getAirlineType(formData.airline),
                // GSE Availability fields (mapped to sheet columns)
                gse_available_requirement: formData.area === 'GSE' ? formData.gse_type : undefined,
                gse_motorized: formData.gse_type === 'GSE MOTORIZED' ? formData.gse_equipment : undefined,
                gse_non_motorized: formData.gse_type === 'GSE NON - MOTORIZED' ? formData.gse_equipment : undefined,
                category_case_gse: formData.area === 'GSE' ? formData.area_category : undefined,
                report: formData.description,
                reporting_branch: stationCode,
                week_in_month: getWeekInMonth(eventDate),
                reporter_email: undefined,
                form_submitted_at: new Date().toISOString(),
                form_completed_at: new Date().toISOString(),

                // Explicitly pass area info for sheet routing
                area: formData.area,
                incident_type_id: formData.area_category, // Main category column

                // Delay fields
                delay_code: formData.delay_code,
                delay_duration: formData.delay_duration,

                // Pass area_category to be mapped to specific columns in backend
                terminal_area_category: formData.area === 'TERMINAL' ? formData.area_category : undefined,
                apron_area_category: formData.area === 'APRON' ? formData.area_category : undefined,
                general_category: (formData.area === 'GENERAL' || formData.area === 'CARGO') ? formData.area_category : undefined,

                // Metadata fields
                root_cause: formData.root_cause,
                action_taken: formData.action_taken,
                preventive_action: formData.preventive_action,
                reporter_name: formData.reporter_name,
            };

            if (!navigator.onLine) {
                const queuedItem = await queueOfflineReport({
                    kind: 'internal-report',
                    endpoint: '/api/reports',
                    uploadEndpoint: '/api/uploads/evidence',
                    reportPayload: payload,
                    attachments: selectedFiles,
                });

                setSubmissionMode('queued');
                setCreatedReport({
                    ...payload,
                    id: `QUEUE-${queuedItem.id.slice(0, 8).toUpperCase()}`,
                    offline_queue_id: queuedItem.id,
                });
                setSuccess(true);
                return;
            }

            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const contentType = res.headers.get('content-type') || '';
            let data: ReportCreateResponse | null = null;
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                    throw new Error(text || 'Failed to send report');
            }
            if (!res.ok) {
                const message = data?.error || (typeof data === 'string' ? data : '') || `Failed to send report (HTTP ${res.status})`;
                throw new Error(message);
            }

            // Set created report data including ID generated by backend
            setSubmissionMode('submitted');
            reportFinalizedRef.current = false;
            cleanupStartedRef.current = false;
            setCreatedReport({
                ...formData,
                ...data.data, // Merge with response data (contains ID, etc.)
                id: data.data?.id || 'DRAFT'
            });

            const month = new Date(formData.incident_date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
            const year = new Date(formData.incident_date).getFullYear();

            setDocEdits({
              reference_no: `CABANG ${stationCode}/LK/       /       / ${month}/${year}`,
              to: `SQC ${formData.airline} on duty`,
              from: 'GAPURA OPERATION STAFF',
              cc: '',
              subject: `${formData.airline} ${formData.flight_number} - ${formData.main_category}`,
              attachment: selectedFiles.length > 0 ? `${selectedFiles.length} Files` : '',
              incident_date: formData.incident_date,
              branch: stationCode,
              flight_number: formData.flight_number,
              aircraft_reg: '-',
              route: formData.route,
              std_atd: '',
              pax: '',
              bge: '',
              gate_stand: '-',
              delay: `${formData.delay_code || '-'} / ${formData.delay_duration || '-'}`,
              officers: [
                { name: formData.reporter_name, company: 'Gapura Angkasa', function: 'Reporter' }
              ],
              chronology: [
                { time: '', description: formData.description }
              ],
              root_cause: formData.root_cause,
              action_taken: formData.action_taken,
              preventive_action: formData.preventive_action,
              reporter_name: formData.reporter_name,
              reporter_title: 'Controller Operation Airside'
            });

            setStep(6);
            // Success flag is only for the very final finish if needed,
            // but here Step 6 is the final interactive state.
            // However, to keep consistent with existing logic:
            setSuccess(true);
            // Router push is now handled by modal onFinished
        } catch (err) {
            const message = err instanceof Error ? (
                /unauthorized/i.test(err.message) || /401/.test(err.message)
                    ? 'Login session expired. Please log in again and try again.'
                    : err.message
            ) : 'An error occurred';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success && submissionMode === 'queued') {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-center animate-scale-in p-12 card-glass max-w-lg mx-auto">
                    <div className="w-28 h-28 bg-emerald-100/50 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-emerald-50/50 animate-bounce">
                        <CheckCircle className="w-16 h-16 text-emerald-600" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Report Added to Offline Queue
                    </h2>
                    <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                        Report will be sent automatically once connection is restored. You can close this page.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/employee')}
                        className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-8 pt-8">
            {/* Header */}
            <div className="text-center space-y-2 animate-fade-in-up px-4 relative">
                {/* Exit/Back Button */}
                <button 
                    onClick={() => router.push('/dashboard/employee')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600 md:flex items-center gap-1"
                    title="Back to Dashboard"
                >
                    <ChevronLeft size={24} />
                    <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Back</span>
                </button>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Irregularity Report</h1>
                <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                    Step {step} of 6
                </p>
            </div>

            {/* Progress Bar */}
            <div className="px-4">
                <div className="flex items-center gap-2 max-w-md mx-auto">
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                        <div key={s} className="flex-1 flex items-center">
                            <div
                                className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between max-w-md mx-auto mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>Detail</span>
                    <span>Area</span>
                    <span>Category</span>
                    <span>Content</span>
                    <span>Evidence</span>
                    <span>Final</span>
                </div>
            </div>

            {error && (
                <div className="mx-auto max-w-2xl p-4 rounded-xl flex items-center gap-3 animate-fade-in-up" style={{ background: 'oklch(0.60 0.22 25 / 0.1)', color: 'oklch(0.55 0.18 25)' }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="min-h-[400px]">
                {/* Step 1: Detail Report */}
                <WizardStep isActive={step === 1}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Detail Report</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Complete the basic flight information</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Date of Event */}
                            <div className="space-y-2">
                                <label className="label flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    1. Date of Event <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    max={new Date().toLocaleDateString('en-CA')}
                                    className="input-field"
                                    value={formData.incident_date}
                                    onChange={e => setFormData({ ...formData, incident_date: e.target.value })}
                                />
                            </div>

                            {/* Airlines */}
                            <div className="space-y-2">
                                <label className="label">2. Airlines <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="input-field"
                                    value={formData.airline}
                                    onChange={e => setFormData({ ...formData, airline: e.target.value })}
                                >
                                    <option value="">Select Airline...</option>
                                    {AIRLINES.map((airline) => (
                                        <option key={airline.code} value={airline.name}>
                                            {airline.name} ({airline.code})
                                        </option>
                                    ))}
                                </select>
                                {formData.airline === 'Other / Lainnya' && (
                                    <input
                                        type="text"
                                        required
                                        placeholder="Tulis nama maskapai"
                                        className="input-field mt-2"
                                        value={formData.airline_other}
                                        onChange={e => setFormData({ ...formData, airline_other: e.target.value })}
                                    />
                                )}
                            </div>

                            {/* Flight Number */}
                            <div className="space-y-2">
                                <label className="label">3. Flight Number <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Flight number"
                                    value={formData.flight_number}
                                    onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                                />
                            </div>

                            {/* Branch */}
                            <div className="space-y-2">
                                <label className="label">4. Branch (e.g. CGK, UPG, DPS) <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="input-field"
                                    value={selectedStationId}
                                    onChange={e => setSelectedStationId(e.target.value)}
                                >
                                    <option value="">Select Branch...</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Route */}
                            <div className="space-y-2">
                                <label className="label">5. Route <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Route"
                                    value={formData.route}
                                    onChange={e => setFormData({ ...formData, route: e.target.value })}
                                />
                            </div>

                            {/* Delay Info (Optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="label">Delay Code (Optional)</label>
                                    <input
                                        type="text"
                                        className="input-field uppercase"
                                        placeholder="e.g. 93"
                                        value={formData.delay_code}
                                        onChange={e => setFormData({ ...formData, delay_code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="label">Delay Duration (Optional)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. 15 mins"
                                        value={formData.delay_duration}
                                        onChange={e => setFormData({ ...formData, delay_duration: e.target.value })}
                                    />
                                </div>
                            </div>

                                 <div className="space-y-2">
                                    <label className="label">6. Report Category <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {REPORT_CATEGORIES.map((cat) => {
                                            const isSelected = formData.main_category === cat.id;
                                            let activeStyle = "bg-slate-800 border-slate-800 text-white";
                                            if (cat.id === 'Irregularity') activeStyle = "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-200";
                                            if (cat.id === 'Complaint') activeStyle = "bg-rose-700 border-rose-700 text-white shadow-lg shadow-rose-200";
                                            if (cat.id === 'Compliment') activeStyle = "bg-emerald-700 border-emerald-700 text-white shadow-lg shadow-emerald-200";

                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, main_category: cat.id })}
                                                    className={cn(
                                                        "flex items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-300 font-bold uppercase tracking-widest text-[11px]",
                                                        isSelected ? activeStyle : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                                                        isSelected ? "border-white" : "border-slate-300"
                                                    )}>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                    <span>{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 2: Area */}
                <WizardStep isActive={step === 2}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Section</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Choose area of incident</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            <div className="space-y-4">
                                <label className="label">7. Area <span className="text-red-500">*</span></label>
                                <div className="flex flex-col gap-3">
                                    {AREA_OPTIONS.map((area) => (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, area: area.id, area_category: '' })}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.area === area.id ? 'border-emerald-500' : 'border-gray-400'}`}>
                                                {formData.area === area.id && (
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span>{area.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 3: Area Category */}
                <WizardStep isActive={step === 3}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">{AREA_OPTIONS.find(a => a.id === formData.area)?.label}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Specify category for {AREA_OPTIONS.find(a => a.id === formData.area)?.label}</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            <div className="space-y-4">
                                <label className="label">8. {AREA_OPTIONS.find(a => a.id === formData.area)?.label} Category <span className="text-red-500">*</span></label>
                                <div className="flex flex-col gap-3">
                                    {AREA_CATEGORIES[formData.area]?.map((cat, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, area_category: cat })}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.area_category === cat ? 'border-emerald-500' : 'border-gray-400'}`}>
                                                {formData.area_category === cat && (
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span>{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 4: Report Details */}
                <WizardStep isActive={step === 4}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Irregularity / Complaint</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Fill in details</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Report / Description */}
                            <div className="space-y-2">
                                <label className="label">9. Report <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Root Cause */}
                            <div className="space-y-2">
                                <label className="label">10. Root Cause <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.root_cause}
                                    onChange={e => setFormData({ ...formData, root_cause: e.target.value })}
                                />
                            </div>

                            {/* Action Taken */}
                            <div className="space-y-2">
                                <label className="label">11. Action Taken <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.action_taken}
                                    onChange={e => setFormData({ ...formData, action_taken: e.target.value })}
                                />
                            </div>

                            {/* Preventive Action */}
                            <div className="space-y-2">
                                <label className="label">12. Preventive Action (Optional)</label>
                                <textarea
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.preventive_action}
                                    onChange={e => setFormData({ ...formData, preventive_action: e.target.value })}
                                />
                            </div>

                            {formData.area === 'GSE' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                                    <div className="space-y-2">
                                        <label className="label">GSE Available &amp; Requirement <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            className="input-field"
                                            value={formData.gse_type}
                                            onChange={e => setFormData({ ...formData, gse_type: e.target.value as GseType | '', gse_equipment: '' })}
                                        >
                                            <option value="">Select GSE Type...</option>
                                            {GSE_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label">GSE Equipment <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            disabled={!formData.gse_type}
                                            className="input-field"
                                            value={formData.gse_equipment}
                                            onChange={e => setFormData({ ...formData, gse_equipment: e.target.value })}
                                        >
                                            <option value="">Select Equipment...</option>
                                            {(formData.gse_type ? GSE_EQUIPMENT[formData.gse_type] : []).map((eq) => (
                                                <option key={eq} value={eq}>{eq}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                             {/* Severity */}
                             <div className="space-y-2">
                                <label className="label flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Severity
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {INTERNAL_SEVERITY_OPTIONS.map((key) => {
                                        const config = PRIORITY_CONFIG[key];
                                        const isSelected = formData.severity === key;
                                        const label = key === 'urgent' ? 'TOP RISK' : key.toUpperCase();
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, severity: key })}
                                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                    isSelected ? 'border-current' : 'border-transparent'
                                                }`}
                                                style={{
                                                    background: isSelected ? config.bgColor : 'var(--surface-3)',
                                                    color: isSelected ? config.color : 'var(--text-primary)',
                                                    borderColor: isSelected ? config.color : 'transparent',
                                                }}
                                            >
                                                <span className="font-bold text-sm block">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 5: Evidence */}
                <WizardStep isActive={step === 5}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Evidence</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Upload evidence photos. If offline, files will be queued and sent automatically when connection returns.
                            </p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Report By */}
                            <div className="space-y-2">
                                <label className="label">12. Report By <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Enter your answer"
                                    value={formData.reporter_name}
                                    onChange={e => setFormData({ ...formData, reporter_name: e.target.value })}
                                />
                            </div>

                            {/* Evidence Upload */}
                            <div className="space-y-4">
                                <label className="label">13. Evidence Photos (min 1) <span className="text-red-500">*</span></label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="input-field"
                                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                                />
                                <div className="flex">
                                    <button
                                        type="button"
                                        onClick={handleFilesSelected}
                                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                                        disabled={selectedFiles.length === 0}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {isOnline ? 'Upload Photo' : 'Prepare for Offline Queue'}
                                    </button>
                                </div>
                                {selectedFiles.length > 0 && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                        {selectedFiles.length} file(s) selected and ready for submission.
                                    </div>
                                )}
                                {/* Previews */}
                                {formData.evidence_urls.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {formData.evidence_urls.map((url, idx) => (
                                            <div key={idx} className="relative rounded-xl overflow-hidden border bg-white">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={url}
                                                    alt={`evidence-${idx}`}
                                                    className="w-full h-32 object-cover"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeEvidenceAt(idx)}
                                                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 rounded-full p-1 shadow"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </WizardStep>

                {/* Step 6: Interactive Editor */}
                <WizardStep isActive={step === 6}>
                  <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
                    <div className="text-center space-y-2 mb-8 no-print px-4">
                      <h2 className="text-2xl md:text-3xl font-bold">Finalize Report</h2>
                      <p className="text-slate-500 text-sm md:text-base">Edit fields directly and add your signature before exporting</p>

                      <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <button
                          type="button"
                          onClick={handleExportPDF}
                          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700 transition-all active:scale-95"
                        >
                          <Download className="w-5 h-5" />
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleExportWord}
                          disabled={docxSaving}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                        >
                          {docxSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                          {docxSaving ? 'Saving Word...' : 'Download Word'}
                        </button>
                        <button
                          type="button"
                          onClick={handleFinish}
                          disabled={docxSaving}
                          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          {docxSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          {docxSaving ? 'Saving...' : 'Finish & Return'}
                        </button>
                      </div>
                    </div>

                    {/* Document Preview Container */}
                    <div className="bg-white shadow-2xl rounded-sm mx-auto overflow-x-auto border border-slate-200 text-slate-900" style={{ width: '100%', maxWidth: '1000px' }}>
                      <div className="min-w-[800px] p-[40px] bg-white min-h-[1200px]">
                        {/* Document Header (Letterhead-style) */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                          <div>
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.png" alt="Gapura Logo" className="h-16 w-auto mb-4" />
                          </div>
                          <div className="text-right">
                            <h1 className="text-2xl font-black tracking-tighter text-slate-900">IRREGULARITY REPORT FORM</h1>
                          </div>
                        </div>

                        {/* Reference & To/From Table */}
                        <div className="grid grid-cols-[180px_1fr] border border-slate-900 mb-8">
                          <div className="bg-slate-50 p-2 font-bold border-r border-b border-slate-900">REFERENCE NO</div>
                          <div className="p-2 border-b border-slate-900">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium"
                              value={docEdits.reference_no}
                              onChange={e => setDocEdits({...docEdits, reference_no: e.target.value})}
                            />
                          </div>

                          <div className="bg-slate-50 p-2 font-bold border-r border-b border-slate-900">TO</div>
                          <div className="p-2 border-b border-slate-900">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0"
                              value={docEdits.to}
                              onChange={e => setDocEdits({...docEdits, to: e.target.value})}
                            />
                          </div>

                          <div className="bg-slate-50 p-2 font-bold border-r border-b border-slate-900">FROM</div>
                          <div className="p-2 border-b border-slate-900">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0"
                              value={docEdits.from}
                              onChange={e => setDocEdits({...docEdits, from: e.target.value})}
                            />
                          </div>

                          <div className="bg-slate-50 p-2 font-bold border-r border-b border-slate-900">CC</div>
                          <div className="p-2 border-b border-slate-900">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0"
                              value={docEdits.cc}
                              onChange={e => setDocEdits({...docEdits, cc: e.target.value})}
                            />
                          </div>

                          <div className="bg-slate-50 p-2 font-bold border-r border-b border-slate-900">SUBJECT</div>
                          <div className="p-2 border-b border-slate-900">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold"
                              value={docEdits.subject}
                              onChange={e => setDocEdits({...docEdits, subject: e.target.value})}
                            />
                          </div>

                          <div className="bg-slate-50 p-2 font-bold border-r border-slate-900">ATTACHMENT</div>
                          <div className="p-2">
                            <input
                              className="w-full bg-transparent border-none p-0 focus:ring-0"
                              value={docEdits.attachment}
                              onChange={e => setDocEdits({...docEdits, attachment: e.target.value})}
                            />
                          </div>
                        </div>

                        {/* Section I: Flight Data */}
                        <div className="mb-8">
                          <h3 className="font-bold border-b-2 border-slate-900 mb-2">I. FLIGHT DATA</h3>
                          <div className="grid grid-cols-2 border border-slate-900">
                            <div className="border-r border-slate-900">
                              {([
                                { label: 'Date Of Occurrence', key: 'incident_date' },
                                { label: 'Branch', key: 'branch' },
                                { label: 'Flight Number', key: 'flight_number' },
                                { label: 'Aircraft Registration', key: 'aircraft_reg' },
                                { label: 'Route', key: 'route' },
                              ] satisfies Array<{ label: string; key: TextDocEditKey }>).map((field, i) => (
                                <div key={field.key} className={`grid grid-cols-[180px_1fr] ${i < 4 ? 'border-b border-slate-300' : ''}`}>
                                  <div className="bg-slate-50 p-1.5 text-sm font-semibold border-r border-slate-300">{field.label}</div>
                                  <div className="p-1.5">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                                      value={docEdits[field.key]}
                                      onChange={e => setDocEdits({...docEdits, [field.key]: e.target.value})}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div>
                              {([
                                { label: 'STD/ATD', key: 'std_atd' },
                                { label: 'PAX', key: 'pax' },
                                { label: 'BGE', key: 'bge' },
                                { label: 'Gate/Parking Stand', key: 'gate_stand' },
                                { label: 'Delay (Code/Duration)*', key: 'delay' },
                              ] satisfies Array<{ label: string; key: TextDocEditKey }>).map((field, i) => (
                                <div key={field.key} className={`grid grid-cols-[180px_1fr] ${i < 4 ? 'border-b border-slate-300' : ''}`}>
                                  <div className="bg-slate-50 p-1.5 text-sm font-semibold border-r border-slate-300">{field.label}</div>
                                  <div className="p-1.5">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                                      value={docEdits[field.key]}
                                      onChange={e => setDocEdits({...docEdits, [field.key]: e.target.value})}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Section II: Officers */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b-2 border-slate-900 mb-2">
                            <h3 className="font-bold">II. OFFICER(S) ON DUTY</h3>
                            <button
                              type="button"
                              onClick={() => setDocEdits({...docEdits, officers: [...docEdits.officers, { name: '', company: '', function: '' }]})}
                              className="text-xs flex items-center gap-1 text-emerald-600 font-bold no-print"
                            >
                              <PlusCircle className="w-3 h-3" /> Add Officer
                            </button>
                          </div>
                          <table className="w-full border-collapse border border-slate-900 text-sm">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-1 w-10">NO</th>
                                <th className="border border-slate-900 p-1">NAME</th>
                                <th className="border border-slate-900 p-1">COMPANY</th>
                                <th className="border border-slate-900 p-1">FUNCTION</th>
                                <th className="border border-slate-900 p-1 w-10 no-print"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {docEdits.officers.map((officer, idx) => (
                                <tr key={idx}>
                                  <td className="border border-slate-900 p-1 text-center">{idx + 1}</td>
                                  <td className="border border-slate-900 p-1">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                                      value={officer.name}
                                      onChange={e => {
                                        const newOfficers = [...docEdits.officers];
                                        newOfficers[idx].name = e.target.value;
                                        setDocEdits({...docEdits, officers: newOfficers});
                                      }}
                                    />
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                                      value={officer.company}
                                      onChange={e => {
                                        const newOfficers = [...docEdits.officers];
                                        newOfficers[idx].company = e.target.value;
                                        setDocEdits({...docEdits, officers: newOfficers});
                                      }}
                                    />
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                                      value={officer.function}
                                      onChange={e => {
                                        const newOfficers = [...docEdits.officers];
                                        newOfficers[idx].function = e.target.value;
                                        setDocEdits({...docEdits, officers: newOfficers});
                                      }}
                                    />
                                  </td>
                                  <td className="border border-slate-900 p-1 text-center no-print">
                                    <button
                                      type="button"
                                      onClick={() => setDocEdits({...docEdits, officers: docEdits.officers.filter((_, i) => i !== idx)})}
                                      className="text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {/* Empty rows to make it look like a form */}
                              {Array.from({ length: Math.max(0, 5 - docEdits.officers.length) }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                  <td className="border border-slate-900 p-1 text-center">{docEdits.officers.length + i + 1}</td>
                                  <td className="border border-slate-900 p-1 h-7"></td>
                                  <td className="border border-slate-900 p-1"></td>
                                  <td className="border border-slate-900 p-1"></td>
                                  <td className="border border-slate-900 p-1 no-print"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Section III: Chronology */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b-2 border-slate-900 mb-2">
                            <h3 className="font-bold">III. CHRONOLOGY OF EVENT</h3>
                            <button
                              type="button"
                              onClick={() => setDocEdits({...docEdits, chronology: [...docEdits.chronology, { time: '', description: '' }]})}
                              className="text-xs flex items-center gap-1 text-emerald-600 font-bold no-print"
                            >
                              <PlusCircle className="w-3 h-3" /> Add Entry
                            </button>
                          </div>
                          <table className="w-full border-collapse border border-slate-900 text-sm">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-1 w-32">TIME IN LOCAL</th>
                                <th className="border border-slate-900 p-1">DESCRIPTION / REMARK</th>
                                <th className="border border-slate-900 p-1 w-10 no-print"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {docEdits.chronology.map((entry, idx) => (
                                <tr key={idx}>
                                  <td className="border border-slate-900 p-1 text-center">
                                    <input
                                      className="w-full bg-transparent border-none p-0 text-sm text-center focus:ring-0"
                                      placeholder="HH:mm"
                                      value={entry.time}
                                      onChange={e => {
                                        const newChronology = [...docEdits.chronology];
                                        newChronology[idx].time = e.target.value;
                                        setDocEdits({...docEdits, chronology: newChronology});
                                      }}
                                    />
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                    <textarea
                                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none min-h-[60px]"
                                      value={entry.description}
                                      onChange={e => {
                                        const newChronology = [...docEdits.chronology];
                                        newChronology[idx].description = e.target.value;
                                        setDocEdits({...docEdits, chronology: newChronology});
                                      }}
                                    />
                                  </td>
                                  <td className="border border-slate-900 p-1 text-center no-print">
                                    <button
                                      type="button"
                                      onClick={() => setDocEdits({...docEdits, chronology: docEdits.chronology.filter((_, i) => i !== idx)})}
                                      className="text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {/* Empty rows */}
                              {Array.from({ length: Math.max(0, 3 - docEdits.chronology.length) }).map((_, i) => (
                                <tr key={`empty-c-${i}`}>
                                  <td className="border border-slate-900 p-1 h-12"></td>
                                  <td className="border border-slate-900 p-1"></td>
                                  <td className="border border-slate-900 p-1 no-print"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Sections IV, V, VI */}
                        {([
                          { title: 'IV. POTENTIAL/ROOT CAUSE(S)', key: 'root_cause' },
                          { title: 'V. CORRECTIVE ACTION(S)', key: 'action_taken' },
                          { title: 'VI. PREVENTIVE ACTION(S)', key: 'preventive_action' },
                        ] satisfies Array<{ title: string; key: TextDocEditKey }>).map((section) => (
                          <div key={section.key} className="mb-6">
                            <h3 className="font-bold border-b-2 border-slate-900 mb-2">{section.title}</h3>
                            <div className="border border-slate-900 p-2 min-h-[80px]">
                              <textarea
                                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none min-h-[60px]"
                                placeholder="Enter details..."
                                value={docEdits[section.key]}
                                onChange={e => setDocEdits({...docEdits, [section.key]: e.target.value})}
                              />
                            </div>
                          </div>
                        ))}

                        {/* Signature Section */}
                        <div className="mt-12 border border-slate-900">
                          <div className="grid grid-cols-2 border-b border-slate-900">
                            <div className="p-2 border-r border-slate-900 flex items-center gap-2">
                              <span className="font-bold">Location:</span>
                              <input
                                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0"
                                value={docEdits.branch}
                                onChange={e => setDocEdits({...docEdits, branch: e.target.value})}
                              />
                            </div>
                            <div className="p-2 flex items-center gap-2">
                              <span className="font-bold">Date of Prepared:</span>
                              <input
                                type="date"
                                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0"
                                value={docEdits.incident_date}
                                onChange={e => setDocEdits({...docEdits, incident_date: e.target.value})}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 h-48">
                            <div className="border-r border-slate-900 p-2 flex flex-col items-center justify-between">
                              <div className="font-bold">Prepared by,</div>
                              <div className="w-full flex-1 flex items-center justify-center relative">
                                <SignaturePad ref={signatureRef} />
                              </div>
                              <div className="w-full text-center">
                                <input
                                  className="w-full bg-transparent border-none p-0 text-center text-sm focus:ring-0 font-bold"
                                  value={docEdits.reporter_name}
                                  onChange={e => setDocEdits({...docEdits, reporter_name: e.target.value})}
                                />
                                <input
                                  className="w-full bg-transparent border-none p-0 text-center text-[10px] focus:ring-0 text-slate-500 uppercase"
                                  value={docEdits.reporter_title}
                                  onChange={e => setDocEdits({...docEdits, reporter_title: e.target.value})}
                                />
                              </div>
                            </div>
                            <div className="p-2 flex flex-col items-center justify-between text-slate-400 italic">
                              <div className="font-bold text-slate-900 not-italic">Acknowledge by,</div>
                              <div className="flex-1 flex items-center justify-center">
                                Manager of Airside Service
                              </div>
                              <div className="font-bold text-slate-900 not-italic">( ........................ )</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 text-[10px] flex justify-between text-slate-400">
                          <span>*) Additional Information (if required/if existing)</span>
                          <span className="font-bold">F-OP-02</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </WizardStep>

                {/* Navigation */}
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:p-0 bg-white/80 backdrop-blur-xl md:bg-transparent border-t md:border-none z-[100] flex items-center justify-between md:justify-end gap-4">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={step === 1}
                        className="btn-secondary h-12 px-6 rounded-full flex items-center justify-center gap-2 !shadow-lg bg-white font-bold disabled:opacity-0 disabled:pointer-events-none transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    {step < 5 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!isStepValid()}
                            className="flex-1 md:flex-none h-12 px-6 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Continue
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : step === 5 ? (
                        <button
                            type="submit"
                            disabled={!isStepValid() || loading}
                            className="flex-1 md:flex-none h-12 px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Submit Report
                                    <FileText className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    ) : (
                      <button
                          type="button"
                          onClick={handleFinish}
                          disabled={docxSaving}
                          className="flex-1 md:flex-none h-12 px-6 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                          {docxSaving ? (
                              <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Saving...
                              </>
                          ) : (
                              <>
                                  Finish
                                  <CheckCircle className="w-5 h-5" />
                              </>
                          )}
                      </button>
                    )}
                </div>

                {/* Step Indicator */}
                <div className="fixed top-20 md:top-24 right-4 md:right-6 z-[100] bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm flex items-center gap-2">
                    <span className="text-sm font-bold">Step {step}/6</span>
                </div>
            </form>
        </div>
    );
}
