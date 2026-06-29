
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import type { SessionPayload } from '@/types';

const PROTECTED_DIVISIONS = ['OS', 'OP', 'Eskalasi', 'Manager', 'Analyst', 'Employee', 'SuperAdmin'] as const;

const PROTECTED_ROLE_PREFIXES = [
    'DIVISI_OS', 'DIVISI_OCS', 'DIVISI_OT', 'DIVISI_UQ', 'DIVISI_OP', 'DIVISI_ESKALASI',
    'PARTNER_OS', 'PARTNER_OCS', 'PARTNER_OP', 'PARTNER_OT', 'PARTNER_UQ',
    'MANAGER_CABANG',
    'ANALYST',
    'STAFF_CABANG',
    'SUPER_ADMIN'
];

const PUBLIC_ROLE_PREFIXES = ['DIVISI_HC', 'DIVISI_HT', 'PARTNER_HC', 'PARTNER_HT'];

export function isProtectedRole(role: string | undefined): boolean {
    if (!role) return false;

    return PROTECTED_ROLE_PREFIXES.some(prefix => role.startsWith(prefix));
}

export function isPublicDivisionRole(role: string | undefined): boolean {
    if (!role) return false;
    return PUBLIC_ROLE_PREFIXES.some(prefix => role.startsWith(prefix));
}

export function isProtectedDivision(division: string | undefined): boolean {
    if (!division) return false;
    return PROTECTED_DIVISIONS.some(d => division.toUpperCase().includes(d.toUpperCase()));
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
    const token = request.cookies.get('session')?.value;
    if (!token) return null;
    return verifySession(token);
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
}

export async function authGuard(
    request: NextRequest,
    options: {

        requireAuth?: boolean;

        requiredRoles?: string[];
    } = {}
): Promise<{ session: SessionPayload; response: null } | { session: null; response: NextResponse | null }> {
    const { requireAuth = false, requiredRoles = [] } = options;

    const pathname = request.nextUrl.pathname;
    if (skipAuth(pathname)) {
        return { session: null, response: null };
    }

    const session = await getSessionFromRequest(request);

    if (requireAuth) {
        if (!session) {
            return { session: null, response: unauthorizedResponse('Authentication required') };
        }
        return { session, response: null };
    }

    if (session && isPublicDivisionRole(session.role)) {
        return { session: null, response: null };
    }

    const isProtectedPath =
        pathname.includes('/dashboard/(main)/os/') ||
        pathname.includes('/dashboard/(main)/ocs/') ||
        pathname.includes('/dashboard/(main)/op/') ||
        pathname.includes('/dashboard/(main)/eskalasi/') ||
        pathname.includes('/dashboard/(main)/manager/') ||
        pathname.includes('/dashboard/(main)/analyst/') ||
        pathname.includes('/dashboard/(main)/employee/') ||
        pathname.includes('/api/admin/') ||
        pathname.includes('/api/reports') && !pathname.includes('/public');

    if (!isProtectedPath) {
        return { session: null, response: null };
    }

    if (!session) {
        return { session: null, response: unauthorizedResponse('Authentication required for this division') };
    }

    if (requiredRoles.length > 0) {
        const userRole = session.role;
        if (!requiredRoles.some(role => userRole?.startsWith(role))) {
            return { session: null, response: forbiddenResponse('Insufficient permissions') };
        }
    }

    return { session, response: null };
}

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

        if (!result.session) {
            return unauthorizedResponse('Session not found');
        }

        return handler(request, { session: result.session });
    };
}

export async function requireAuth(request: NextRequest): Promise<SessionPayload> {
    const session = await getSessionFromRequest(request);

    if (!session) {
        throw new Error('Unauthorized');
    }

    return session;
}

export function skipAuth(pathname: string): boolean {
    const publicPaths = [
        '/auth/',
        '/api/auth/',
        '/api/reports/public',
        '/embed/',
        '/api/uploads/evidence/public',
        '/api/ai/root-cause/categories',
        '/api/ai/root-cause/stats',
    ];

    return publicPaths.some(path => pathname.startsWith(path));
}

export { verifySession } from '@/lib/auth-utils';
