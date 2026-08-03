export class MySqlConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MySqlConfigurationError';
  }
}

function required(env, name) {
  const value = String(env[name] ?? '').trim();
  if (!value) {
    throw new MySqlConfigurationError(`Missing required ${name}`);
  }
  return value;
}

function positiveInteger(env, name, fallback, maximum) {
  const raw = String(env[name] ?? fallback).trim();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new MySqlConfigurationError(
      `${name} must be an integer between 1 and ${maximum}`
    );
  }
  return parsed;
}

/**
 * Read MariaDB configuration only when the MySQL provider is selected or an
 * explicit health check is run. Secrets are never logged by this module.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 */
export function getMySqlConfig(env = process.env) {
  return {
    host: String(env.MYSQL_HOST ?? '127.0.0.1').trim() || '127.0.0.1',
    port: positiveInteger(env, 'MYSQL_PORT', '3306', 65535),
    database: required(env, 'MYSQL_DATABASE'),
    user: required(env, 'MYSQL_USER'),
    password: required(env, 'MYSQL_PASSWORD'),
    connectionLimit: positiveInteger(
      env,
      'MYSQL_CONNECTION_LIMIT',
      '5',
      100
    ),
    connectTimeout: positiveInteger(
      env,
      'MYSQL_CONNECT_TIMEOUT_MS',
      '5000',
      60000
    ),
  };
}
