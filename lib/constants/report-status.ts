/**
 * @file
 * 
 * File ini berisi konstanta status laporan dan fungsi terkait untuk
 * manajemen lifecycle, SLA, dan transisi status laporan
 */

/**
 * Report Status Constants
 * Simplified 3-status lifecycle system
 */

import {
    AlertTriangle,
    AlertCircle,
    Shield,
    CheckCircle2,
    Clock,
    LucideIcon
} from 'lucide-react';

/**
 * Konstanta status laporan yang tersedia
 */
export const REPORT_STATUS = {
    OPEN: 'OPEN',
    'ON PROGRESS': 'ON PROGRESS',
    CLOSED: 'CLOSED',
} as const;

/**
 * Tipe data status laporan
 */
export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

/**
 * Konfigurasi status untuk tampilan UI
 */
export const STATUS_CONFIG: Record<ReportStatus, {
    /** Label tampilan status */
    label: string;
    /** Warna utama */
    color: string;
    /** Warna background transparan */
    bgColor: string;
    /** Icon komponen Lucide */
    icon: LucideIcon;
    /** Deskripsi status */
    description: string;
    /** Class CSS background untuk Tailwind */
    bgClass?: string;
    /** Class CSS teks untuk Tailwind */
    textClass?: string;
    /** Class CSS border untuk Tailwind */
    borderClass?: string;
}> = {
    OPEN: {
        label: 'Open',
        color: 'oklch(0.65 0.20 240)',     // Blue
        bgColor: 'oklch(0.65 0.20 240 / 0.1)',
        icon: AlertCircle,
        description: 'New or open report',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
    },
    'ON PROGRESS': {
        label: 'On Progress',
        color: 'oklch(0.65 0.18 85)',      // Amber
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        icon: Clock,
        description: 'Being handled by analyst',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
    },
    CLOSED: {
        label: 'Closed',
        color: 'oklch(0.55 0.18 145)',     // Green
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        icon: CheckCircle2,
        description: 'Case has been resolved',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        borderClass: 'border-green-200',
    },
};

/**
 * Priority levels for SLA calculation
 */
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Konfigurasi prioritas laporan dengan SLA
 */
export const PRIORITY_CONFIG: Record<ReportPriority, {
    /** Label lengkap dalam Bahasa Indonesia */
    label: string;
    /** Label pendek dalam Bahasa Inggris */
    labelShort: string;
    /** Warna prioritas */
    color: string;
    /** Warna background transparan */
    bgColor: string;
    /** SLA dalam jam */
    slaHours: number;
    /** Deskripsi prioritas */
    description: string;
}> = {
    low: {
        label: 'Low',
        labelShort: 'Low',
        color: 'oklch(0.55 0.18 145)',
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        slaHours: 168,
        description: 'Non-urgent, standard handling',
    },
    medium: {
        label: 'Medium',
        labelShort: 'Med',
        color: 'oklch(0.65 0.18 85)',
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        slaHours: 72,
        description: 'Requires attention within 3 days',
    },
    high: {
        label: 'High',
        labelShort: 'High',
        color: 'oklch(0.60 0.18 45)',
        bgColor: 'oklch(0.60 0.18 45 / 0.1)',
        slaHours: 24,
        description: 'Urgent action required within 24 hours',
    },
    urgent: {
        label: 'Critical',
        labelShort: 'URGENT',
        color: 'oklch(0.55 0.22 25)',
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        slaHours: 4,
        description: 'Critical - immediate response required',
    },
};

/**
 * @deprecated Legacy config for backward compatibility.
 */
export const SEVERITY_CONFIG = {
    'CRITICAL': { label: 'CRITICAL', color: 'oklch(0.55 0.22 25)', bg: 'oklch(0.55 0.22 25 / 0.12)', icon: AlertTriangle },
    'HIGH': { label: 'HIGH', color: 'oklch(0.55 0.18 25)', bg: 'oklch(0.55 0.18 25 / 0.12)', icon: AlertTriangle },
    'MEDIUM': { label: 'MEDIUM', color: 'oklch(0.70 0.14 75)', bg: 'oklch(0.70 0.14 75 / 0.12)', icon: AlertCircle },
    'LOW': { label: 'LOW', color: 'oklch(0.55 0.14 160)', bg: 'oklch(0.55 0.14 160 / 0.12)', icon: Shield },
    // Aliases for backward compatibility
    'HIGH RISK': { label: 'HIGH RISK', color: 'oklch(0.58 0.2 35)', bg: 'oklch(0.58 0.2 35 / 0.12)', icon: AlertTriangle },
    'TOP RISK': { label: 'CRITICAL', color: 'oklch(0.55 0.22 25)', bg: 'oklch(0.55 0.22 25 / 0.12)', icon: AlertTriangle },
};

export type SeverityLevel = keyof typeof SEVERITY_CONFIG;

export function normalizeSeverityLevel(value: unknown): string {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw || raw === '-' || raw === '#N/A' || raw === 'N/A' || raw === 'NULL' || raw === 'UNDEFINED') return '';

    if (raw === 'CRITICAL' || raw === 'URGENT' || raw === 'TOP RISK') return 'TOP RISK';
    if (raw === 'HIGH RISK') return 'HIGH RISK';
    if (raw === 'HIGH') return 'HIGH';
    if (raw === 'MEDIUM') return 'MEDIUM';
    if (raw === 'LOW') return 'LOW';

    return raw;
}

