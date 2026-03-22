import { UserRole, DivisionType } from '@/types';

// ==========================================
// RBAC Permission Utilities
// ==========================================

/**
 * Role hierarchy level (higher = more access)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    STAFF_CABANG: 1,
    MANAGER_CABANG: 2,
    DIVISI_OS: 2,
    DIVISI_OT: 2,
    DIVISI_OP: 2,
    DIVISI_UQ: 2,
    DIVISI_HC: 2,
    DIVISI_HT: 2,
    DIVISI_ESKALASI: 3,
    ANALYST: 3,
    SUPER_ADMIN: 4,
};

/**
 * Check if user can export data (Excel/PDF)
 * DIVISI_OS, ANALYST, and SUPER_ADMIN per requirements
 */
export const canExportData = (role: UserRole): boolean =>
    role === 'DIVISI_OS' || role === 'DIVISI_ESKALASI' || role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can access admin dashboard
 * All except CABANG
 */
export const canAccessAdminDashboard = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Check if user can execute/update report status
 * Only ANALYST and SUPER_ADMIN can change statuses
 */
export const canExecuteReport = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can close a case (mark as CLOSED)
 * Only ANALYST and SUPER_ADMIN
 */
export const canCloseCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can reopen a case (CLOSED → OPEN)
 * Only ANALYST and SUPER_ADMIN
 */
export const canReopenCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can manage users (approve/reject/edit)
 * Only SUPER_ADMIN
 */
export const canManageUsers = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can manage master data (stations, categories)
 * Only SUPER_ADMIN
 */
export const canManageMasterData = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can view audit logs
 * Only SUPER_ADMIN
 */
export const canViewAuditLogs = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can create reports
 * MANAGER_CABANG and STAFF_CABANG (station-scoped), ANALYST (HQ reports), SUPER_ADMIN, DIVISI_OS
 */
export const canCreateReport = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' ||
    role === 'STAFF_CABANG' ||
    role === 'ANALYST' ||
    role === 'SUPER_ADMIN' ||
    role === 'DIVISI_OS';

/**
 * Check if user has global data access (all stations)
 * All except MANAGER_CABANG and STAFF_CABANG
 */
export const hasGlobalAccess = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Get the redirect path after login based on role
 */
export const getLoginRedirectPath = (role: UserRole): string => {
    if (role === 'MANAGER_CABANG' || role === 'STAFF_CABANG') {
        return '/dashboard/employee';
    }
    if (role === 'DIVISI_ESKALASI') {
        return '/dashboard/eskalasi/select';
    }
    return '/dashboard/admin';
};

/**
 * Check if user can view all reports from their station
 * MANAGER_CABANG can see all station reports
 */
export const canViewAllStationReports = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || ROLE_HIERARCHY[role] >= 3;

/**
 * Check if user can edit a specific report
 * MANAGER_CABANG can edit all station reports, STAFF_CABANG only own reports
 */
export const canEditReport = (
    role: UserRole,
    userId: string,
    reportUserId: string,
    userStationId?: string,
    reportStationId?: string
): boolean => {
    // ANALYST and SUPER_ADMIN can edit any report
    if (role === 'ANALYST' || role === 'SUPER_ADMIN') return true;

    // Central division roles can edit any report
    if (role.startsWith('DIVISI_')) return true;

    // MANAGER_CABANG can edit reports from their station
    if (role === 'MANAGER_CABANG' && userStationId && userStationId === reportStationId) return true;

    // STAFF_CABANG can only edit own reports
    if (role === 'STAFF_CABANG' && userId === reportUserId) return true;

    return false;
};

/**
 * Check if user can export branch data (Excel/PDF)
 * MANAGER_CABANG can export, STAFF_CABANG cannot
 */
export const canExportBranchData = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || canExportData(role);

/**
 * Check if user can approve staff registration
 * MANAGER_CABANG can approve staff from same station
 */
export const canApproveStaff = (
    role: UserRole,
    userStationId?: string,
    staffStationId?: string
): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    if (role === 'MANAGER_CABANG' && userStationId && userStationId === staffStationId) return true;
    return false;
};

/**
 * Check if user can only view own reports
 * True for STAFF_CABANG only
 */
export const isRestrictedToOwnReports = (role: UserRole): boolean =>
    role === 'STAFF_CABANG';

/**
 * Division labels for UI display
 */
export const DIVISION_LABELS: Record<DivisionType, string> = {
    GENERAL: 'Umum',
    OS: 'Operational Services',
    OT: 'Teknik (GSE)',
    OP: 'Operasi',
    UQ: 'Quality (Safety)',
    HC: 'Human Capital',
    HT: 'Human Training',
};

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager Cabang',
    STAFF_CABANG: 'Staff Cabang',
    DIVISI_OS: 'Divisi OS',
    DIVISI_OT: 'Divisi OT',
    DIVISI_OP: 'Divisi OP',
    DIVISI_UQ: 'Divisi UQ',
    DIVISI_HC: 'Divisi HC',
    DIVISI_HT: 'Divisi HT',
    DIVISI_ESKALASI: 'Divisi Eskalasi',
    ANALYST: 'Analyst',
    SUPER_ADMIN: 'Super Admin',
};

/**
 * Role descriptions for tooltips/help text
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager/Supervisor cabang (@gapura.id). Akses penuh station, approve staff, export data.',
    STAFF_CABANG: 'Staff cabang (non-@gapura.id). Hanya lihat laporan sendiri, perlu approval manager.',
    DIVISI_OS: 'Divisi Operational Services. Full superview, export data, monitoring global.',
    DIVISI_OT: 'Divisi Teknik. Eksekutor laporan terkait GSE dan peralatan.',
    DIVISI_OP: 'Divisi Operasi. Eksekutor laporan terkait operasional.',
    DIVISI_UQ: 'Divisi Quality. Eksekutor laporan terkait safety dan quality.',
    DIVISI_HC: 'Divisi Human Capital. Mengelola data cuti, handbook, dan materi sosialisasi.',
    DIVISI_HT: 'Divisi Human Training. Eksekutor laporan terkait pelatihan.',
    DIVISI_ESKALASI: 'Pusat Eskalasi. Akses view semua laporan divisi, export data.',
    ANALYST: 'Kepala divisi. Akses global + export data.',
    SUPER_ADMIN: 'Full access. Kelola user dan master data.',
};
