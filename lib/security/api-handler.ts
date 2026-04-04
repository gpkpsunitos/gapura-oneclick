/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utility untuk menangani API response dan autentikasi pada API routes
 * Menyediakan helper functions untuk pembuatan response yang konsisten
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import type { SessionPayload } from '@/types';

/**
 * Interface untuk error response
 * Menyediakan struktur error yang konsisten untuk semua API endpoints
 */
export interface ApiError {
    /** Pesan error yang mendeskripsikan masalah */
    error: string;
    /** Kode error opsional untuk identifikasi error spesifik */
    code?: string;
    /** HTTP status code */
    status: number;
}

/**
 * Interface untuk success response
 * Menyediakan struktur success yang konsisten untuk semua API endpoints
 * 
 * @template T - Tipe data yang dikembalikan
 */
export interface ApiSuccess<T = unknown> {
    /** Flag success selalu true */
    success: true;
    /** Data yang dikembalikan */
    data: T;
    /** Metadata tambahan opsional */
    meta?: Record<string, unknown>;
}

/**
 * Type union untuk API response
 * Bisa berupa NextResponse error atau NextResponse success
 * 
 * @template T - Tipe data yang dikembalikan pada success
 */
export type ApiResponse<T = unknown> =
    | NextResponse<{ error: string; code?: string }>
    | NextResponse<ApiSuccess<T>>;

/** Type untuk context parameter di Next.js route handlers */
type RouteContext = { params: Promise<Record<string, string | string[]>> };

/**
 * Interface untuk opsi autentikasi pada route
 * Mengontrol bagaimana autentikasi diimplementasikan pada endpoint
 */
interface AuthRouteOptions {
    /** Array role yang diperbolehkan mengakses endpoint (optional) */
    requiredRoles?: string[];
    /** Mengizinkan akses tanpa autentikasi jika dalam demo mode (optional) */
    allowDemo?: boolean;
}

/**
 * Mendapatkan user session dari cookie saat ini
 * Mengembalikan null jika tidak ada session atau session invalid
 * 
 * @returns Promise yang resolve dengan SessionPayload atau null
 * 
 * @example
 * ```typescript
 * const user = await getSessionUser();
 * if (user) {
 *   console.log('User ID:', user.userId);
 * }
 * ```
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        if (!token) return null;
        return await verifySession(token);
    } catch {
        return null;
    }
}

/**
 * Memastikan user terautentikasi sebelum mengakses endpoint
 * Mengembalikan error response jika user tidak terautentikasi atau tidak memiliki role yang cukup
 * 
 * @param options - Opsi autentikasi (role required, demo mode, dll)
 * @returns Promise yang resolve dengan SessionPayload atau NextResponse error
 * 
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const user = await requireAuth({ requiredRoles: ['ADMIN'] });
 *   if (user instanceof NextResponse) return user;
 *   
 *   // User is authenticated and has ADMIN role
 *   return NextResponse.json({ data: 'sensitive data' });
 * }
 * ```
 */
export async function requireAuth(
    options?: AuthRouteOptions
): Promise<SessionPayload | NextResponse<{ error: string }>> {
    const user = await getSessionUser();

    if (!user) {
        if (options?.allowDemo && process.env.DEMO_MODE === 'true') {
            return NextResponse.json(
                { error: 'Demo mode - no active session' },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    if (options?.requiredRoles && options.requiredRoles.length > 0) {
        const userRole = String(user.role).trim().toUpperCase();
        const allowedRoles = options.requiredRoles.map(r => r.toUpperCase());
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json(
                { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
                { status: 403 }
            );
        }
    }

    return user;
}

/**
 * Membuat API error response dengan format yang konsisten
 * 
 * @param message - Pesan error yang akan dikirim
 * @param status - HTTP status code (default: 500)
 * @param code - Kode error opsional untuk identifikasi
 * @returns NextResponse dengan error format
 * 
 * @example
 * ```typescript
 * return apiError('Resource not found', 404, 'NOT_FOUND');
 * ```
 */
export function apiError(message: string, status: number = 500, code?: string): NextResponse<{ error: string; code?: string }> {
    return NextResponse.json(
        { error: message, ...(code ? { code } : {}) },
        { status }
    );
}

/**
 * Membuat API success response dengan format yang konsisten
 * 
 * @template T - Tipe data yang dikembalikan
 * @param data - Data yang akan dikirim dalam response
 * @param status - HTTP status code (default: 200)
 * @param headers - Headers tambahan opsional
 * @returns NextResponse dengan success format
 * 
 * @example
 * ```typescript
 * return apiSuccess({ user: userData }, 200, { 'X-Custom-Header': 'value' });
 * ```
 */
export function apiSuccess<T>(data: T, status: number = 200, headers?: HeadersInit): NextResponse<ApiSuccess<T>> {
    return NextResponse.json(
        { success: true as const, data },
        { status, ...(headers ? { headers } : {}) }
    );
}

/**
 * Higher-order function untuk membungkus route handler dengan autentikasi
 * Menyederhanakan implementasi autentikasi pada API routes
 * 
 * @param handler - Route handler function yang membutuhkan autentikasi
 * @param options - Opsi autentikasi (role required, demo mode, dll)
 * @returns Route handler function yang sudah dibungkus dengan autentikasi
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(
 *   async (request, context, user) => {
 *     return apiSuccess({ data: 'protected data' });
 *   },
 *   { requiredRoles: ['ADMIN'] }
 * );
 * ```
 */
export function withAuth(
    handler: (request: Request, context: RouteContext, user: SessionPayload) => Promise<NextResponse>,
    options?: AuthRouteOptions
) {
    return async (request: Request, context: RouteContext): Promise<NextResponse> => {
        try {
            const authResult = await requireAuth(options);

            if (authResult instanceof NextResponse) {
                return authResult;
            }

            return handler(request, context, authResult);
        } catch (error) {
            console.error('[API_HANDLER] Unhandled error:', error);
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}

/** Alias untuk withAuth, digunakan khusus untuk mutation endpoints (POST, PUT, DELETE) */
export const withAuthMutation = withAuth;
