/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi utility untuk sanitasi HTML untuk mencegah serangan XSS (Cross-Site Scripting)
 * Digunakan sebelum merender konten yang menggunakan dangerouslySetInnerHTML
 */

// Map of HTML entities for escaping
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

const HTML_ENTITY_REGEX = /[&<>"'/]/g;

/**
 * Mengescape karakter HTML khusus untuk mencegah XSS
 * Gunakan fungsi ini untuk konten teks sederhana yang tidak boleh mengandung HTML
 * 
 * @param str - String yang akan di-escape
 * @returns String HTML yang sudah di-escape
 * 
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>')
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
    if (!str) return '';
    return String(str).replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Menyaring konten HTML untuk rendering yang aman
 * Mengizinkan subset tag HTML yang umum digunakan dalam data report
 * Menghapus semua tag script, event handlers, dan atribut berbahaya
 * 
 * @param html - String HTML yang akan disaring
 * @returns String HTML yang sudah disanitasi
 * 
 * @example
 * ```typescript
 * sanitizeHtml('<div onclick="alert(\'XSS\')">Content</div>')
 * // '<div>Content</div>'
 * sanitizeHtml('<script>alert("XSS")</div>')
 * // ''
 * ```
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    
    const input = String(html);
    
    // Remove dangerous tags and their contents
    let sanitized = input
        // Remove <script> tags and contents
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove <iframe> tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Remove <object> tags
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        // Remove <embed> tags
        .replace(/<embed\b[^>]*>/gi, '')
        // Remove <link> tags
        .replace(/<link\b[^>]*>/gi, '')
        // Remove <meta> tags
        .replace(/<meta\b[^>]*>/gi, '')
        // Remove <base> tags
        .replace(/<base\b[^>]*>/gi, '')
        // Remove event handlers (on* attributes)
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        // Remove javascript: URLs
        .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
        .replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
        // Remove style attributes that could contain expression() or url()
        .replace(/\s+style\s*=\s*(?:"[^"]*(?:expression|url|behavior|@import)[^"]*"|'[^']*(?:expression|url|behavior|@import)[^']*')/gi, '')
        // Remove data: URLs in src (potential for SVG XSS)
        .replace(/src\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '')
        // Remove vbscript: URLs
        .replace(/href\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*')/gi, 'href="#"');
    
    return sanitized;
}

/**
 * Menyaring konten untuk rendering yang aman dalam sel tabel
 * Untuk data report yang mungkin mengandung formatting dasar tapi harus bebas XSS
 * 
 * @param value - Nilai yang akan disanitasi (bisa berbagai tipe)
 * @returns String yang sudah di-escape
 * 
 * @example
 * ```typescript
 * sanitizeTableCell(null) // '-'
 * sanitizeTableCell('Hello') // 'Hello'
 * sanitizeTableCell('<img src=x onerror=alert(1)>') // '&lt;img src=x onerror=alert(1)&gt;'
 * ```
 */
export function sanitizeTableCell(value: unknown): string {
    if (value === null || value === undefined) return '-';
    const str = String(value);
    // For table cells, escape everything to be safe
    // If data legitimately contains HTML, it should be explicitly sanitized with sanitizeHtml
    return escapeHtml(str);
}