export function isHighSeverityLevel(value: unknown): boolean {
    const normalized = normalizeSeverityLevel(value);
    return normalized === 'TOP RISK' || normalized === 'HIGH RISK' || normalized === 'HIGH' || normalized === 'CRITICAL';
}

export function getSeverityConfig(level: unknown) {
    const normalized = normalizeSeverityLevel(level);
    if (!normalized) return SEVERITY_CONFIG.LOW;
    return SEVERITY_CONFIG[normalized as SeverityLevel] || SEVERITY_CONFIG.LOW;
}

/**
 * Calculate SLA deadline from creation time and priority
 * 
 * @param createdAt - Tanggal pembuatan laporan (Date object atau string)
 * @param priority - Prioritas laporan
 * @returns Tanggal deadline SLA
 */
export function calculateSlaDeadline(createdAt: Date | string, priority: ReportPriority): Date {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const slaHours = PRIORITY_CONFIG[priority].slaHours;
    return new Date(created.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Get SLA status (remaining time or breach)
 * 
 * @param slaDeadline - Tanggal deadline SLA
 * @returns Object status SLA dengan isBreached, remainingMs, dan remainingText
 */
export function getSlaStatus(slaDeadline: Date | string | null): {
    /** Apakah SLA sudah terlewati */
    isBreached: boolean;
    /** Sisa waktu dalam milidetik (negatif jika sudah lewat) */
    remainingMs: number;
    /** Teks sisa waktu yang diformat */
    remainingText: string;
} {
    if (!slaDeadline) {
        return { isBreached: false, remainingMs: 0, remainingText: '-' };
    }

    const deadline = typeof slaDeadline === 'string' ? new Date(slaDeadline) : slaDeadline;
    const now = new Date();
    const remainingMs = deadline.getTime() - now.getTime();
    const isBreached = remainingMs < 0;

    const absMs = Math.abs(remainingMs);
    const hours = Math.floor(absMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    let remainingText: string;
    if (days > 0) {
        remainingText = `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        remainingText = `${hours}h`;
    } else {
        const minutes = Math.floor(absMs / (1000 * 60));
        remainingText = `${minutes}m`;
    }

    return {
        isBreached,
        remainingMs,
        remainingText: isBreached ? `Overdue ${remainingText}` : remainingText,
    };
}

/**
 * Normalize system status strings to canonical ReportStatus
 * 
 * @param status - String status dalam format apa saja
 * @returns Status kanonik (OPEN, ON PROGRESS, atau CLOSED)
 */
export function normalizeStatus(status: unknown): ReportStatus {
    if (!status) return 'OPEN';
    
    // Convert to upper case and replace spaces/underscores
    const s = String(status).trim().toUpperCase().replace(/\s+/g, '_');
    
    // Map of variations to canonical statuses
    if ([
        'OPEN', 
        'BARU', 
        'NEW', 
        'BARU/NEW', 
        'MENUNGGU_FEEDBACK', 
        'UNASSIGNED',
        'ACTIVE'
    ].includes(s)) {
        return 'OPEN';
    }
    
    if ([
        'ON_PROGRESS', 
        'ONPROGRESS', 
        'SUDAH_DIVERIFIKASI', 
        'DIVERIFIKASI',
        'DIKONFIRMASI',
        'PROGRESS'
    ].includes(s)) {
        return 'ON PROGRESS';
    }
    
    if ([
        'CLOSED', 
        'SELESAI', 
        'NON_ACTIVE'
    ].includes(s)) {
        return 'CLOSED';
    }
    
    return 'OPEN'; // Default fallback
}

/**
 * Get allowed status transitions based on current status and user role
 * Only ANALYST can change statuses
 * 
 * @param currentStatus - Status saat ini
 * @param userRole - Role pengguna
 * @returns Array status yang diizinkan untuk transisi
 */
export function getAllowedTransitions(
    currentStatus: string | ReportStatus,
    userRole: string
): ReportStatus[] {
    const isAnalyst = userRole === 'ANALYST' || userRole === 'SUPER_ADMIN';

    if (!isAnalyst) return [];

    const normalized = normalizeStatus(currentStatus);

    switch (normalized) {
        case 'OPEN':
            return ['ON PROGRESS', 'CLOSED'];

        case 'ON PROGRESS':
            return ['CLOSED'];

        case 'CLOSED':
            return ['OPEN']; // Reopen

        default:
            return [];
    }
}

/**
 * Check if user can perform specific action on report
 * Analyst controls ALL status changes. Other roles can only view and comment.
 * 
 * @param action - Tipe aksi yang ingin dilakukan
 * @param currentStatus - Status saat ini
 * @param userRole - Role pengguna
 * @returns Boolean true jika aksi diizinkan, false jika tidak
 */
export function canPerformAction(
    action: 'update_progress' | 'close' | 'reopen' | 'comment',
    currentStatus: string | ReportStatus,
    userRole: string
): boolean {
    const isAnalyst = userRole === 'ANALYST' || userRole === 'SUPER_ADMIN';
    const normalized = normalizeStatus(currentStatus);

    switch (action) {
        case 'update_progress':
            return isAnalyst && normalized === 'OPEN';

        case 'close':
            return isAnalyst && (normalized === 'OPEN' || normalized === 'ON PROGRESS');

        case 'reopen':
            return isAnalyst && normalized === 'CLOSED';

        case 'comment':
            return true; // Everyone can comment

        default:
            return false;
    }
}
