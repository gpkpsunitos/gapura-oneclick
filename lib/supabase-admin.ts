import 'server-only';
import { createMysqlClient } from '@/lib/mysql/client';

export function createClient() {
  return createMysqlClient();
}

export const supabaseAdmin = createMysqlClient();
