import 'server-only';

import { getOperationalDatabaseProvider } from '@/lib/db/provider-config.mjs';

import type { ReferenceDataRepository } from './reference-data-repository';

export async function getReferenceDataRepository(): Promise<ReferenceDataRepository> {
  const provider = getOperationalDatabaseProvider();

  if (provider === 'mysql') {
    const { mysqlReferenceDataRepository } = await import(
      './mysql-reference-data-repository'
    );
    return mysqlReferenceDataRepository;
  }

  const { supabaseReferenceDataRepository } = await import(
    './supabase-reference-data-repository'
  );
  return supabaseReferenceDataRepository;
}
