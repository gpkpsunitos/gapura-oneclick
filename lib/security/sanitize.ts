
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

const HTML_ENTITY_REGEX = /[&<>"'/]/g;

export function escapeHtml(str: string): string {
    if (!str) return '';
    return String(str).replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char);
}

const DANGEROUS_TAGS = /\b(script|iframe|object|embed|link|meta|base|svg|math|style|form|input|textarea|select|button|template|noscript|body|frame|frameset|applet)\b/gi;

export function sanitizeHtml(html: string): string {
    if (!html) return '';

    let sanitized = String(html);

    sanitized = sanitized
        .replace(/<(script|iframe|object|embed|link|meta|base|svg|math|style|form|input|textarea|select|button|template|noscript|body|frame|frameset|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
        .replace(/<(script|iframe|object|embed|link|meta|base|svg|math|style|form|input|textarea|select|button|template|noscript|body|frame|frameset|applet)\b[^>]*>/gi, '')
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src|action|data|formaction)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"')
        .replace(/(href|src|action|data|formaction)\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*')/gi, '$1="#"')
        .replace(/src\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '')
        .replace(/href\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, 'href="#"')
        .replace(/\s+style\s*=\s*(?:"[^"]*(?:expression|url|behavior|@import)[^"]*"|'[^']*(?:expression|url|behavior|@import)[^']*')/gi, '');

    return sanitized;
}

export function sanitizeTableCell(value: unknown): string {
    if (value === null || value === undefined) return '-';
    const str = String(value);

    return escapeHtml(str);
}
