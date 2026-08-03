const SUPPORTED_DATABASE_PROVIDERS = new Set(['supabase', 'mysql']);

export const DEFAULT_DATABASE_PROVIDER = 'supabase';

export class DatabaseProviderConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseProviderConfigurationError';
  }
}

export class DatabaseProviderProductionGuardError extends Error {
  constructor(provider) {
    super(
      `APP_DB_PROVIDER=${provider} is limited to local development during the staged rollout. ` +
      'Production must continue using APP_DB_PROVIDER=supabase.'
    );
    this.name = 'DatabaseProviderProductionGuardError';
    this.provider = provider;
  }
}

/**
 * @param {string | undefined | null} rawValue
 * @returns {'supabase' | 'mysql'}
 */
export function resolveDatabaseProvider(rawValue = process.env.APP_DB_PROVIDER) {
  const normalized = String(rawValue ?? '').trim().toLowerCase();
  if (!normalized) return DEFAULT_DATABASE_PROVIDER;

  if (!SUPPORTED_DATABASE_PROVIDERS.has(normalized)) {
    throw new DatabaseProviderConfigurationError(
      `Unsupported APP_DB_PROVIDER=${normalized}. Expected "supabase" or "mysql".`
    );
  }

  return /** @type {'supabase' | 'mysql'} */ (normalized);
}

/**
 * MariaDB activation is intentionally local-only until every application
 * domain has provider parity. Supabase remains operational in every runtime.
 *
 * @param {'supabase' | 'mysql'} provider
 * @param {string | undefined} nodeEnv
 * @returns {'supabase' | 'mysql'}
 */
export function requireOperationalDatabaseProvider(
  provider,
  nodeEnv = process.env.NODE_ENV
) {
  if (provider === 'mysql' && nodeEnv === 'production') {
    throw new DatabaseProviderProductionGuardError(provider);
  }

  return provider;
}

/**
 * @param {string | undefined | null} rawValue
 * @param {string | undefined} nodeEnv
 * @returns {'supabase' | 'mysql'}
 */
export function getOperationalDatabaseProvider(
  rawValue = process.env.APP_DB_PROVIDER,
  nodeEnv = process.env.NODE_ENV
) {
  return requireOperationalDatabaseProvider(
    resolveDatabaseProvider(rawValue),
    nodeEnv
  );
}
