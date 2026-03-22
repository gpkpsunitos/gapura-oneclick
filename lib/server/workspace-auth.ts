import 'server-only';

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface WorkspaceUser {
    id: string;
    email: string;
    role: string;
    division?: string | null;
    full_name?: string | null;
    station_id?: string | null;
    station_code?: string | null;
    station_name?: string | null;
}

export const BRANCH_ROLES = ['MANAGER_CABANG', 'STAFF_CABANG', 'CABANG', 'EMPLOYEE'] as const;
export const HC_MANAGER_ROLES = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'] as const;

export function normalizeRole(role: string | null | undefined): string {
    return String(role || '').trim().toUpperCase();
}

export function isBranchRole(role: string | null | undefined): boolean {
    return BRANCH_ROLES.includes(normalizeRole(role) as any);
}

export function canManageHCWorkspace(role: string | null | undefined): boolean {
    return HC_MANAGER_ROLES.includes(normalizeRole(role) as any);
}

export function canManageDivisionDocuments(role: string | null | undefined, division: 'HC' | 'HT'): boolean {
    const normalized = normalizeRole(role);
    if (normalized === 'SUPER_ADMIN' || normalized === 'ANALYST') return true;
    return normalized === `DIVISI_${division}` || normalized === `PARTNER_${division}`;
}

export async function getWorkspaceUser(): Promise<WorkspaceUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload) return null;

    const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select(`
            id,
            email,
            role,
            division,
            full_name,
            station_id,
            stations:station_id (
                id,
                code,
                name
            )
        `)
        .eq('id', payload.id)
        .single();

    if (error || !userData) {
        return {
            id: String(payload.id),
            email: String(payload.email || ''),
            role: normalizeRole(String(payload.role || '')),
            division: payload.division || null,
            full_name: payload.full_name || null,
            station_id: null,
            station_code: null,
            station_name: null,
        };
    }

    const station = Array.isArray((userData as any).stations)
        ? (userData as any).stations[0]
        : (userData as any).stations;

    return {
        id: String(userData.id),
        email: String(userData.email || ''),
        role: normalizeRole(String(userData.role || payload.role || '')),
        division: userData.division || payload.division || null,
        full_name: userData.full_name || payload.full_name || null,
        station_id: userData.station_id || null,
        station_code: station?.code || null,
        station_name: station?.name || null,
    };
}
