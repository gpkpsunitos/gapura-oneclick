/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk login pengguna dan pembuatan session autentikasi
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { verifyPassword, signSession, registerSession } from '@/lib/auth-utils';
import { serializeAuthBundle } from '@/lib/auth-bundle';
import { logSecurityEvent } from '@/lib/security/event-service';
import { getClientIp } from '@/lib/security/utils';

/**
 * Menangani request GET dengan redirect ke halaman login
 * @param request - Request object
 * @returns Response redirect ke halaman login
 */
export async function GET(request: Request) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
}

/**
 * Menangani request POST untuk login pengguna
 * Memvalidasi email dan password, membuat session JWT, dan mengatur cookies
 * @param request - Request object berisi email dan password di body
 * @returns Response JSON dengan status login dan role user
 * @throws {Error} Jika terjadi kesalahan server
 * @example
 * ```json
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * ```
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email dan password wajib diisi' },
                { status: 400 }
            );
        }

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, email, password, role, status, division, station_id, full_name, phone, nik, positions, units, avatar_url')
            .ilike('email', email)
            .single();

        console.log('[AUTH_API] User Fetch Result:', !!user, 'Email:', email);
        if (fetchError) {
            console.error('[AUTH_API] Supabase Fetch Error:', fetchError);
        }

        if (!user) {
            console.log('[AUTH_API] Error: User Not Found');
            // ... log security event ...
            return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.password);
        console.log('[AUTH_API] Password Valid:', isValid);

        if (!isValid) {
            console.log('[AUTH_API] Error: Invalid Password');
             // ... log security event ...
            return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
        }

        if (user.status !== 'active') {
            let msg = 'Akun Anda belum aktif. Mohon hubungi admin.';
            if (user.status === 'rejected') msg = 'Akun Anda telah ditolak.';
            if (user.status === 'pending') msg = 'Akun Anda sedang dalam peninjauan admin.';

            await logSecurityEvent({
                source: 'auth-login-api',
                event_type: 'login',
                severity: 'LOW',
                payload: { email, success: false, reason: 'INACTIVE_STATUS', status: user.status },
                ip_address: getClientIp(request),
                actor_id: user.id
            });

            return NextResponse.json(
                { error: msg },
                { status: 403 }
            );
        }

        // AUTO-CORRECT ROLE for OT/OP/UQ/HC/HT if deemed as PARTNER
        // This ensures they get the correct dashboard experience
        let finalRole = user.role;
        const posName = (user.positions?.name || '').toUpperCase();
        const division = (user.division || '').toUpperCase();
        const emailUpper = email.toUpperCase();
        
        // Logic 1: If role is specifically marked as PARTNER_X, or if it says CABANG/PARTNER but has a division
        if (finalRole === 'CABANG' || finalRole.includes('PARTNER')) {
            if (division === 'OS' || posName.includes('OS') || emailUpper.includes('PARTNER.OS')) finalRole = 'PARTNER_OS';
            else if (division === 'OT' || posName.includes('OT') || posName.includes('TEKNOLOGI') || emailUpper.includes('PARTNER.OT')) finalRole = 'PARTNER_OT';
            else if (division === 'OP' || posName.includes('OP') || posName.includes('OPERASI') || emailUpper.includes('PARTNER.OP')) finalRole = 'PARTNER_OP';
            else if (division === 'UQ' || posName.includes('UQ') || posName.includes('QUAL') || emailUpper.includes('PARTNER.UQ')) finalRole = 'PARTNER_UQ';
            else if (division === 'HC' || posName.includes('HC') || posName.includes('HUMAN CAPITAL') || emailUpper.includes('PARTNER.HC')) finalRole = 'PARTNER_HC';
            else if (division === 'HT' || posName.includes('HT') || emailUpper.includes('PARTNER.HT')) finalRole = 'PARTNER_HT';
        }

        // Create session with unique ID for DB tracking
        const sid = crypto.randomUUID();
        const token = await signSession({ 
            id: user.id, 
            email: user.email, 
            role: finalRole, 
            division: user.division,
            station_id: user.station_id,
            sid 
        });
        const cookieStore = await cookies();

        // 1. Register Session in DB for security monitoring
        await registerSession(user.id, sid, getClientIp(request), request.headers.get('user-agent'));

        // Maintain standard 'session' cookie
        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        if (finalRole === 'DIVISI_ESKALASI') {
            cookieStore.set('auth_bundle', serializeAuthBundle({
                active_uid: user.id,
                origin_uid: user.id,
                sessions: {
                    [user.id]: token,
                },
            }), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
                path: '/',
            });
        } else {
            cookieStore.set('auth_bundle', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 0,
                path: '/',
            });
        }

        await logSecurityEvent({
            source: 'auth-login-api',
            event_type: 'login',
            severity: 'LOW',
            payload: { email, success: true },
            ip_address: getClientIp(request),
            actor_id: user.id
        });

        return NextResponse.json({ success: true, role: finalRole, email: user.email, phone: user.phone || null });
    } catch (err) {
        console.error('Login error:', err);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}
