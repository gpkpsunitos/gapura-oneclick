/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utilitas untuk autentikasi dan otorisasi workspace user
 */

import 'server-only';

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Data user workspace
 * @interface WorkspaceUser
 */
export interface WorkspaceUser {
    /** ID user */
    id: string;
    /** Email user */
    email: string;
    /** Role user */
    role: string;
    /** Divisi user */
    division?: string | null;
    /** Nama lengkap */
    full_name?: string | null;
    /** ID stasiun */
    station_id?: string | null;
    /** Kode stasiun */
    station_code?: string | null;
    /** Nama stasiun */
    station_name?: string | null;
}

/** Role cabang */
export const BRANCH_ROLES = ['MANAGER_CABANG', 'STAFF_CABANG', 'CABANG', 'EMPLOYEE'] as const;
/** Role HC manager */
export const HC_MANAGER_ROLES = ['SUPER_ADMIN', 'ANALYST', 'DIVISI_HC', 'PARTNER_HC'] as const;

/**
 * Menormalisasi role ke format uppercase
 * @param role - Role yang akan dinormalisasi
 * @returns Role dalam format uppercase
 * @example
 * ```ts
 * const normalized = normalizeRole('manager_cabang');
 * // returns: 'MANAGER_CABANG'
 * ```
 */
export function normalizeRole(role: string | null | undefined): string {
    return String(role || '').trim().toUpperCase();
}

/**
 * Mengecek apakah role adalah role cabang
 * @param role - Role yang akan dicek
 * @returns true jika role adalah role cabang
 * @example
 * ```ts
 * if (isBranchRole(userRole)) {
 *   // Handle branch user
 * }
 * ```
 */
export function isBranchRole(role: string | null | undefined): boolean {
    return BRANCH_ROLES.includes(normalizeRole(role) as any);
}

/**
 * Mengecek apakah user dapat mengelola workspace HC
 * @param role - Role yang akan dicek
 * @returns true jika role dapat mengelola workspace HC
 * @example
 * ```ts
 * if (canManageHCWorkspace(userRole)) {
 *   // Tampilkan menu HC
 * }
 * ```
 */
export function canManageHCWorkspace(role: string | null | undefined): boolean {
    return HC_MANAGER_ROLES.includes(normalizeRole(role) as any);
}

/**
 * Mengecek apakah role adalah manager cabang
 * @param role - Role yang akan dicek
 * @returns true jika role adalah MANAGER_CABANG
 * @example
 * ```ts
 * if (isBranchManager(userRole)) {
 *   // Berikan akses penuh station
 * }
 * ```
 */
export function isBranchManager(role: string | null | undefined): boolean {
    return normalizeRole(role) === 'MANAGER_CABANG';
}

/**
 * Mengecek apakah user dapat mengelola dokumen divisi
 * @param role - Role yang akan dicek
 * @param division - Divisi yang akan dicek ('HC' atau 'HT')
 * @returns true jika role dapat mengelola dokumen divisi tersebut
 * @example
 * ```ts
 * if (canManageDivisionDocuments(userRole, 'HC')) {
 *   // Tampilkan menu dokumen HC
 * }
 * ```
 */
export function canManageDivisionDocuments(role: string | null | undefined, division: 'HC' | 'HT'): boolean {
    const normalized = normalizeRole(role);
    if (normalized === 'SUPER_ADMIN' || normalized === 'ANALYST') return true;
    return normalized === `DIVISI_${division}` || normalized === `PARTNER_${division}`;
}

/**
 * Mengambil data workspace user dari session
 * @returns Promise yang berisi data workspace user atau null
 * @example
 * ```ts
 * const user = await getWorkspaceUser();
 * if (user) {
 *   console.log(`Welcome, ${user.email}`);
 * }
 * ```
 */
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
