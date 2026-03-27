import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export { createSupabaseClient as createClient };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations will fail.');
}

// Note: This client has admin privileges and bypasses RLS.
// Use with extreme caution and always verify permissions manually.
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
