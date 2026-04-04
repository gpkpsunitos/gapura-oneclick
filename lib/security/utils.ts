/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi fungsi utilitas untuk menangani alamat IP dari request HTTP
 */

/**
 * Mengambil alamat IP klien dari objek Request Next.js
 * Menangani proxy, environment lokal, dan daftar header yang dipisahkan koma
 * @param {Request} request - Objek request HTTP
 * @returns {string} Alamat IP klien atau placeholder default
 * @example
 * ```ts
 * const ip = getClientIp(request);
 * console.log('Client IP:', ip);
 * ```
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

// Kompleksitas: Waktu O(1) | Ruang O(1)
