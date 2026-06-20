/**
 * @file
 * 
 * File ini berisi konfigurasi client Supabase dengan hak admin
 */

import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export { createSupabaseClient as createClient };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
    throw new Error('[FATAL] SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Admin operations cannot proceed.');
}

/**
 * Client Supabase dengan hak admin
 * Client ini memiliki hak istimewa dan mem-bypass RLS (Row Level Security)
 * Gunakan dengan sangat hati-hati dan selalu verifikasi permission secara manual
 * 
 * @example
 * ```ts
 * const { data, error } = await supabaseAdmin
 *   .from('reports')
 *   .select('*')
 *   .eq('id', reportId);
 * ```
 */
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
