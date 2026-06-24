
import { REPORT_STATUS, type ReportStatus } from '@/lib/constants/report-status';
import type { UserRole } from '@/types';

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
        ANALYST: ['OPEN'],
        SUPER_ADMIN: ['OPEN'],
    },
};

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

export function getTimestampFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_at',
        CLOSED: 'resolved_at',
    };
    return fieldMap[status] || null;
}

export function getUserFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        'ON PROGRESS': 'validated_by',
        CLOSED: 'resolved_by',
    };
    return fieldMap[status] || null;
}
