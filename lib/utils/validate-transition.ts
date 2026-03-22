import { REPORT_STATUS, type ReportStatus } from '@/lib/constants/report-status';
import type { UserRole } from '@/types';

/**
 * Status transition rules per role
 * Only ANALYST and SUPER_ADMIN can change statuses
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
 * Action to Status mapping
 */
export const ACTION_TO_STATUS: Record<string, ReportStatus> = {
    update_progress: 'ON PROGRESS',
    close: 'CLOSED',
    reopen: 'OPEN',
};

interface ValidationResult {
    valid: boolean;
    error?: string;
    newStatus?: ReportStatus;
}

/**
 * Validate if a status transition is allowed
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
 * Get timestamp field name for a status transition
 */
export function getTimestampFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_at',
        CLOSED: 'resolved_at',
    };
    return fieldMap[status] || null;
}

/**
 * Get user field name for a status transition
 */
export function getUserFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_by',
        CLOSED: 'resolved_by',
    };
    return fieldMap[status] || null;
}
