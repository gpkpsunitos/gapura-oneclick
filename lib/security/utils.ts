/**
 * Resolve the client's IP address from a Next.js Request object.
 * Handles proxies, local environments, and comma-separated header lists.
 */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can be "client, proxy1, proxy2"
        return forwardedFor.split(',')[0].trim();
    }
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    // Default to a safe placeholder if no IP can be determined
    return '127.0.0.1';
}

// Complexity: Time O(1) | Space O(1)
