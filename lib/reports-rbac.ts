import 'server-only';
import type { Report } from '@/types';

// Shared with app/api/reports/warm/route.ts's original scoping logic.
// SUPER_ADMIN/ANALYST see everything; STAFF_CABANG-tier roles see only their
// own submissions; MANAGER_CABANG is scoped to their station; DIVISI_*/PARTNER_*
// are scoped to their division.
export function applyReportsRbacFilter(
    reports: Report[],
    role: string,
    userId: string,
    stationId: string | null,
    email: string
): Report[] {
    const normalizedRole = role.trim().toUpperCase();

    if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ANALYST') {
        return reports;
    }

    if (normalizedRole === 'STAFF_CABANG' || normalizedRole === 'CABANG' || normalizedRole === 'EMPLOYEE') {
        return reports.filter((r) =>
            r.user_id === userId ||
            (email && String(r.reporter_email || '').toLowerCase() === email)
        );
    }

    if (normalizedRole === 'MANAGER_CABANG' && stationId) {
        return reports.filter((r) => r.station_id === stationId || r.branch === stationId);
    }

    if (normalizedRole.startsWith('DIVISI_') || normalizedRole.startsWith('PARTNER_')) {
        const division = normalizedRole.split('_').slice(1).join('_');
        return reports.filter((r) => r.target_division === division);
    }

    return [];
}
