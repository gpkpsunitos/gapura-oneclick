/**
 * @file
 * Dibuat oleh Claude
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

import { supabase } from './supabase';
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
export async function signSession(payload: SessionPayload) {
    const sid = payload.sid || crypto.randomUUID();
    return await new SignJWT({ ...payload, sid } as unknown as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setJti(sid)
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

/**
 * Helper function untuk mengeksekusi query dengan timeout
 * Mengembalikan null jika query timeout
 * 
 * @param promise - Promise yang akan dieksekusi dengan timeout
 * @param ms - Timeout dalam milidetik
 * @returns Promise yang resolve dengan result query atau null jika timeout
 * 
 * @internal
 */
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
    } catch (err: any) {
        console.error(`[AUTH_UTILS] readSessionPayload catch error for token:`, err.message || err);
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
export async function registerSession(userId: string, sid: string, ip: string | null, ua: string | null) {
    return await supabaseAdmin.from('security_sessions').insert({
        user_id: userId,
        session_id: sid,
        ip_address: ip,
        user_agent: ua,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h parity with JWT
    });
}
