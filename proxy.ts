
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

const ROLE_DASHBOARDS: Record<string, string> = {

    SUPER_ADMIN: '/dashboard/admin',

    DIVISI_ESKALASI: '/dashboard/eskalasi/select',

    DIVISI_OS: '/dashboard/os',

    PARTNER_OS: '/dashboard/os',

    DIVISI_OT: '/dashboard/ot',

    PARTNER_OT: '/dashboard/ot',

    DIVISI_OP: '/dashboard/op',

    PARTNER_OP: '/dashboard/op',

    DIVISI_UQ: '/dashboard/uq',

    PARTNER_UQ: '/dashboard/uq',

    DIVISI_HC: '/dashboard/hc',

    PARTNER_HC: '/dashboard/hc',

    DIVISI_HT: '/dashboard/ht',

    PARTNER_HT: '/dashboard/ht',

    ANALYST: '/dashboard/analyst',

    MANAGER_CABANG: '/dashboard/manager',

    STAFF_CABANG: '/dashboard/employee',

    CABANG: '/dashboard/employee',
};

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isLogoutTransition = request.nextUrl.searchParams.get('logout') === '1';
    const webhookSecret = request.headers.get('x-irrs-webhook-secret');
    const hasGoogleSheetsWebhookSecret = webhookSecret === process.env.GOOGLE_SHEETS_WEBHOOK_SECRET && !!process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

    const cookieStore = request.cookies;
    const session = cookieStore.get('session')?.value;

    if (path.startsWith('/embed') || path.startsWith('/api/embed')) {
        return NextResponse.next();
    }

    const demoEnabled = process.env.DEMO_MODE === 'true';
    const isDemo = demoEnabled && (request.nextUrl.searchParams.get('demo') === '1' || request.headers.get('x-demo') === 'true');

    const isAuthPagePath = path.startsWith('/auth');
    const isAuthApiPath = path.startsWith('/api/auth');
    const isAuthPath = isAuthPagePath || isAuthApiPath;
    const isSyncEndpoint = path === '/api/admin/sync-reports';
    const isGoogleSheetsWebhook = path === '/api/integrations/google-sheets/webhook';
    const isVirtualAssistantApi = path === '/api/virtual-assistant/launch' || path === '/api/virtual-assistant/consume';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isPublicEmbedPath = path.startsWith('/embed') || 
                             path.startsWith('/api/embed') ||
                             path.startsWith('/api/master-data') ||
                             isVirtualAssistantApi ||

                             path.startsWith('/api/reports/public') ||
                             path.startsWith('/api/reports/duplicates/check') ||
                             path.startsWith('/api/uploads/evidence/token') ||
                             path.startsWith('/api/uploads/evidence/public') ||
                             (path === '/api/dashboards' && request.method === 'GET') ||
                             (isGoogleSheetsWebhook && (hasGoogleSheetsWebhookSecret || isDevelopment)) ||

                             (isSyncEndpoint && isDevelopment);
    const isPublicPath = isAuthPath || isPublicEmbedPath || path === '/';

    const payload = session ? await verifySession(session) : null;

    if (session && !payload) {
        if (process.env.NODE_ENV === 'development') console.warn(`[MIDDLEWARE] Invalid session for path: ${path}`);
    }

    if (!isPublicPath && !payload && !isDemo) {

        if (path.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const loginUrl = new URL('/auth/login', request.url);
        if (path.startsWith('/virtual-assistant')) {
            loginUrl.searchParams.set('next', path);
        }
        return NextResponse.redirect(loginUrl);
    }

    if (isDemo && !payload) {
        return NextResponse.next();
    }

    if (payload) {

        const role = String(payload.role).trim().toUpperCase();
        const isSharedGseDashboardPath = path.startsWith('/dashboard/ot/gse');

        if (isAuthPagePath && path !== '/api/auth/logout' && !isLogoutTransition) {
            const dashboardUrl = ROLE_DASHBOARDS[role] || '/dashboard/employee';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        if (isAuthApiPath) {
            return NextResponse.next();
        }

        if (path === '/dashboard/employee') {
            const correctDashboard = ROLE_DASHBOARDS[role];
            if (correctDashboard && correctDashboard !== '/dashboard/employee') {
                 return NextResponse.redirect(new URL(correctDashboard, request.url));
            }
        }

        const isBranchManagerUserApproval = role === 'MANAGER_CABANG' && path.startsWith('/dashboard/admin/users');
        if (path.startsWith('/dashboard/admin') && role !== 'SUPER_ADMIN' && !isBranchManagerUserApproval) {
            return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] || '/dashboard/employee', request.url));
        }

        if (path.startsWith('/dashboard/analyst') && !['ANALYST', 'SUPER_ADMIN'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        if (path.startsWith('/dashboard/os') && !path.startsWith('/dashboard/analyst')) {
             if (!['DIVISI_OS', 'PARTNER_OS', 'DIVISI_OT', 'PARTNER_OT', 'DIVISI_OP', 'PARTNER_OP', 'DIVISI_UQ', 'PARTNER_UQ'].includes(role)) {
                  if (role === 'DIVISI_ESKALASI') {
                      return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
                  }
                  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
             }
        }
        const otAllowedRoles = isSharedGseDashboardPath
            ? ['DIVISI_OT', 'PARTNER_OT', 'DIVISI_OP', 'PARTNER_OP']
            : ['DIVISI_OT', 'PARTNER_OT'];

        if (path.startsWith('/dashboard/ot') && !otAllowedRoles.includes(role)) {
             if (role === 'DIVISI_ESKALASI') {
                 return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
             }
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/op') && !['DIVISI_OP', 'PARTNER_OP'].includes(role)) {
             if (role === 'DIVISI_ESKALASI') {
                 return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
             }
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/uq') && !['DIVISI_UQ', 'PARTNER_UQ'].includes(role)) {
             if (role === 'DIVISI_ESKALASI') {
                 return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
             }
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/hc') && !['DIVISI_HC', 'PARTNER_HC', 'ANALYST', 'SUPER_ADMIN'].includes(role)) {
             if (role === 'DIVISI_ESKALASI') {
                 return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
             }
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/ht') && !['DIVISI_HT', 'PARTNER_HT'].includes(role)) {
             if (role === 'DIVISI_ESKALASI') {
                 return NextResponse.redirect(new URL('/dashboard/eskalasi/select', request.url));
             }
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/eskalasi') && role !== 'DIVISI_ESKALASI') {
             return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] || '/dashboard/employee', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
        '/embed/:path*',
        '/virtual-assistant/:path*',
        '/api/:path*',
    ],
};
