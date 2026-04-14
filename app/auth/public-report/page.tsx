/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman untuk pelaporan publik irregularity dengan sistem wizard multi-step,
 * termasuk akses cepat ke berbagai layanan seperti AI Chatbot, SLA, Survey, dan JOUMPA
 */
/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi halaman untuk pelaporan publik irregularity dengan sistem wizard multi-step,
 * termasuk akses cepat ke berbagai layanan seperti AI Chatbot, SLA, Survey, dan JOUMPA
 */
'use client';

import { useEffect, useState, type CSSProperties, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { WizardStep } from '@/components/ui/WizardStep';
import GuestNav from '@/components/GuestNav';
import { ReportDownloadModal } from '@/components/dashboard/ReportDownloadModal';
import { PRIORITY_CONFIG, type ReportPriority } from '@/lib/constants/report-status';
import { AIRLINES } from '@/lib/constants/airlines';
import { AlertTriangle, Calendar, Plus, CheckCircle, Ship, Plane, Package, HelpCircle, MessageSquare, Heart, X, ChevronRight, ChevronLeft, ArrowRight, Upload, Loader2, Sparkles, MapPin, QrCode, ClipboardCheck, ExternalLink, BookOpen, Activity, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeWithLogo } from '@/components/ui/QRCodeWithLogo';
import { GlassCard } from '@/components/ui/GlassCard';
import { NoiseTexture } from '@/components/ui/NoiseTexture';
import { PrismButton } from '@/components/ui/PrismButton';
import { queueOfflineReport } from '@/lib/pwa/offline-queue';


/**
 * Tipe data untuk link akses cepat
 */
/**
 * Tipe data untuk link akses cepat
 */
type QuickAccessLink = { label: string; url: string; sublabel?: string };

/**
 * Tipe data untuk link QR code
 */
type QRLink = { label: string; url: string };

/**
 * Kategori untuk akses cepat dengan konfigurasi tampilan
 */
type QuickAccessCategory = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
  span: string;
  qrLinks?: QRLink[];
  links?: QuickAccessLink[];
  passwordProtected?: boolean;
  redirectUrl?: string;
  externalRedirect?: boolean;
};

/**
 * Konfigurasi kategori akses cepat
 */
