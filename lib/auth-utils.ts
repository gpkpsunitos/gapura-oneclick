import 'server-only';
import { SessionPayload } from '@/types';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'changeme_this_is_unsafe_for_production';
const key = new TextEncoder().encode(SECRET_KEY);

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

export async function signSession(payload: SessionPayload) {
    const sid = payload.sid || crypto.randomUUID();
    return await new SignJWT({ ...payload, sid } as unknown as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setJti(sid)
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

async function queryWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Query timeout')), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId!);
    }
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const session = await readSessionPayload(token);
        if (!session) {
            return null;
        }

        if (session.sid) {
            const queryResult = await supabaseAdmin
                .from('security_sessions')
                .select('is_revoked, last_active')
                .eq('session_id', session.sid)
                .single();
            
            const data = queryResult.data;
            
            if (data?.is_revoked) {
                console.warn(`[AUTH_UTILS] Session ${session.sid} is REVOKED`);
                return null;
            }
            if (!data) {
                console.warn(`[AUTH_UTILS] Session ${session.sid} NOT FOUND in DB`);
                return null;
            }

            const lastActive = data.last_active ? new Date(data.last_active).getTime() : 0;
            if (!lastActive || (Date.now() - lastActive) > 15 * 60 * 1000) {
                supabaseAdmin.from('security_sessions')
                    .update({ last_active: new Date().toISOString() })
                    .eq('session_id', session.sid)
                    .then();
            }
        }

        return session;
    } catch (err: any) {
        console.error(`[AUTH_UTILS] verifySession catch error for token:`, err.message || err);
        return null;
    }
}

export async function readSessionPayload(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });

        return payload as unknown as SessionPayload;
    } catch (err: any) {
        console.error(`[AUTH_UTILS] readSessionPayload catch error for token:`, err.message || err);
        return null;
    }
}

/**
 * Register a new session in the database for tracking
 */
export async function registerSession(userId: string, sid: string, ip: string | null, ua: string | null) {
    return await supabaseAdmin.from('security_sessions').insert({
        user_id: userId,
        session_id: sid,
        ip_address: ip,
        user_agent: ua,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h parity with JWT
    });
}
