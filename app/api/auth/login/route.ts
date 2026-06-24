
import { after, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import {
    DEFAULT_SESSION_MAX_AGE_SECONDS,
    ESCALATION_SESSION_MAX_AGE_SECONDS,
    registerSession,
    signSession,
    verifyPassword,
} from '@/lib/auth-utils';
import { serializeAuthBundle } from '@/lib/auth-bundle';
import { logSecurityEvent } from '@/lib/security/event-service';
import { enforceBotProtection } from '@/lib/security/botid';
import { getClientIp } from '@/lib/security/utils';
import { SyncService } from '@/lib/services/sync-service';
import { checkDbRateLimit, getClientIpFromRequest } from '@/lib/security/rate-limit';

export async function GET(request: Request) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
}

export async function POST(request: Request) {
    try {
        const botProtectionResponse = await enforceBotProtection();
        if (botProtectionResponse) {
            return botProtectionResponse;
        }

        const clientIp = getClientIpFromRequest(request);

        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password;

        const isEskalasiAccount = email.includes('eskalasi') || email.startsWith('divisi.eskalasi');

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email dan password wajib diisi' },
                { status: 400 }
            );
        }

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, email, password, role, status, division, station_id, full_name, phone, nik, unit_id, position_id')
            .eq('email', email)
            .single();

        if (fetchError) {
            console.error('[AUTH_API] Supabase Fetch Error:', fetchError);
        }

        if (!user) {
            if (isEskalasiAccount) {
                await logSecurityEvent({
                    source: 'auth-login-api',
                    event_type: 'login',
                    severity: 'HIGH',
                    payload: { email, success: false, reason: 'USER_NOT_FOUND', ip: clientIp },
                    ip_address: getClientIp(request),
                });
            }
            return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            if (isEskalasiAccount) {
                await logSecurityEvent({
                    source: 'auth-login-api',
                    event_type: 'login',
                    severity: 'HIGH',
                    payload: { email, success: false, reason: 'INVALID_PASSWORD', ip: clientIp },
                    ip_address: getClientIp(request),
                    actor_id: user.id,
                });
            }
            return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
        }

        if (user.status !== 'active') {
            let msg = 'Akun Anda belum aktif. Mohon hubungi admin.';
            if (user.status === 'rejected') msg = 'Akun Anda telah ditolak.';
            if (user.status === 'pending') msg = 'Akun Anda sedang dalam peninjauan admin.';
            if (user.status === 'suspended') msg = 'Akun Anda sedang disuspend. Mohon hubungi admin.';

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

        let finalRole = user.role;
        const posName = (user.position_id || '').toUpperCase();
        const division = (user.division || '').toUpperCase();
        const emailUpper = email.toUpperCase();

        if (finalRole === 'CABANG' || finalRole.includes('PARTNER')) {
            if (division === 'OS' || posName.includes('OS') || emailUpper.includes('PARTNER.OS')) finalRole = 'PARTNER_OS';
            else if (division === 'OP' || posName.includes('OP') || posName.includes('OPERASI') || emailUpper.includes('PARTNER.OP')) finalRole = 'PARTNER_OP';
            else if (division === 'HC' || posName.includes('HC') || posName.includes('HUMAN CAPITAL') || emailUpper.includes('PARTNER.HC')) finalRole = 'PARTNER_HC';
            else if (division === 'HT' || posName.includes('HT') || emailUpper.includes('PARTNER.HT')) finalRole = 'PARTNER_HT';
        }

        const sessionMaxAge = finalRole === 'DIVISI_ESKALASI'
            ? ESCALATION_SESSION_MAX_AGE_SECONDS
            : DEFAULT_SESSION_MAX_AGE_SECONDS;

        const sid = crypto.randomUUID();
        const token = await signSession({ 
            id: user.id, 
            email: user.email, 
            role: finalRole, 
            division: user.division,
            station_id: user.station_id,
            unit_id: user.unit_id,
            position_id: user.position_id,
            sid
        }, { maxAgeSeconds: sessionMaxAge });
        const cookieStore = await cookies();

        await registerSession(user.id, sid, getClientIp(request), request.headers.get('user-agent'), sessionMaxAge);

        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: sessionMaxAge,
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
                maxAge: sessionMaxAge,
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
            severity: isEskalasiAccount ? 'MEDIUM' : 'LOW',
            payload: { email, success: true },
            ip_address: getClientIp(request),
            actor_id: user.id
        });

        after(async () => {
            try {
                await SyncService.syncReportsFromSheets('login');
            } catch (syncErr) {
                console.warn('[AUTH_API] Post-login background sync failed (non-blocking):', syncErr);
            }
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
