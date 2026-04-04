/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi validasi untuk transisi status laporan dan pengguna
 */

import { REPORT_STATUS, type ReportStatus } from '@/lib/constants/report-status';
import type { UserRole } from '@/types';

/**
 * Aturan transisi status per role
 * Hanya ANALYST dan SUPER_ADMIN yang dapat mengubah status
 */
const TRANSITION_RULES: Partial<Record<ReportStatus, Partial<Record<UserRole, ReportStatus[]>>>> = {
    OPEN: {
        ANALYST: ['ON PROGRESS', 'CLOSED'],
        SUPER_ADMIN: ['ON PROGRESS', 'CLOSED'],
    },
    'ON PROGRESS': {
        ANALYST: ['CLOSED'],
        SUPER_ADMIN: ['CLOSED'],
    },
    CLOSED: {
        ANALYST: ['OPEN'],     // Reopen
        SUPER_ADMIN: ['OPEN'], // Reopen
    },
};

/**
 * Pemetaan aksi ke status
 */
export const ACTION_TO_STATUS: Record<string, ReportStatus> = {
    update_progress: 'ON PROGRESS',
    close: 'CLOSED',
    reopen: 'OPEN',
};

/**
 * Hasil validasi transisi status
 */
interface ValidationResult {
    valid: boolean;
    error?: string;
    newStatus?: ReportStatus;
}

/**
 * Memvalidasi apakah transisi status diizinkan
 * @param {string} currentStatus - Status saat ini
 * @param {string} action - Aksi yang akan dilakukan
 * @param {string} userRole - Role pengguna
 * @returns {ValidationResult} Hasil validasi dengan status baru jika valid
 * @example
 * ```ts
 * const result = validateStatusTransition('OPEN', 'update_progress', 'ANALYST');
 * if (result.valid) {
 *   console.log('New status:', result.newStatus); // 'ON PROGRESS'
 * }
 * ```
 */
export function validateStatusTransition(
    currentStatus: string,
    action: string,
    userRole: string
): ValidationResult {
    const targetStatus = ACTION_TO_STATUS[action];
    if (!targetStatus) {
        return {
            valid: false,
            error: `Invalid action: ${action}. Allowed: ${Object.keys(ACTION_TO_STATUS).join(', ')}`
        };
    }

    if (!Object.values(REPORT_STATUS).includes(currentStatus as ReportStatus)) {
        return {
            valid: false,
            error: `Invalid current status: ${currentStatus}`
        };
    }

    const allowedForRole = TRANSITION_RULES[currentStatus as ReportStatus]?.[userRole as UserRole];

    if (!allowedForRole || allowedForRole.length === 0) {
        return {
            valid: false,
            error: `Role ${userRole} cannot perform any actions on status ${currentStatus}`
        };
    }

    if (!allowedForRole.includes(targetStatus)) {
        return {
            valid: false,
            error: `Cannot transition from ${currentStatus} to ${targetStatus} with role ${userRole}. Allowed: ${allowedForRole.join(', ')}`
        };
    }

    return { valid: true, newStatus: targetStatus };
}

/**
 * Mendapatkan nama field timestamp untuk transisi status
 * @param {ReportStatus} status - Status target
 * @returns {string | null} Nama field timestamp atau null jika tidak ada
 * @example
 * ```ts
 * getTimestampFieldForStatus('ON PROGRESS'); // 'validated_at'
 * getTimestampFieldForStatus('CLOSED'); // 'resolved_at'
 * ```
 */
export function getTimestampFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_at',
        CLOSED: 'resolved_at',
    };
    return fieldMap[status] || null;
}

/**
 * Mendapatkan nama field user untuk transisi status
 * @param {ReportStatus} status - Status target
 * @returns {string | null} Nama field user atau null jika tidak ada
 * @example
 * ```ts
 * getUserFieldForStatus('ON PROGRESS'); // 'validated_by'
 * getUserFieldForStatus('CLOSED'); // 'resolved_by'
 * ```
 */
export function getUserFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_by',
        CLOSED: 'resolved_by',
    };
    return fieldMap[status] || null;
}
