/**
 * GET /api/ai/analyze-all — legacy alias of /api/ai/overview.
 * The old per-record batch analysis API no longer exists on the ML
 * service; callers should migrate to /api/ai/overview.
 */
export { GET } from '../overview/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
