/**
 * Simple in-memory rate limiter for API endpoints.
 * Note: In serverless environments, each instance has its own state.
 * For production, consider Redis-backed rate limiting.
 */

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
 * Get client IP from request headers
 */
export function getClientIpFromRequest(request: Request): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}
