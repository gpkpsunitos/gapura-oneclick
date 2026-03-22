/**
 * Report Status Constants
 * Simplified 3-status lifecycle system
 */

import {
    AlertTriangle,
    AlertCircle,
    Shield,
    CheckCircle2,
    Eye,
    Clock,
    LucideIcon
} from 'lucide-react';

export const REPORT_STATUS = {
    OPEN: 'OPEN',
    'ON PROGRESS': 'ON PROGRESS',
    CLOSED: 'CLOSED',
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

/**
 * Status configuration for UI display
 */
export const STATUS_CONFIG: Record<ReportStatus, {
    label: string;
    color: string;
    bgColor: string;
    icon: LucideIcon;
    description: string;
    bgClass?: string;
    textClass?: string;
    borderClass?: string;
}> = {
    OPEN: {
        label: 'Open',
        color: 'oklch(0.65 0.20 240)',     // Blue
        bgColor: 'oklch(0.65 0.20 240 / 0.1)',
        icon: AlertCircle,
        description: 'Laporan baru atau terbuka',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
    },
    'ON PROGRESS': {
        label: 'On Progress',
        color: 'oklch(0.65 0.18 85)',      // Amber
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        icon: Clock,
        description: 'Sedang ditangani analyst',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
    },
    CLOSED: {
        label: 'Closed',
        color: 'oklch(0.55 0.18 145)',     // Green
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        icon: CheckCircle2,
        description: 'Kasus telah diselesaikan',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        borderClass: 'border-green-200',
    },
};

/**
 * Priority levels for SLA calculation
 */
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_CONFIG: Record<ReportPriority, {
    label: string;
    labelShort: string;
    color: string;
    bgColor: string;
    slaHours: number;
    description: string;
}> = {
    low: {
        label: 'Rendah',
        labelShort: 'Low',
        color: 'oklch(0.55 0.18 145)',
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        slaHours: 168,
        description: 'Non-urgent, standard handling',
    },
    medium: {
        label: 'Sedang',
        labelShort: 'Med',
        color: 'oklch(0.65 0.18 85)',
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        slaHours: 72,
        description: 'Requires attention within 3 days',
    },
    high: {
        label: 'Tinggi',
        labelShort: 'High',
        color: 'oklch(0.60 0.18 45)',
        bgColor: 'oklch(0.60 0.18 45 / 0.1)',
        slaHours: 24,
        description: 'Urgent action required within 24 hours',
    },
    urgent: {
        label: 'Kritis',
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
    urgent: { label: 'Urgent', color: 'oklch(0.55 0.22 25)', bg: 'oklch(0.55 0.22 25 / 0.12)', icon: AlertTriangle },
    high: { label: 'High', color: 'oklch(0.55 0.18 25)', bg: 'oklch(0.55 0.18 25 / 0.12)', icon: AlertTriangle },
    medium: { label: 'Medium', color: 'oklch(0.70 0.14 75)', bg: 'oklch(0.70 0.14 75 / 0.12)', icon: AlertCircle },
    low: { label: 'Low', color: 'oklch(0.55 0.14 160)', bg: 'oklch(0.55 0.14 160 / 0.12)', icon: Shield },
};

/**
 * Calculate SLA deadline from creation time and priority
 */
export function calculateSlaDeadline(createdAt: Date | string, priority: ReportPriority): Date {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const slaHours = PRIORITY_CONFIG[priority].slaHours;
    return new Date(created.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Get SLA status (remaining time or breach)
 */
export function getSlaStatus(slaDeadline: Date | string | null): {
    isBreached: boolean;
    remainingMs: number;
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
        remainingText: isBreached ? `Lewat ${remainingText}` : remainingText,
    };
}

/**
 * Normalize system status strings to canonical ReportStatus
 */
export function normalizeStatus(status: any): ReportStatus {
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
