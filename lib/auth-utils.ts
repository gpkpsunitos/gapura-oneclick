/**
 * @file
 * 
 * File ini berisi utility untuk autentikasi, termasuk hashing password, JWT signing/verification,
 * dan session management untuk aplikasi IRRS
 */

import 'server-only';
import { SessionPayload } from '@/types';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/** Secret key untuk JWT signing, diambil dari environment variable */
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start with insecure configuration.');
}
const key = new TextEncoder().encode(SECRET_KEY);

export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
export const ESCALATION_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const SWITCHED_DIVISION_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2;

/**
 * In-memory session cache to reduce Supabase queries on every authenticated request.
 * TTL: 15 minutes — matches the last_active update threshold so cache entries
 * stay fresh enough for revocation checks without hitting the DB each time.
 *
 * On Vercel serverless, this cache lives per cold-start instance and resets on
 * redeploy, which is acceptable since session revocations are rare.
 */
const SESSION_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sessionCache = new Map<string, { payload: SessionPayload; expiresAt: number; cacheTime: number }>();

function getCachedSession(sid: string): SessionPayload | null {
    const entry = sessionCache.get(sid);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        sessionCache.delete(sid);
        return null;
    }
    return entry.payload;
}

/** Get the cache timestamp for a cached session (used for last_active throttle). */
function getCachedSessionAge(sid: string): number | null {
    const entry = sessionCache.get(sid);
    if (!entry) return null;
    return Date.now() - entry.cacheTime;
}

function setCachedSession(sid: string, payload: SessionPayload): void {
    // Evict stale entries when cache grows beyond 500 to prevent memory bloat
    if (sessionCache.size > 500) {
        const now = Date.now();
        for (const [k, v] of sessionCache) {
            if (now > v.expiresAt) sessionCache.delete(k);
        }
        // If still too large after eviction, drop oldest quarter
        if (sessionCache.size > 500) {
            const entries = [...sessionCache.entries()]
                .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
            for (let i = 0; i < Math.ceil(entries.length / 4); i++) {
                sessionCache.delete(entries[i][0]);
            }
        }
    }
    sessionCache.set(sid, { payload, expiresAt: Date.now() + SESSION_CACHE_TTL_MS, cacheTime: Date.now() });
}

/**
 * Remove a session from the in-memory cache (e.g. on logout / explicit revoke).
 * Exported so logout and revoke flows can call it.
 */
export function evictSessionCache(sid: string): void {
    sessionCache.delete(sid);
}

/**
 * Menghash password menggunakan bcrypt
 * Fungsi ini menghasilkan hash password yang aman untuk penyimpanan
 * 
 * @param password - Password dalam plain text yang akan dihash
 * @returns Promise yang resolve dengan string password yang sudah dihash
 * @throws Error jika hashing gagal
 * 
 * @example
 * ```typescript
 * const hashedPassword = await hashPassword('userPassword123');
 * // Output: '$2a$10$...'
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Memverifikasi password dengan hash yang tersimpan
 * 
 * @param password - Password dalam plain text yang akan diverifikasi
 * @param hash - Hash password yang tersimpan
 * @returns Promise yang resolve dengan boolean true jika password cocok, false jika tidak
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('userPassword123', storedHash);
 * // true jika password cocok
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

import { supabaseAdmin } from './supabase-admin';

/**
 * Membuat JWT token untuk session baru
 * Token ini berisi payload user dan session ID, valid selama 24 jam
 * 
 * @param payload - Object payload session yang berisi informasi user
 * @returns Promise yang resolve dengan string JWT token
 * @throws Error jika signing gagal
 * 
 * @example
 * ```typescript
 * const token = await signSession({
 *   userId: 'user-123',
 *   email: 'user@example.com',
 *   role: 'EMPLOYEE'
 * });
 * ```
 */