const CATEGORIES: QuickAccessCategory[] = [
  {
    id: 'AIChatbot',
    title: "I'm in Charge Virtual Assistant",
    description: 'Tanya asisten AI untuk bantuan operasional.',
    icon: Bot,
    color: 'oklch(0.60 0.18 260)',
    span: 'col-span-1 row-span-1 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2',
    passwordProtected: true,
    links: [
      { label: 'Buka AI Virtual Assistant', sublabel: 'Powered by Gapura RAG', url: 'https://gapura-dev-gapura-rag.hf.space/' }
    ]
  },
  {
    id: 'Irregularity',
    title: 'Irregularity Report',
    description: 'Laporkan kendala operasional, kerusakan, atau penyimpangan.',
    icon: AlertTriangle,
    color: 'oklch(0.55 0.22 30)',
    span: 'col-span-1 row-span-1 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2'
  },
  {
    id: 'JOUMPA',
    title: 'JOUMPA',
    description: 'Hospitality & VIP Service access.',
    icon: QrCode,
    color: 'oklch(0.50 0.15 190)',
    span: 'col-span-1 row-span-1 sm:col-span-1 sm:row-span-1',
    qrLinks: [
      { label: 'Customer JOUMPA', url: 'https://forms.gle/gQpqWn2eSRqSsoJt7' },
      { label: 'Staff JOUMPA', url: 'https://forms.gle/QTP5vvwbmJxDroSB7' }
    ]
  },
  {
    id: 'SLA',
    title: 'Pengisian Report SLA',
    description: 'Akses cepat pengisian laporan SLA.',
    icon: ClipboardCheck,
    color: 'oklch(0.45 0.18 240)',
    span: 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-1',
    qrLinks: [
      { label: 'Pengisian SLA Landside', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeu3mRk2R_V-m9lBIn9704Kx6u3_p3d8pT80p3/viewform' },
      { label: 'Pengisian SLA Airside', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeu3mRk2R_V-m9lBIn9704Kx6u3_p3d8pT80p3/viewform' }
    ]
  },
  {
    id: 'Survey',
    title: 'Survey Penumpang',
    description: 'Bantu kami meningkatkan layanan via survey.',
    icon: QrCode,
    color: 'oklch(0.60 0.20 340)',
    span: 'col-span-1 row-span-1',
    qrLinks: [
      { label: 'Survey Penumpang', url: 'https://forms.gle/G5T9yx2MBSWdXtJE7' }
    ]
  },
  {
    id: 'WSN',
    title: 'WSN Dashboard',
    description: 'Monitoring WSN & Weekly Service Notice.',
    icon: Activity,
    color: 'oklch(0.55 0.18 180)',
    span: 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-1',
    passwordProtected: true,
    qrLinks: [
      { label: 'Monitoring WSN Dashboard', url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_ufv08vzhsd' },
      { label: 'Weekly Service Notice Dashboard', url: 'https://lookerstudio.google.com/reporting/55737b14-c27a-4ed8-b65c-336317790314/page/p_1swzqz7usd' }
    ]
  },
  {
    id: 'HSSE',
    title: 'HSSE Report',
    description: 'Akses cepat ke portal HSSE Report.',
    icon: AlertTriangle,
    color: 'oklch(0.62 0.22 28)',
    span: 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-1',
    passwordProtected: true,
    qrLinks: [
      { label: 'HSSE Report Form', url: 'https://forms.office.com/pages/responsepage.aspx?id=UN958i0U-k6wuwHqZRjbWCdrrO6qSgFPtKjbarMtEydUN0ZaM0tJODFONktURkpZUE45TFpNQ1hJOC4u&origin=lprLink&route=shorturl' }
    ]
  },
  {
    id: 'Handbook',
    title: 'Handbook SLA',
    description: 'Panduan standar layanan operasional prima.',
    icon: BookOpen,
    color: 'oklch(0.45 0.20 160)',
    span: 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-1',
    passwordProtected: true,
    links: [
      { label: 'Buka Handbook SLA', sublabel: 'SIS Apps Dev', url: 'https://sis.appsdev.my.id/' }
    ]
  }
];

/**
 * Opsi area lokasi kejadian
 */
const AREA_OPTIONS = [
  { id: 'TERMINAL', label: 'Terminal Area', icon: Plane },
  { id: 'APRON', label: 'Apron Area', icon: Ship },
  { id: 'CARGO', label: 'Cargo Area', icon: Package },
  { id: 'GENERAL', label: 'General', icon: MapPin },
];

/**
 * Kategori berdasarkan area kejadian
 */
const AREA_CATEGORIES: Record<string, string[]> = {
  TERMINAL: [
    'Passenger, Baggage & Document Profiling',
    'Boarding Management',
    'Baggage/Special/Irregularities Handling',
    'Accuracy & Completeness of Service',
    'Procedure Competencies',
    'Cleanliness Table',
    'Avoids taking initiative to help',
    'Lack communication skills',
    'Other',
  ],
  APRON: [
    'Preparation Before ETA',
    'Flight Document Handling',
    'The Availability of GSE',
    'Accurancy & Completeness of Service (Apron)',
    'Qualified Competencies (Apron)',
    'Procedure Competencies',
    'Cleanliness of GSE',
    'Prompt Service and Certainty',
    'Specific Needs of Customers',
    'Other',
  ],
  CARGO: ['Acceptance', 'Build Up', 'Break Down', 'Delivery', 'Documentation', 'Storage/Warehousing', 'Other'],
  GENERAL: ['Other'],
};

/**
 * Kode maskapai lokal
 */
const LOKAL_AIRLINE_CODES = ['GA', 'QG', 'JT', 'ID', 'IW', 'IU', 'QZ', 'SJ', 'IN', 'IP', '8B', 'SI', 'IL'];

/**
 * Mendapatkan tipe maskapai berdasarkan nama
 * @param airlineName - Nama maskapai
 * @returns Tipe maskapai 'Lokal' atau 'MPA'
 */
/**
 * Mendapatkan tipe maskapai berdasarkan nama
 * @param airlineName - Nama maskapai
 * @returns Tipe maskapai 'Lokal' atau 'MPA'
 */
function getAirlineType(airlineName: string): 'Lokal' | 'MPA' {
  const airline = AIRLINES.find((a) => a.name === airlineName);
  if (!airline) return 'MPA';
  return LOKAL_AIRLINE_CODES.includes(airline.code) ? 'Lokal' : 'MPA';
}

/**
 * Mendapatkan hub untuk station tertentu
 * @param stationCode - Kode station
 * @returns Kode hub
 */
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
 * Menghitung minggu dalam bulan dari tanggal
 * @param date - Tanggal
 * @returns Nomor minggu (1-5)
 */
function getWeekInMonth(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7);
}

/**
 * Tipe data untuk formulir laporan
 */
type FormData = {
  incident_date: string;
  airline: string;
  flight_number: string;
  station_id: string;
  route: string;
  main_category: string;
  delay_code: string;
  delay_duration: string;
  area: string;
  area_category: string;
  description: string;
  root_cause: string;
  action_taken: string;
  severity: ReportPriority;
  reporter_name: string;
  reporter_email: string;
  evidence_urls: string[];
};

/**
 * Tipe data untuk laporan yang telah dibuat
 */
type CreatedReport = { id?: string } & Record<string, unknown>;

/**
 * Halaman utama untuk pelaporan publik irregularity
 * @returns Komponen React
 */
export default function PublicReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [submissionMode, setSubmissionMode] = useState<'submitted' | 'queued'>('submitted');
  const [pendingProtectedCategory, setPendingProtectedCategory] = useState<QuickAccessCategory | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    incident_date: new Date().toISOString().split('T')[0],
    airline: '',
    flight_number: '',
    station_id: '',
    route: '',
    main_category: '',
    delay_code: '',
    delay_duration: '',
    area: '',
    area_category: '',
    description: '',
    root_cause: '',
    action_taken: '',
    severity: 'medium',
    reporter_name: '',
    reporter_email: '',
    evidence_urls: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchStations = async () => {
      try {
        const res = await fetch('/api/master-data?type=stations', { signal });
        const data = await res.json();
        if (Array.isArray(data)) setStations(data);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Failed to load stations', e);
      }
    };
    fetchStations();

    return () => controller.abort();
  }, []);

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

  // Ensure mobile bottom nav (GuestNav) remains visible on public access pages

  /**
   * Mengompres gambar sebelum diunggah
   * @param file - File gambar
   * @param opts - Opsi kompresi (maxWidth, maxHeight, quality, mimeType)
   * @returns Promise<File> File yang sudah dikompres
   */
  const compressImage = (file: File, opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}) => {
    const { maxWidth = 1600, maxHeight = 1600, quality = 0.8, mimeType = 'image/webp' } = opts;
    return new Promise<File>((resolve, reject) => {
      const img = document.createElement('img');
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
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Canvas not supported'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Compression failed'));
          const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type });
          resolve(compressed);
        }, mimeType, quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  /**
   * Menangani file yang dipilih untuk diunggah
   */
  const handleFilesSelected = async () => {
    if (!selectedFiles.length) return;
    if (!navigator.onLine) {
      setError('Anda sedang offline. File akan ikut masuk antrean saat laporan dikirim.');
      return;
    }
    try {
      const uploadedUrls = await uploadEvidenceFiles(selectedFiles);
      setFormData((prev) => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...uploadedUrls] }));
      setSelectedFiles([]);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah bukti';
      setError(message);
    }
  };

  /**
   * Mengunggah file bukti ke server
   * @param files - Array file yang akan diunggah
   * @returns Promise<string[]> Array URL file yang berhasil diunggah
   */
  const uploadEvidenceFiles = async (files: File[]) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const res = await fetch('/api/uploads/evidence/public', { method: 'POST', body: fd });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Gagal upload bukti');
      }
      const data = await res.json();
      uploadedUrls.push(data.url);
    }
    return uploadedUrls;
  };

  /**
   * Menghapus bukti pada indeks tertentu
   * @param index - Indeks bukti yang akan dihapus
   */
  const removeEvidenceAt = (index: number) => {
    setFormData((prev) => ({ ...prev, evidence_urls: prev.evidence_urls.filter((_, i) => i !== index) }));
  };

  /**
   * Berpindah ke langkah berikutnya
   */
  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));

  /**
   * Berpindah ke langkah sebelumnya
   */
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const selectedCategory = CATEGORIES.find(c => c.id === formData.main_category);

  /**
   * Type guard untuk mengecek apakah kategori memiliki QR links
   * @param c - Kategori akses cepat
   * @returns True jika memiliki qrLinks
   */
  const hasQrLinks = (c: QuickAccessCategory): c is QuickAccessCategory & { qrLinks: QRLink[] } => {
    return Array.isArray(c.qrLinks);
  };

  /**
   * Type guard untuk mengecek apakah kategori memiliki links
   * @param c - Kategori akses cepat
   * @returns True jika memiliki links
   */
  const hasLinks = (c: QuickAccessCategory): c is QuickAccessCategory & { links: QuickAccessLink[] } => {
    return Array.isArray(c.links);
  };

  /**
   * Menutup panel akses cepat
   */
  const closeQuickAccess = () => {
    setFormData(prev => ({ ...prev, main_category: '' }));
    setStep(1);
  };

  /**
   * Menutup prompt password
   */
  const closePasswordPrompt = () => {
    setPendingProtectedCategory(null);
    setPasswordInput('');
    setPasswordError('');
  };

  /**
   * Membuka redirect kategori yang dilindungi password
   * @param category - Kategori akses cepat
   */
  const openProtectedRedirect = (category: QuickAccessCategory) => {
    if (!category.redirectUrl) {
      return;
    }

    closePasswordPrompt();

    if (category.externalRedirect ?? /^https?:\/\//i.test(category.redirectUrl)) {
      window.open(category.redirectUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(category.redirectUrl);
  };

  /**
   * Membuka kategori akses cepat
   * @param category - Kategori akses cepat
   */
  const openCategory = (category: QuickAccessCategory) => {
    if (category.passwordProtected) {
      setPendingProtectedCategory(category);
      setPasswordInput('');
      setPasswordError('');
      return;
    }

    if (category.redirectUrl) {
      if (category.externalRedirect ?? /^https?:\/\//i.test(category.redirectUrl)) {
        window.open(category.redirectUrl, '_blank', 'noopener,noreferrer');
      } else {
        router.push(category.redirectUrl);
      }
      return;
    }

    setFormData(prev => ({ ...prev, main_category: category.id }));
    setStep(1);
  };

  /**
   * Mengirim password untuk verifikasi akses
   */
  const submitPassword = async () => {
    if (!pendingProtectedCategory) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-quick-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          if (pendingProtectedCategory.redirectUrl) {
            openProtectedRedirect(pendingProtectedCategory);
            return;
          }
          setFormData(prev => ({ ...prev, main_category: pendingProtectedCategory.id }));
          setPendingProtectedCategory(null);
          setPasswordInput('');
          setPasswordError('');
          setStep(1);
          return;
        }
      }
    } catch {
      // Fall through to error
    } finally {
      setLoading(false);
    }
    setPasswordError('Kata sandi salah.');
  };

  /**
   * Validasi langkah formulir saat ini
   * @returns True jika langkah valid
   */
  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return !!(formData.incident_date && formData.airline && formData.flight_number && formData.station_id && formData.route && formData.main_category);
      case 2:
        return !!formData.area;
      case 3:
        return !!formData.area_category;
      case 4:
        return !!(formData.description && formData.root_cause && formData.action_taken);
      case 5:
        return !!(
          formData.reporter_name &&
          formData.reporter_email &&
          (formData.evidence_urls.length > 0 || selectedFiles.length > 0)
        );
      default:
        return false;
    }
  };

  /**
   * Menangani submit formulir
   * @param e - Event form atau mouse
   */
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const selectedStation = stations.find((s) => s.id === formData.station_id);
      const stationCode = selectedStation?.code || formData.station_id || '';
      const eventDate = new Date(formData.incident_date);
      let evidenceUrls = [...formData.evidence_urls];

      if (navigator.onLine && selectedFiles.length > 0) {
        const uploadedUrls = await uploadEvidenceFiles(selectedFiles);
        evidenceUrls = [...evidenceUrls, ...uploadedUrls];
        setFormData((prev) => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...uploadedUrls] }));
        setSelectedFiles([]);
      }

      const payload = {
        ...formData,
        evidence_urls: evidenceUrls,
        evidence_url: evidenceUrls[0],
        title: `${formData.airline} ${formData.flight_number} - ${formData.main_category}`,
        station_id: formData.station_id,
        category: formData.main_category,
        station_code: stationCode,
        hub: getHubForStation(stationCode),
        jenis_maskapai: getAirlineType(formData.airline),
        report: formData.description,
        reporting_branch: stationCode,
        week_in_month: getWeekInMonth(eventDate),
        form_submitted_at: new Date().toISOString(),
        form_completed_at: new Date().toISOString(),
        area: formData.area,
        incident_type_id: formData.area_category,
        delay_code: formData.delay_code,
        delay_duration: formData.delay_duration,
        terminal_area_category: formData.area === 'TERMINAL' ? formData.area_category : undefined,
        apron_area_category: formData.area === 'APRON' ? formData.area_category : undefined,
        general_category: formData.area === 'GENERAL' || formData.area === 'CARGO' ? formData.area_category : undefined,
      };

      if (!navigator.onLine) {
        const queuedItem = await queueOfflineReport({
          kind: 'public-report',
          endpoint: '/api/reports/public',
          uploadEndpoint: '/api/uploads/evidence/public',
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

      const res = await fetch('/api/reports/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        await res.text();
        throw new Error('Respons server tidak valid. Mohon coba lagi.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal mengirim laporan');
      }

      setSubmissionMode('submitted');
      setCreatedReport({
        ...formData,
        ...data.data,
        id: data.data?.id || 'DRAFT',
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Menyalin teks ke clipboard
   * @param text - Teks yang akan disalin
   * @param key - Kunci identifikasi untuk status copied
   */
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0A0A0A] selection:bg-emerald-500/30">
        <NoiseTexture opacity={0.03} />
        <GuestNav hideSidebar={true} hideMobileNav={true} />
        <div className="flex items-center justify-center min-h-[90vh] p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-12 relative z-10"
          >
            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </motion.div>
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-20" />
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-black mb-4 text-[oklch(0.15_0.05_200)] tracking-tight">
              {submissionMode === 'queued' ? 'Laporan Masuk Antrean Offline' : 'Laporan Terkirim'}
            </h2>
            <p className="text-[oklch(0.40_0.02_200)] text-lg mb-8 max-w-sm mx-auto font-bold opacity-80">
              ID: {createdReport?.id || 'SUBMITTED'}<br/>
              {submissionMode === 'queued'
                ? 'Laporan akan dikirim otomatis saat koneksi kembali.'
                : 'Terima kasih atas kontribusi Anda dalam menjaga kualitas layanan operasional.'}
            </p>
            <PrismButton 
                onClick={() => {
                  setSuccess(false);
                  setFormData({ ...formData, main_category: '' });
                }}
                className="bg-emerald-600 text-white px-12 h-16 text-lg shadow-spatial-md"
              >
                Back to Dashboard
              </PrismButton>
          </motion.div>
        </div>
        {submissionMode === 'submitted' && (
          <ReportDownloadModal
            isOpen={success}
            onClose={() => {}}
            reportData={createdReport}
            onFinished={() => router.push('/auth/login')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[oklch(0.98_0.01_200)] text-[oklch(0.15_0.02_200)] selection:bg-emerald-500/10 overflow-x-hidden p-6 md:p-12 font-body">
      <NoiseTexture opacity={0.02} />
      <GuestNav hideSidebar={true} hideMobileNav={true} />

      <section className="mb-20 pt-10 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="mb-10 flex justify-center">
            <Image src="/logo.png" alt="Gapura" width={140} height={48} className="opacity-90" style={{ width: 'auto', height: 'auto' }} />
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tight mb-6 text-[oklch(0.15_0.05_200)] leading-[0.9]">
            One Click<br/>
            <span className="text-emerald-600">Irregularity</span> Report
          </h1>
          <p className="text-lg md:text-2xl text-[oklch(0.40_0.02_200)] max-w-xl mx-auto font-medium leading-relaxed">
            Platform pelaporan operasional terpadu.<br/>
            Cepat, akurat, dan transparan.
          </p>
        </motion.div>

        {/* Soft background illumination */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-emerald-500/5 to-transparent blur-[120px] rounded-full pointer-events-none" />
      </section>

      {/* Bento Grid */}
      <main className="max-w-7xl mx-auto mb-32 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(140px,auto)] sm:auto-rows-[minmax(180px,auto)] lg:auto-rows-[minmax(220px,auto)] grid-flow-row-dense px-4 md:px-0">
          {CATEGORIES.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: 'spring', damping: 20 }}
              className={`${cat.span} group relative cursor-pointer`}
              onClick={() => openCategory(cat)}
            >
              <GlassCard 
                variant="frosted"
                className="h-full border-[oklch(0.15_0.02_200_/_0.05)] hover:border-emerald-500/30 transition-all duration-500 shadow-spatial-sm hover:shadow-spatial-lg"
              >
                <div className="p-5 md:p-7 h-full flex flex-col justify-between relative z-10 overflow-hidden">
                  <div className="space-y-1.5 md:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-[oklch(1_0_0_/_0.4)] border border-white/40 shadow-inner-rim">
                        <cat.icon className="w-4 h-4 md:w-6 md:h-6" style={{ color: cat.color }} />
                      </div>
                      
                    </div>
                    <div className="space-y-0.5 md:space-y-2">
                      <h3 className="text-base md:text-2xl font-display font-black tracking-tight text-[oklch(0.15_0.05_200)] group-hover:translate-x-1 transition-transform leading-tight">
                        {cat.title}
                      </h3>
                      <p className="hidden md:block text-sm text-[oklch(0.45_0.02_200)] leading-relaxed font-medium">{cat.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[oklch(0.15_0.02_200_/_0.2)] group-hover:text-emerald-600 transition-colors mt-auto">
                    <span className="text-[9px] md:text-xs font-bold tracking-wide uppercase">{('qrLinks' in cat) ? 'Quick Access' : 'Luncurkan'}</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>

                {/* Silk highlight effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Portal Dialog */}
      <AnimatePresence mode="wait">
        {formData.main_category && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[oklch(0.15_0.02_200_/_0.2)] backdrop-blur-sm"
              onClick={closeQuickAccess}
            />
            
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-[oklch(1_0_0_/_0.95)] border-t md:border border-[oklch(0.15_0.02_200_/_0.05)] rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-spatial-lg h-[90vh] md:h-auto max-h-[95vh] flex flex-col backdrop-blur-2xl"
            >
              <NoiseTexture opacity={0.015} />
              
              {/* Mobile Drawer Handle */}
              <div className="md:hidden flex justify-center py-3">
                <div className="w-12 h-1.5 rounded-full bg-[oklch(0.15_0.02_200_/_0.1)]" />
              </div>

              {/* Modal Header */}
              <div className="p-6 md:p-8 pb-4 flex items-center justify-between relative z-10 border-b border-[oklch(0.15_0.02_200_/_0.05)]">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[oklch(0.15_0.05_200)]">
                    {CATEGORIES.find(c => c.id === formData.main_category)?.title ?? formData.main_category}
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    closeQuickAccess();
                  }}
                  className="p-3 rounded-full bg-[oklch(0.15_0.02_200_/_0.03)] hover:bg-[oklch(0.15_0.02_200_/_0.08)] transition-colors"
                >
                  <X className="w-6 h-6 text-[oklch(0.15_0.02_200_/_0.4)]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                {selectedCategory && hasQrLinks(selectedCategory) ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-12 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-3">
                      <h3 className="text-4xl font-display font-black tracking-tight text-[oklch(0.15_0.05_200)]">
                        {selectedCategory?.title || 'Access'}
                      </h3>
                      <p className="text-[oklch(0.40_0.02_200)] text-lg font-medium">Scan QR atau gunakan tombol untuk salin/buka link.</p>
                    </div>
                    <div
                      className={`grid gap-12 w-full max-w-3xl px-4 ${
                        (selectedCategory.qrLinks?.length ?? 0) > 1
                          ? 'grid-cols-1 md:grid-cols-2'
                          : 'grid-cols-1'
                      } place-items-center justify-center`}
                    >
                      {selectedCategory.qrLinks?.map((item: QRLink, idx: number) => (
                        <div key={idx} className="space-y-4">
                          <div className="aspect-square rounded-[40px] overflow-hidden bg-white border border-[oklch(0.15_0.02_200_/_0.06)] p-6 shadow-spatial-md flex items-center justify-center">
                            <QRCodeWithLogo value={item.url} size={256} fgColor="#0ea5a6" />
                          </div>
                          <div className="text-center">
                            <h4 className="text-xl font-display font-black text-[oklch(0.15_0.05_200)]">{item.label}</h4>
                          </div>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={item.url}
                              className="flex-1 px-3 py-2 rounded-lg border border-[oklch(0.15_0.02_200_/_0.08)] bg-[oklch(1_0_0_/_0.9)] text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(item.url, item.label)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-95"
                            >
                              {copied === item.label ? 'Tersalin' : 'Copy'}
                            </button>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-lg bg-[oklch(1_0_0_/_0.9)] text-[oklch(0.15_0.02_200)] text-sm font-bold border border-[oklch(0.15_0.02_200_/_0.08)] active:scale-95"
                            >
                              Buka
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedCategory && hasLinks(selectedCategory) ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-3 max-w-2xl">
                      <h3 className="text-4xl font-display font-black tracking-tight text-[oklch(0.15_0.05_200)]">
                        {selectedCategory.title}
                      </h3>
                      <p className="text-[oklch(0.40_0.02_200)] text-lg font-medium">{selectedCategory.description}</p>
                    </div>
                    <div className="w-full max-w-2xl space-y-4">
                      {selectedCategory.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.08)] hover:border-emerald-500/40 transition"
                        >
                          <selectedCategory.icon className="w-6 h-6 text-emerald-600" />
                          <div className="flex-1">
                            <div className="text-base font-extrabold text-[oklch(0.15_0.05_200)]">{link.label}</div>
                            {link.sublabel ? <div className="text-xs text-[oklch(0.40_0.02_200)] font-bold">{link.sublabel}</div> : null}
                          </div>
                          <ExternalLink className="w-5 h-5 text-[oklch(0.15_0.02_200_/_0.25)] group-hover:text-emerald-600" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-red-400 flex items-start gap-3 text-sm"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <WizardStep isActive={step === 1}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Date of Event</label>
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.15_0.02_200_/_0.2)] group-focus-within:text-emerald-600 transition-colors" />
                          <input
                            type="date"
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm"
                            value={formData.incident_date}
                            onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Airlines</label>
                        <select
                          className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 appearance-none outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm"
                          value={formData.airline}
                          onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                        >
                          <option value="">Select Airline...</option>
                          {AIRLINES.map((airline) => (
                            <option key={airline.code} value={airline.name}>
                              {airline.name} ({airline.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Flight Number</label>
                        <input
                          type="text"
                          placeholder="e.g. GA-101"
                          className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all uppercase text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                          value={formData.flight_number}
                          onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Branch Location</label>
                        <select
                          className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 appearance-none outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm"
                          value={formData.station_id}
                          onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                        >
                          <option value="">Select Branch...</option>
                          {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Route (Sector)</label>
                        <input
                          type="text"
                          placeholder="e.g. CGK-SUB"
                          className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all uppercase text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                          value={formData.route}
                          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest text-[10px]">Delay Code</label>
                          <input
                            type="text"
                            placeholder="Code"
                            className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                            value={formData.delay_code}
                            onChange={(e) => setFormData({ ...formData, delay_code: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest text-[10px]">Duration (min)</label>
                          <input
                            type="text"
                            placeholder="Mins"
                            className="w-full px-5 py-4 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                            value={formData.delay_duration}
                            onChange={(e) => setFormData({ ...formData, delay_duration: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </WizardStep>

                <WizardStep isActive={step === 2}>
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center space-y-2 mb-10">
                      <h3 className="text-3xl font-display font-black text-[oklch(0.15_0.05_200)]">Select Area</h3>
                      <p className="text-[oklch(0.40_0.02_200)] font-bold">Specify where the incident occurred</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {AREA_OPTIONS.map((area) => (
                        <button
                          key={area.id}
                          onClick={() => setFormData({ ...formData, area: area.id, area_category: '' })}
                          className={`group p-8 rounded-[24px] border transition-all duration-300 flex items-center justify-between text-left
                            ${formData.area === area.id 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-spatial-md' 
                              : 'bg-white border-[oklch(0.15_0.02_200_/_0.05)] hover:border-emerald-500/30 hover:bg-white/50 text-[oklch(0.15_0.05_200)]'}`}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl transition-colors ${formData.area === area.id ? 'bg-white/20 text-white' : 'bg-[oklch(0.15_0.02_200_/_0.05)] text-[oklch(0.15_0.02_200_/_0.4)] group-hover:text-emerald-600'}`}>
                              <area.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xl font-display font-black tracking-tight">{area.label}</span>
                          </div>
                          {formData.area === area.id && (
                            <motion.div layoutId="area-check" className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </WizardStep>

                <WizardStep isActive={step === 3}>
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center space-y-2 mb-8">
                      <h3 className="text-3xl font-display font-black text-[oklch(0.15_0.05_200)]">Refine Category</h3>
                      <p className="text-[oklch(0.40_0.02_200)] font-bold">Select specific type for {formData.area}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {AREA_CATEGORIES[formData.area]?.map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={() => setFormData({ ...formData, area_category: cat })}
                          className={`flex items-center gap-4 p-5 rounded-2xl border transition-all
                            ${formData.area_category === cat 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-spatial-sm' 
                              : 'bg-white border-[oklch(0.15_0.02_200_/_0.05)] hover:border-emerald-500/30 text-[oklch(0.15_0.05_200)]/60 hover:text-[oklch(0.15_0.05_200)]'}`}
                        >
                          <div className={`w-3 h-3 rounded-full border-2 transition-all ${formData.area_category === cat ? 'bg-white border-white' : 'border-[oklch(0.15_0.02_200_/_0.1)]'}`} />
                          <span className="text-sm font-bold">{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </WizardStep>

                <WizardStep isActive={step === 4}>
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600" /> Comprehensive Report
                        </label>
                        <textarea
                          placeholder="Describe exactly what happened..."
                          className="w-full px-6 py-6 rounded-3xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all min-h-[160px] resize-none leading-relaxed text-[oklch(0.15_0.05_200)] font-medium shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest text-emerald-800">Root Cause</label>
                          <textarea
                            placeholder="What caused this?"
                            className="w-full px-6 py-6 rounded-3xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all min-h-[120px] resize-none text-[oklch(0.15_0.05_200)] font-medium shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                            value={formData.root_cause}
                            onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest text-emerald-800">Corrective Action</label>
                          <textarea
                            placeholder="What resolve was taken?"
                            className="w-full px-6 py-6 rounded-3xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all min-h-[120px] resize-none text-[oklch(0.15_0.05_200)] font-medium shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                            value={formData.action_taken}
                            onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-6 p-8 rounded-3xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)] shadow-spatial-sm">
                        <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest block mb-4">Severity Assessment</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(Object.entries(PRIORITY_CONFIG) as [ReportPriority, (typeof PRIORITY_CONFIG)[ReportPriority]][]).map(([key, config]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setFormData({ ...formData, severity: key })}
                              className={`relative group p-4 rounded-2xl border-2 transition-all transition-all duration-300 overflow-hidden ${formData.severity === key ? 'scale-[1.05] shadow-spatial-md' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                              style={{ 
                                borderColor: formData.severity === key ? config.color : 'transparent',
                                background: formData.severity === key ? `${config.color}20` : 'transparent'
                              }}
                            >
                              <div className="relative z-10">
                                <span className="text-xs font-black uppercase" style={{ color: config.color }}>{config.label}</span>
                              </div>
                              {formData.severity === key && (
                                <motion.div layoutId="severity-active" className="absolute inset-0 bg-white/10 pointer-events-none" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </WizardStep>

                <WizardStep isActive={step === 5}>
                  <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Reporter Name</label>
                          <div className="relative group">
                            <input
                              type="text"
                              placeholder="Full Name"
                              className="w-full px-6 py-5 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                              value={formData.reporter_name}
                              onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Email Contact</label>
                          <input
                            type="email"
                            placeholder="email@gapura.id"
                            className="w-full px-6 py-5 rounded-2xl bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm placeholder-[oklch(0.15_0.02_200_/_0.3)]"
                            value={formData.reporter_email}
                            onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.6)] uppercase tracking-widest">Evidence</label>
                          <div className="flex-1">
                            <div className="flex-1 flex items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[oklch(0.15_0.02_200_/_0.15)] bg-[oklch(0.15_0.02_200_/_0.02)] hover:border-emerald-500/30 hover:bg-[oklch(0.60_0.18_260_/_0.05)] transition-all cursor-pointer group">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                              />
                              <div className="text-center space-y-3 relative z-10 pointer-events-none">
                                <Upload className="w-8 h-8 text-[oklch(0.15_0.02_200_/_0.3)] group-hover:text-emerald-600 mx-auto transition-colors" />
                                <div>
                                  <p className="text-sm font-bold text-[oklch(0.15_0.02_200_/_0.6)]">Click to upload</p>
                                  <p className="text-xs text-[oklch(0.15_0.02_200_/_0.3)]">Images only (auto-compressed)</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.evidence_urls.length > 0 && (
                      <div className="space-y-3 p-6 rounded-2xl bg-[oklch(0.60_0.18_260_/_0.05)] border border-emerald-500/10">
                        <label className="text-xs font-bold text-[oklch(0.60_0.18_260)] uppercase tracking-widest">Uploaded Evidence</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {formData.evidence_urls.map((url, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-white border border-[oklch(0.15_0.02_200_/_0.08)]">
                              <Image src={url} alt={`Evidence ${idx + 1}`} width={800} height={600} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeEvidenceAt(idx)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedFiles.length > 0 && (
                      <div className="space-y-3 p-6 rounded-2xl bg-blue-50 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Pending Upload</p>
                            <p className="text-sm text-blue-600 font-medium">{selectedFiles.length} file(s) selected</p>
                          </div>
                          <PrismButton
                            onClick={handleFilesSelected}
                            className="bg-blue-600 text-white px-6 py-2.5 text-sm font-bold shadow-sm active:scale-95 transition-all"
                          >
                            Upload Now
                          </PrismButton>
                        </div>
                      </div>
                    )}
                  </div>
                </WizardStep>

                <WizardStep isActive={step === 6}>
                  <div className="text-center py-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-display font-black text-[oklch(0.15_0.05_200)] mb-3">Review Your Report</h3>
                    <p className="text-[oklch(0.40_0.02_200)] mb-8 font-medium">Please review before submitting</p>

                    <div className="max-w-xl mx-auto space-y-4 text-left">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-4 rounded-xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)]">
                          <p className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest mb-1">Airline</p>
                          <p className="font-bold text-[oklch(0.15_0.05_200)]">{formData.airline}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)]">
                          <p className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest mb-1">Flight</p>
                          <p className="font-bold text-[oklch(0.15_0.05_200)]">{formData.flight_number}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)]">
                          <p className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest mb-1">Station</p>
                          <p className="font-bold text-[oklch(0.15_0.05_200)]">{stations.find(s => s.id === formData.station_id)?.code || '-'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)]">
                          <p className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest mb-1">Date</p>
                          <p className="font-bold text-[oklch(0.15_0.05_200)]">{formData.incident_date}</p>
                        </div>
                        <div className="col-span-2 p-4 rounded-xl bg-white border border-[oklch(0.15_0.02_200_/_0.05)]">
                          <p className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest mb-1">Category</p>
                          <p className="font-bold text-[oklch(0.15_0.05_200)]">{formData.area} - {formData.area_category}</p>
                        </div>
                      </div>
                    </div>
                  </div>
	                </WizardStep>
	              </>
	            )}
	              </div>

              {/* Modal Footer */}
              <div className="p-6 md:p-8 border-t border-[oklch(0.15_0.02_200_/_0.05)] relative z-10 bg-white/50 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[oklch(0.15_0.02_200_/_0.4)] uppercase tracking-widest">Step</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div
                          key={s}
                          className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                            step >= s ? 'bg-emerald-600' : 'bg-[oklch(0.15_0.02_200_/_0.1)]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {step > 1 && (
                      <PrismButton
                        onClick={prevStep}
                        className="bg-white text-[oklch(0.15_0.05_200)] px-6 py-3 rounded-2xl text-sm font-bold border border-[oklch(0.15_0.02_200_/_0.1)] hover:border-emerald-500/30 transition-all shadow-spatial-sm"
                      >
                        <ChevronLeft size={16} className="mr-1" />
                        Back
                      </PrismButton>
                    )}
                    {step < 5 ? (
                      <PrismButton
                        onClick={nextStep}
                        disabled={!isStepValid()}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-spatial-sm active:scale-95 transition-all"
                      >
                        Next
                        <ChevronRight size={16} className="ml-1" />
                      </PrismButton>
                    ) : (
                      <PrismButton
                        onClick={(e) => handleSubmit(e)}
                        disabled={!isStepValid() || loading}
                        className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-spatial-sm active:scale-95 transition-all flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Submit Report
                          </>
                        )}
                      </PrismButton>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingProtectedCategory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={closePasswordPrompt}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-spatial-xl border border-[oklch(0.15_0.02_200_/_0.08)] p-8"
            >
              <h3 className="text-xl font-display font-black text-[oklch(0.15_0.05_200)] mb-2">
                Password Required
              </h3>
              <p className="text-[oklch(0.40_0.02_200)] text-sm mb-6">
                Masukkan password untuk mengakses {pendingProtectedCategory.title}
              </p>
              <div className="space-y-4">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-5 py-4 rounded-2xl bg-[oklch(0.15_0.02_200_/_0.02)] border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 outline-none transition-all text-[oklch(0.15_0.05_200)] font-bold shadow-spatial-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitPassword();
                    }
                  }}
                />
                {passwordError && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {passwordError}
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <PrismButton
                  onClick={closePasswordPrompt}
                  className="flex-1 bg-white text-[oklch(0.15_0.05_200)] px-6 py-3 rounded-2xl text-sm font-bold border border-[oklch(0.15_0.02_200_/_0.1)] hover:border-red-500/30 transition-all"
                >
                  Cancel
                </PrismButton>
                <PrismButton
                  onClick={submitPassword}
                  disabled={!passwordInput || loading}
                  className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-spatial-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                    </>
                  ) : (
                    'Access'
                  )}
                </PrismButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
