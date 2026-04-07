/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi middleware Next.js untuk autentikasi dan routing
 * Middleware ini memproses semua request, memverifikasi session, dan mengontrol akses
 * ke berbagai route berdasarkan role pengguna
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

/**
 * Mapping role ke dashboard path yang sesuai
 * Setiap role memiliki dashboard yang ditentukan untuk redirect otomatis
 */
const ROLE_DASHBOARDS: Record<string, string> = {
    /** Dashboard untuk Super Admin */
    SUPER_ADMIN: '/dashboard/admin',
    /** Dashboard untuk Divisi Eskalasi */
    DIVISI_ESKALASI: '/dashboard/eskalasi/select',
    /** Dashboard untuk Divisi OS (Operational Support) */
    DIVISI_OS: '/dashboard/os',
    /** Dashboard untuk Partner OS */
    PARTNER_OS: '/dashboard/os',
    /** Dashboard untuk Divisi OT (Operational Technical) */
    DIVISI_OT: '/dashboard/ot',
    /** Dashboard untuk Partner OT */
    PARTNER_OT: '/dashboard/ot',
    /** Dashboard untuk Divisi OP (Operations) */
    DIVISI_OP: '/dashboard/op',
    /** Dashboard untuk Partner OP */
    PARTNER_OP: '/dashboard/op',
    /** Dashboard untuk Divisi UQ (Quality) */
    DIVISI_UQ: '/dashboard/uq',
    /** Dashboard untuk Partner UQ */
    PARTNER_UQ: '/dashboard/uq',
    /** Dashboard untuk Divisi HC (Human Capital) */
    DIVISI_HC: '/dashboard/hc',
    /** Dashboard untuk Partner HC */
    PARTNER_HC: '/dashboard/hc',
    /** Dashboard untuk Divisi HT (Human Training) */
    DIVISI_HT: '/dashboard/ht',
    /** Dashboard untuk Partner HT */
    PARTNER_HT: '/dashboard/ht',
    /** Dashboard untuk Analyst */
    ANALYST: '/dashboard/analyst',
    /** Dashboard untuk Manager Cabang */
    MANAGER_CABANG: '/dashboard/employee',
    /** Dashboard untuk Staff Cabang */
    STAFF_CABANG: '/dashboard/employee',
    /** Dashboard untuk Cabang */
    CABANG: '/dashboard/employee',
};

/**
 * Middleware utama untuk autentikasi dan routing
 * Fungsi ini dipanggil untuk setiap request yang cocok dengan pattern matcher
 * 
 * @param request - Objek NextRequest yang berisi informasi request
 * @returns NextResponse untuk redirect ke halaman yang sesuai atau lanjutkan request
 * 
 * @example
 * ```typescript
 * // Request yang sudah terautentikasi dengan role DIVISI_OS
 * // akan di-redirect ke /dashboard/os
 * ```
 */
export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const authHeader = request.headers.get('authorization');
    const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    const webhookSecret = request.headers.get('x-irrs-webhook-secret');
    const hasGoogleSheetsWebhookSecret = webhookSecret === process.env.GOOGLE_SHEETS_WEBHOOK_SECRET && !!process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
    
    // LOG ALL REQUESTS TO INTERFACE WITH TERMINAL
    console.log(`[MIDDLEWARE] ${request.method} ${path}`);

    const cookieStore = request.cookies;
    const session = cookieStore.get('session')?.value;

    // EXPLICIT BYPASS for public embed routes
    if (path.startsWith('/embed') || path.startsWith('/api/embed')) {
        return NextResponse.next();
    }

    const demoEnabled = process.env.DEMO_MODE === 'true';
    const isDemo = demoEnabled && (request.nextUrl.searchParams.get('demo') === '1' || request.headers.get('x-demo') === 'true');

    // Paths that don't require auth
    const isAuthPagePath = path.startsWith('/auth');
    const isAuthApiPath = path.startsWith('/api/auth');
    const isAuthPath = isAuthPagePath || isAuthApiPath;
    const isSyncEndpoint = path === '/api/admin/sync-reports';
    const isGoogleSheetsWebhook = path === '/api/integrations/google-sheets/webhook';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isPublicEmbedPath = path.startsWith('/embed') || 
                             path.startsWith('/api/embed') ||
                             path.startsWith('/api/dashboards/insights') ||
                             path.startsWith('/api/master-data') ||
                             path.startsWith('/api/ai/') ||
                             // Public report submission & evidence upload
                             path.startsWith('/api/reports/public') ||
                             path.startsWith('/api/uploads/evidence/public') ||
                             (path === '/api/dashboards' && request.method === 'GET') ||
                             (path === '/api/admin/test-email' && isServiceRole) ||
                             (isGoogleSheetsWebhook && (hasGoogleSheetsWebhookSecret || isServiceRole || isDevelopment)) ||
                             // Allow sync endpoint in development mode
                             (isSyncEndpoint && isDevelopment);
    const isPublicPath = isAuthPath || isPublicEmbedPath || path === '/';

    // Verify session
    const payload = session ? await verifySession(session) : null;
    
    if (session && !payload) {
        console.warn(`[MIDDLEWARE] Invalid session for path: ${path}`);
    }

    // 1. If trying to access protected route without valid session and not in demo mode
    if (!isPublicPath && !payload && !isDemo) {
        // FOR ALL /api ROUTES: Return 401 JSON instead of redirecting to HTML login
        if (path.startsWith('/api/')) {
            console.log(`[MIDDLEWARE] Unauthorized API request to ${path} - returning 401`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log(`[MIDDLEWARE] Redirecting ${path} to /auth/login`);
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // If in demo mode, skip further checks
    if (isDemo && !payload) {
        return NextResponse.next();
    }

    if (payload) {
        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();
        const isSharedGseDashboardPath = path.startsWith('/dashboard/ot/gse');

        // 2. If logged in and trying to access AUTH pages (login/register), redirect to dashboard
        // CRITICAL BUGFIX: We must NOT redirect if path is logout endpoint!
        if (isAuthPagePath && path !== '/api/auth/logout') {
            const dashboardUrl = ROLE_DASHBOARDS[role] || '/dashboard/employee';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Ensure API auth endpoints are never redirected
        if (isAuthApiPath) {
            return NextResponse.next();
        }

        // 3. Role based access control for dashboards
        
        // Division users should not land on generic employee dashboard
        if (path === '/dashboard/employee') {
            const correctDashboard = ROLE_DASHBOARDS[role];
            if (correctDashboard && correctDashboard !== '/dashboard/employee') {
                 return NextResponse.redirect(new URL(correctDashboard, request.url));
            }
        }

        // Admin dashboard protection
        if (path.startsWith('/dashboard/admin') && role !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        // Analyst Dashboard (ANALYST)
        if (path.startsWith('/dashboard/analyst') && role !== 'ANALYST') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        // Division Dashboards (OS, OT, OP, UQ, HC, HT)
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

/**
 * Konfigurasi matcher untuk middleware
 * Menentukan route mana yang akan diproses oleh middleware ini
 * 
 * @example
 * ```typescript
 * // Route yang akan diproses:
 * // - /dashboard/*
 * // - /auth/*
 * // - /embed/*
 * // - /api/*
 * ```
 */
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
        '/embed/:path*',
        '/api/:path*',
    ],
};
