/**
 * GET /api/ai/seasonality/forecast — alias of /api/ai/forecast/seasonal,
 * kept for existing callers.
 */
export { GET } from '../../forecast/seasonal/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
