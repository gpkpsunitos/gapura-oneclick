/**
 * Simple in-memory rate limiter for API endpoints.
 * Note: In serverless environments, each instance has its own state.
 * For production, consider Redis-backed rate limiting.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., IP address or email)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
    key: string,
    limit: number = 5,
    windowMs: number = 60_000,
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    entry.count += 1;

    if (entry.count > limit) {
        return { success: false, remaining: 0, resetAt: entry.resetTime };
    }

    return { success: true, remaining: limit - entry.count, resetAt: entry.resetTime };
}

/**
 * Supabase-backed persistent rate limiter for serverless environments.
 * Uses the database to track rate limits across cold starts and instances.
 */
export async function checkDbRateLimit(
    key: string,
    limit: number = 5,
    windowMs: number = 60_000,
): Promise<RateLimitResult> {
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin.from('rate_limits') as any;
    const now = new Date();

    // Clean up expired entries
    await db.delete().lt('reset_at', now.toISOString());

    const { data, error } = await db.select('id, count, reset_at').eq('key', key).single();

    if (error || !data) {
        // No existing record — create new
        const resetAt = new Date(now.getTime() + windowMs);
        await db.insert({ key, count: 1, reset_at: resetAt.toISOString() });
        return { success: true, remaining: limit - 1, resetAt: resetAt.getTime() };
    }

    const resetAt = new Date(data.reset_at as string);
    if (now.getTime() > resetAt.getTime()) {
        // Window expired — reset
        const newResetAt = new Date(now.getTime() + windowMs);
        await db.update({ count: 1, reset_at: newResetAt.toISOString() }).eq('id', data.id);
        return { success: true, remaining: limit - 1, resetAt: newResetAt.getTime() };
    }

    const newCount = (data.count as number) + 1;
    await db.update({ count: newCount }).eq('id', data.id);

    if (newCount > limit) {
        return { success: false, remaining: 0, resetAt: resetAt.getTime() };
    }

    return { success: true, remaining: limit - newCount, resetAt: resetAt.getTime() };
}

/**
 * Get client IP from request headers
 */
export function getClientIpFromRequest(request: Request): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

/**
 * Verify a signed upload token.
 * Token format: <timestamp>.<hmac>
 * Valid for `maxAgeMs` milliseconds after creation.
 */
export function verifyUploadToken(token: string, maxAgeMs: number = 5 * 60 * 1000): boolean {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;

    const sepIndex = token.lastIndexOf('.');
    if (sepIndex <= 0 || sepIndex === token.length - 1) return false;

    const timestamp = token.slice(0, sepIndex);
    const providedSig = token.slice(sepIndex + 1);

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > maxAgeMs) return false;

    const expectedSig = createHmac('sha256', secret).update(timestamp).digest('base64url');

    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Generate a signed upload token.
 * Token format: <timestamp>.<hmac>
 */
export function generateUploadToken(): string | null {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const timestamp = String(Date.now());
    const signature = createHmac('sha256', secret).update(timestamp).digest('base64url');
    return `${timestamp}.${signature}`;
}
