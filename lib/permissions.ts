
import { UserRole, DivisionType } from '@/types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
    STAFF_CABANG: 1,
    MANAGER_CABANG: 2,
    DIVISI_OCS: 2,
    DIVISI_OS: 2,
    DIVISI_OP: 2,
    DIVISI_OT: 2,
    DIVISI_UQ: 2,
    DIVISI_HC: 2,
    DIVISI_HT: 2,
    DIVISI_ESKALASI: 3,
    ANALYST: 3,
    SUPER_ADMIN: 4,
};

export const canExportData = (role: UserRole): boolean =>
    role === 'DIVISI_OCS' || role === 'DIVISI_OS' || role === 'DIVISI_ESKALASI' || role === 'ANALYST' || role === 'SUPER_ADMIN';

export const canAccessAdminDashboard = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

export const canExecuteReport = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

export const canCloseCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

export const canReopenCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

export const canManageUsers = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

export const canManageMasterData = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

export const canViewAuditLogs = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

export const canCreateReport = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' ||
    role === 'STAFF_CABANG' ||
    role === 'ANALYST' ||
    role === 'SUPER_ADMIN' ||
    role === 'DIVISI_OCS' ||
    role === 'DIVISI_OS';

export const hasGlobalAccess = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

export const getLoginRedirectPath = (role: UserRole): string => {
    if (role === 'MANAGER_CABANG') {
        return '/dashboard/manager';
    }
    if (role === 'STAFF_CABANG') {
        return '/dashboard/employee';
    }
    if (
        role === 'DIVISI_ESKALASI' ||
        role === 'DIVISI_OCS' ||
        role === 'DIVISI_OS' ||
        role === 'DIVISI_OP' ||
        role === 'DIVISI_OT' ||
        role === 'DIVISI_UQ' ||
        role === 'DIVISI_HT'
    ) {
        return '/dashboard/eskalasi/select';
    }
    return '/dashboard/admin';
};

export const canViewAllStationReports = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || ROLE_HIERARCHY[role] >= 3;

export const canEditReport = (
    role: UserRole,
    userId: string,
    reportUserId: string,
    userStationId?: string,
    reportStationId?: string
): boolean => {

    if (role === 'ANALYST' || role === 'SUPER_ADMIN') return true;

    if (role.startsWith('DIVISI_')) return true;

    if (role === 'MANAGER_CABANG' && userStationId && userStationId === reportStationId) return true;

    if (role === 'STAFF_CABANG' && userId === reportUserId) return true;

    return false;
};

export const canExportBranchData = (role: UserRole): boolean =>
    role === 'MANAGER_CABANG' || canExportData(role);

export const canApproveStaff = (
    role: UserRole,
    userStationId?: string,
    staffStationId?: string
): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    if (role === 'MANAGER_CABANG' && userStationId && userStationId === staffStationId) return true;
    return false;
};

export const isRestrictedToOwnReports = (role: UserRole): boolean =>
    role === 'STAFF_CABANG';

export const DIVISION_LABELS: Record<DivisionType, string> = {
    GENERAL: 'Umum',
    OCS: 'Operational Customer Service',
    OS: 'Customer Service',
    OP: 'Operasi',
    OT: 'Operasi (OT)',
    UQ: 'Operasi (UQ)',
    HC: 'Human Capital',
    HT: 'Human Training',
};

export const ROLE_LABELS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager Cabang',
    STAFF_CABANG: 'Staff Cabang',
    DIVISI_OCS: 'Divisi OCS',
    DIVISI_OS: 'Divisi OS',
    DIVISI_OP: 'Divisi OP',
    DIVISI_OT: 'Divisi OT',
    DIVISI_UQ: 'Divisi UQ',
    DIVISI_HC: 'Divisi HC',
    DIVISI_HT: 'Divisi HT',
    DIVISI_ESKALASI: 'Divisi Eskalasi',
    ANALYST: 'Analyst',
    SUPER_ADMIN: 'Super Admin',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    MANAGER_CABANG: 'Manager/Supervisor cabang (@gapura.id). Akses penuh station, approve staff, export data.',
    STAFF_CABANG: 'Staff cabang (non-@gapura.id). Hanya lihat laporan sendiri, perlu approval manager.',
    DIVISI_OCS: 'Divisi Operational Customer Service. Customer service monitoring, export data, monitoring global.',
    DIVISI_OS: 'Divisi OS. Salinan independen dari workspace OCS.',
    DIVISI_OP: 'Divisi Operasi. Eksekutor laporan terkait operasional, GSE, safety, dan quality.',
    DIVISI_OT: 'Divisi OT. Eksekutor laporan operasional (UI sama dengan OP).',
    DIVISI_UQ: 'Divisi UQ. Eksekutor laporan operasional (UI sama dengan OP).',
    DIVISI_HC: 'Divisi Human Capital (legacy role tanpa workspace khusus).',
    DIVISI_HT: 'Divisi Human Training. Eksekutor laporan terkait pelatihan.',
    DIVISI_ESKALASI: 'Pusat Eskalasi. Akses view semua laporan divisi, export data.',
    ANALYST: 'Kepala divisi. Akses global + export data.',
    SUPER_ADMIN: 'Full access. Kelola user dan master data.',
};
