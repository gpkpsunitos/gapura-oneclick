/**
 * @file
 * Centralized authentication guard middleware for IRRS
 *
 * This module provides authentication middleware that should be applied to:
 * - OS (Operasional Sistem) - requires auth
 * - OP (Operasional) - requires auth
 * - Eskalasi - requires auth
 * - Manager - requires auth
 * - Analyst - requires auth
 * - Employee - requires auth
 * - Super Admin - requires auth
 *
 * The following divisions should have NO auth requirements:
 * - HC (Human Capital)
 * - HT (Human Training)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import type { SessionPayload } from '@/types';

/** Divisions that require authentication */
const PROTECTED_DIVISIONS = ['OS', 'OP', 'Eskalasi', 'Manager', 'Analyst', 'Employee', 'SuperAdmin'] as const;

/** Role prefixes that indicate protected divisions (require auth) */
const PROTECTED_ROLE_PREFIXES = [
    'DIVISI_OS', 'DIVISI_OP', 'DIVISI_ESKALASI',
    'PARTNER_OS', 'PARTNER_OP',
    'MANAGER_CABANG',
    'ANALYST',
    'STAFF_CABANG',
    'SUPER_ADMIN'
];

/** Role prefixes that indicate public divisions (NO auth required) */
const PUBLIC_ROLE_PREFIXES = ['DIVISI_HC', 'DIVISI_HT', 'PARTNER_HC', 'PARTNER_HT'];

/**
 * Check if a role requires authentication based on division rules
 */
export function isProtectedRole(role: string | undefined): boolean {
    if (!role) return false;
    // Check if role is in protected list
    return PROTECTED_ROLE_PREFIXES.some(prefix => role.startsWith(prefix));
}

/**
 * Check if a role is for a public division (NO auth required)
 */
export function isPublicDivisionRole(role: string | undefined): boolean {
    if (!role) return false;
    return PUBLIC_ROLE_PREFIXES.some(prefix => role.startsWith(prefix));
}

/**
 * Check if a division requires authentication
 */
export function isProtectedDivision(division: string | undefined): boolean {
    if (!division) return false;
    return PROTECTED_DIVISIONS.some(d => division.toUpperCase().includes(d.toUpperCase()));
}

/**
 * Verify session from request cookies
 * Returns the session payload if valid, null otherwise
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
    const token = request.cookies.get('session')?.value;
    if (!token) return null;
    return verifySession(token);
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Auth guard middleware for API routes
 *
 * This function verifies authentication for protected divisions (OS, OP, Eskalasi,
 * Manager, Analyst, Employee, Super Admin).
 * For public divisions (HC, HT) or public API paths, it returns null (allowing pass-through).
 *
 * @param request - The Next.js request object
 * @param options - Configuration options
 * @returns NextResponse if unauthorized, null if authorized (or not protected)
 */
export async function authGuard(
    request: NextRequest,
    options: {
        /** If true, requires authentication for all routes regardless of division */
        requireAuth?: boolean;
        /** Required role(s) for access */
        requiredRoles?: string[];
    } = {}
): Promise<{ session: SessionPayload; response: null } | { session: null; response: NextResponse | null }> {
    const { requireAuth = false, requiredRoles = [] } = options;

    // Check if this is a public API path (skip auth for these)
    const pathname = request.nextUrl.pathname;
    if (skipAuth(pathname)) {
        return { session: null, response: null };
    }

    // Get session from request
    const session = await getSessionFromRequest(request);

    // If requireAuth is true, authentication is mandatory for all routes
    if (requireAuth) {
        if (!session) {
            return { session: null, response: unauthorizedResponse('Authentication required') };
        }
        return { session, response: null };
    }

    // Check if session role indicates a public division (no auth needed)
    if (session && isPublicDivisionRole(session.role)) {
        return { session: null, response: null };
    }

    // Check if route belongs to a protected division based on path
    const isProtectedPath =
        pathname.includes('/dashboard/(main)/os/') ||
        pathname.includes('/dashboard/(main)/op/') ||
        pathname.includes('/dashboard/(main)/eskalasi/') ||
        pathname.includes('/dashboard/(main)/manager/') ||
        pathname.includes('/dashboard/(main)/analyst/') ||
        pathname.includes('/dashboard/(main)/employee/') ||
        pathname.includes('/api/admin/') ||
        pathname.includes('/api/reports') && !pathname.includes('/public');

    // If path is NOT protected, allow pass-through (no auth required)
    if (!isProtectedPath) {
        return { session: null, response: null };
    }

    // Path is protected - verify authentication
    if (!session) {
        return { session: null, response: unauthorizedResponse('Authentication required for this division') };
    }

    // Verify role if required
    if (requiredRoles.length > 0) {
        const userRole = session.role;
        if (!requiredRoles.some(role => userRole?.startsWith(role))) {
            return { session: null, response: forbiddenResponse('Insufficient permissions') };
        }
    }

    return { session, response: null };
}

/**
 * Higher-order function to wrap API route handlers with auth protection
 *
 * @example
 * ```typescript
 * // Protect all routes in this file
 * export const POST = withAuth(async (req, session) => {
 *   // Your handler code here
 * });
 * ```
 */
export function withAuth<
    T extends (request: NextRequest, context: { session: SessionPayload }) => Promise<NextResponse>
>(
    handler: T,
    options?: {
        requireAuth?: boolean;
        requiredRoles?: string[];
    }
): (request: NextRequest) => Promise<NextResponse> {
    return async (request: NextRequest) => {
        const result = await authGuard(request, options ?? {});

        if (result.response) {
            return result.response;
        }

        // For protected routes, session is required
        if (!result.session) {
            return unauthorizedResponse('Session not found');
        }

        return handler(request, { session: result.session });
    };
}

/**
 * Simplified auth middleware for API routes that require auth
 * Use this for protected routes only
 */
export async function requireAuth(request: NextRequest): Promise<SessionPayload> {
    const session = await getSessionFromRequest(request);

    if (!session) {
        throw new Error('Unauthorized');
    }

    return session;
}

/**
 * Middleware to skip auth for public routes (used in route matchers)
 * These are the ONLY divisions that do NOT require authentication:
 * - HC (Human Capital)
 * - HT (Human Training)
 */
export function skipAuth(pathname: string): boolean {
    const publicPaths = [
        '/auth/',                     // Public auth routes
        '/api/auth/',                 // Auth API endpoints
        '/api/reports/public',        // Public reports API
        '/embed/',                     // Embeddable public dashboards
        '/api/uploads/evidence/public', // Public evidence upload
        '/api/ai/root-cause/categories', // AI categories (public)
        '/api/ai/root-cause/stats',    // AI stats (public)
    ];

    return publicPaths.some(path => pathname.startsWith(path));
}

// Re-export commonly used auth utilities
export { verifySession } from '@/lib/auth-utils';