export async function signSession(
    payload: SessionPayload,
    options: { maxAgeSeconds?: number } = {},
) {
    const sid = payload.sid || crypto.randomUUID();
    const maxAgeSeconds = options.maxAgeSeconds || DEFAULT_SESSION_MAX_AGE_SECONDS;
    return await new SignJWT({ ...payload, sid } as unknown as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setJti(sid)
        .setIssuedAt()
        .setExpirationTime(`${maxAgeSeconds}s`)
        .sign(key);
}

/**
 * Memverifikasi session token dan mengembalikan payload session
 * Fungsi ini juga memeriksa apakah session di-revoke di database
 * dan memperbarui last_active timestamp
 * 
 * @param token - JWT token yang akan diverifikasi
 * @returns Promise yang resolve dengan SessionPayload atau null jika invalid
 * 
 * @example
 * ```typescript
 * const session = await verifySession(tokenString);
 * if (session) {
 *   console.log('User ID:', session.userId);
 * }
 * ```
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        let session = await readSessionPayload(token);
        if (!session) {
            return null;
        }

        if (session.sid) {
            // Check in-memory cache first to skip DB query on hot paths
            const cached = getCachedSession(session.sid);
            if (cached) {
                // Fire-and-forget last_active update (same as before)
                const cachedAge = getCachedSessionAge(session.sid);
                if (cachedAge !== null && cachedAge > 15 * 60 * 1000) {
                    supabaseAdmin.from('security_sessions')
                        .update({ last_active: new Date().toISOString() })
                        .eq('session_id', session.sid)
                        .then();
                }
                return session;
            }

            const queryResult = await supabaseAdmin
                .from('security_sessions')
                .select('is_revoked, last_active, expires_at')
                .eq('session_id', session.sid)
                .single();

            const data = queryResult.data;
            const dbError = queryResult.error;

            if (data?.is_revoked) {
                console.warn(`[AUTH_UTILS] Session ${session.sid} is REVOKED`);
                evictSessionCache(session.sid);
                return null;
            }
            if (!data) {
                if (dbError) {
                    console.warn(`[AUTH_UTILS] Session ${session.sid} DB lookup error:`, dbError.message, dbError.code);
                } else {
                    console.warn(`[AUTH_UTILS] Session ${session.sid} NOT FOUND in DB — attempting re-register`);
                }

                // JWT is valid (jwtVerify succeeded above). Check user still active,
                // then re-register the session so future requests hit the cache.
                try {
                    const { data: userData } = await supabaseAdmin
                        .from('users')
                        .select('role, status')
                        .eq('id', session.id)
                        .single();

                    if (!userData || (userData as Record<string, unknown>).status !== 'active') {
                        console.warn(`[AUTH_UTILS] Session ${session.sid} user not active — rejecting`);
                        return null;
                    }

                    // Compute remaining TTL from JWT exp claim
                    const jwtExp = (session as unknown as { exp?: number }).exp;
                    const remainingMs = jwtExp ? (jwtExp * 1000 - Date.now()) : 0;
                    if (remainingMs <= 0) return null;

                    const remainingSeconds = Math.ceil(remainingMs / 1000);
                    await registerSession(session.id, session.sid, null, null, remainingSeconds);
                    setCachedSession(session.sid, session);
                    console.info(`[AUTH_UTILS] Session ${session.sid} re-registered (was missing from DB)`);
                } catch (reregErr) {
                    console.warn(`[AUTH_UTILS] Session re-register failed:`, reregErr instanceof Error ? reregErr.message : reregErr);
                    return null;
                }

                return session;
            }
            if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
                console.warn(`[AUTH_UTILS] Session ${session.sid} is EXPIRED`);
                evictSessionCache(session.sid);
                return null;
            }

            try {
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('role, status')
                    .eq('id', session.id)
                    .single();

                if (userData) {
                    if ((userData as Record<string, unknown>).status !== 'active') {
                        evictSessionCache(session.sid);
                        return null;
                    }
                    if ((userData as Record<string, unknown>).role && (userData as Record<string, unknown>).role !== session.role) {
                        session = { ...session, role: (userData as Record<string, unknown>).role as string };
                    }
                }
            } catch {
                // Non-blocking: if user lookup fails, continue with JWT role
            }

            // Cache the valid session for subsequent requests
            setCachedSession(session.sid, session);

            const lastActive = data.last_active ? new Date(data.last_active).getTime() : 0;
            if (!lastActive || (Date.now() - lastActive) > 15 * 60 * 1000) {
                supabaseAdmin.from('security_sessions')
                    .update({ last_active: new Date().toISOString() })
                    .eq('session_id', session.sid)
                    .then();
            }
        }

        return session;
    } catch (err: unknown) {
        console.error(`[AUTH_UTILS] verifySession catch error for token:`, err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Membaca dan memverifikasi JWT token tanpa mengecek database
 * Fungsi ini hanya memverifikasi signature dan expiry token
 * 
 * @param token - JWT token yang akan dibaca
 * @returns Promise yang resolve dengan SessionPayload atau null jika invalid
 * 
 * @example
 * ```typescript
 * const payload = await readSessionPayload(tokenString);
 * if (payload) {
 *   console.log('User role:', payload.role);
 * }
 * ```
 */
export async function readSessionPayload(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });

        return payload as unknown as SessionPayload;
    } catch (err: unknown) {
        console.error(`[AUTH_UTILS] readSessionPayload catch error for token:`, err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * Mendaftarkan session baru di database untuk tracking
 * Menyimpan informasi session seperti user_id, session_id, IP address, dan user agent
 * 
 * @param userId - ID user yang membuat session
 * @param sid - Session ID unik
 * @param ip - IP address klien (optional)
 * @param ua - User agent string (optional)
 * @returns Promise yang resolve dengan hasil insert Supabase
 * 
 * @example
 * ```typescript
 * await registerSession('user-123', sessionUuid, '192.168.1.1', 'Mozilla/5.0...');
 * ```
 */
export async function registerSession(
    userId: string,
    sid: string,
    ip: string | null,
    ua: string | null,
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
    return await supabaseAdmin.from('security_sessions').insert({
        user_id: userId,
        session_id: sid,
        ip_address: ip,
        user_agent: ua,
        expires_at: new Date(Date.now() + maxAgeSeconds * 1000).toISOString(),
    });
}
