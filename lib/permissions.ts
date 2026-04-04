/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk kontrol akses berbasis role (RBAC)
 */

import { UserRole, DivisionType } from '@/types';

// ==========================================
// RBAC Permission Utilities
// ==========================================

/**
 * Hirarki level role (semakin tinggi = semakin banyak akses)
 * @constant ROLE_HIERARCHY
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
 * Mengecek apakah user dapat mengekspor data (Excel/PDF)
 * DIVISI_OS, ANALYST, dan SUPER_ADMIN sesuai requirement
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin ekspor
 * @example
 * ```ts
 * if (canExportData(userRole)) {
 *   renderExportButton();
 * }
 * ```
 */
export const canExportData = (role: UserRole): boolean =>
    role === 'DIVISI_OS' || role === 'DIVISI_ESKALASI' || role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat mengakses dashboard admin
 * Semua role kecuali CABANG
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin akses admin
 * @example
 * ```ts
 * if (canAccessAdminDashboard(userRole)) {
 *   router.push('/dashboard/admin');
 * }
 * ```
 */
export const canAccessAdminDashboard = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Mengecek apakah user dapat mengeksekusi/update status laporan
 * Hanya ANALYST dan SUPER_ADMIN yang dapat mengubah status
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin eksekusi laporan
 * @example
 * ```ts
 * if (canExecuteReport(userRole)) {
 *   showStatusControls();
 * }
 * ```
 */
export const canExecuteReport = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat menutup case (mark sebagai CLOSED)
 * Hanya ANALYST dan SUPER_ADMIN
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin menutup case
 * @example
 * ```ts
 * if (canCloseCase(userRole)) {
 *   showCloseButton();
 * }
 * ```
 */
export const canCloseCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat membuka kembali case (CLOSED → OPEN)
 * Hanya ANALYST dan SUPER_ADMIN
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin membuka case
 * @example
 * ```ts
 * if (canReopenCase(userRole)) {
 *   showReopenButton();
 * }
 * ```
 */
export const canReopenCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat mengelola user (approve/reject/edit)
 * Hanya SUPER_ADMIN
 * @param role - Role user yang akan dicek
 * @returns true jika role adalah SUPER_ADMIN
 * @example
 * ```ts
 * if (canManageUsers(userRole)) {
 *   renderUserManagement();
 * }
 * ```
 */
export const canManageUsers = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat mengelola master data (stations, categories)
 * Hanya SUPER_ADMIN
 * @param role - Role user yang akan dicek
 * @returns true jika role adalah SUPER_ADMIN
 * @example
 * ```ts
 * if (canManageMasterData(userRole)) {
 *   renderMasterDataManagement();
 * }
 * ```
 */
export const canManageMasterData = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat melihat audit logs
 * Hanya SUPER_ADMIN
 * @param role - Role user yang akan dicek
 * @returns true jika role adalah SUPER_ADMIN
 * @example
 * ```ts
 * if (canViewAuditLogs(userRole)) {
 *   renderAuditLogs();
 * }
 * ```
 */
export const canViewAuditLogs = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Mengecek apakah user dapat membuat laporan
 * MANAGER_CABANG dan STAFF_CABANG (station-scoped), ANALYST (HQ reports), SUPER_ADMIN, DIVISI_OS
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin membuat laporan
 * @example
 * ```ts
 * if (canCreateReport(userRole)) {
 *   renderCreateReportButton();
 * }
 * ```
 */
export const canCreateReport = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' ||
    role === 'STAFF_CABANG' ||
    role === 'ANALYST' ||
    role === 'SUPER_ADMIN' ||
    role === 'DIVISI_OS';

/**
 * Mengecek apakah user memiliki akses data global (semua stasiun)
 * Semua role kecuali MANAGER_CABANG dan STAFF_CABANG
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki akses global
 * @example
 * ```ts
 * if (hasGlobalAccess(userRole)) {
 *   fetchAllReports();
 * } else {
 *   fetchStationReports();
 * }
 * ```
 */
export const hasGlobalAccess = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Mendapatkan path redirect setelah login berdasarkan role
 * @param role - Role user
 * @returns Path untuk redirect
 * @example
 * ```ts
 * const redirectPath = getLoginRedirectPath(userRole);
 * router.push(redirectPath);
 * ```
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
 * Mengecek apakah user dapat melihat semua laporan dari stasiunnya
 * MANAGER_CABANG dapat melihat semua laporan stasiun
 * @param role - Role user yang akan dicek
 * @returns true jika role dapat melihat semua laporan stasiun
 * @example
 * ```ts
 * if (canViewAllStationReports(userRole)) {
 *   fetchAllStationReports();
 * }
 * ```
 */
export const canViewAllStationReports = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || ROLE_HIERARCHY[role] >= 3;

/**
 * Mengecek apakah user dapat mengedit laporan tertentu
 * MANAGER_CABANG dapat mengedit semua laporan stasiun, STAFF_CABANG hanya laporan sendiri
 * @param role - Role user yang akan dicek
 * @param userId - ID user
 * @param reportUserId - ID user pembuat laporan
 * @param userStationId - ID stasiun user (opsional)
 * @param reportStationId - ID stasiun laporan (opsional)
 * @returns true jika user dapat mengedit laporan
 * @example
 * ```ts
 * if (canEditReport(userRole, userId, reportUserId, userStationId, reportStationId)) {
 *   showEditButton();
 * }
 * ```
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
 * Mengecek apakah user dapat mengekspor data cabang (Excel/PDF)
 * MANAGER_CABANG dapat mengekspor, STAFF_CABANG tidak
 * @param role - Role user yang akan dicek
 * @returns true jika role memiliki izin ekspor data cabang
 * @example
 * ```ts
 * if (canExportBranchData(userRole)) {
 *   renderExportButton();
 * }
 * ```
 */
export const canExportBranchData = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || canExportData(role);

/**
 * Mengecek apakah user dapat menyetujui registrasi staff
 * MANAGER_CABANG dapat menyetujui staff dari stasiun yang sama
 * @param role - Role user yang akan dicek
 * @param userStationId - ID stasiun user (opsional)
 * @param staffStationId - ID stasiun staff (opsional)
 * @returns true jika user dapat menyetujui staff
 * @example
 * ```ts
 * if (canApproveStaff(userRole, userStationId, staffStationId)) {
 *   showApproveButton();
 * }
 * ```
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
 * Mengecek apakah user hanya dapat melihat laporan sendiri
 * Hanya STAFF_CABANG yang terbatas ke laporan sendiri
 * @param role - Role user yang akan dicek
 * @returns true jika role terbatas ke laporan sendiri
 * @example
 * ```ts
 * if (isRestrictedToOwnReports(userRole)) {
 *   fetchOwnReports();
 * } else {
 *   fetchAllReports();
 * }
 * ```
 */
export const isRestrictedToOwnReports = (role: UserRole): boolean =>
    role === 'STAFF_CABANG';

/**
 * Label divisi untuk tampilan UI
 * @constant DIVISION_LABELS
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
 * Label role untuk tampilan UI
 * @constant ROLE_LABELS
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
 * Deskripsi role untuk tooltips/help text
 * @constant ROLE_DESCRIPTIONS
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
