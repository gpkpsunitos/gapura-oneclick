import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DatabaseProviderConfigurationError,
  DatabaseProviderProductionGuardError,
  DEFAULT_DATABASE_PROVIDER,
  getOperationalDatabaseProvider,
  requireOperationalDatabaseProvider,
  resolveDatabaseProvider,
} from './provider-config.mjs';

test('defaults to Supabase when APP_DB_PROVIDER is absent or blank', () => {
  assert.equal(DEFAULT_DATABASE_PROVIDER, 'supabase');
  assert.equal(resolveDatabaseProvider(undefined), 'supabase');
  assert.equal(resolveDatabaseProvider(null), 'supabase');
  assert.equal(resolveDatabaseProvider('  '), 'supabase');
});

test('recognizes explicit Supabase and MySQL provider values', () => {
  assert.equal(resolveDatabaseProvider('supabase'), 'supabase');
  assert.equal(resolveDatabaseProvider(' SUPABASE '), 'supabase');
  assert.equal(resolveDatabaseProvider('mysql'), 'mysql');
  assert.equal(resolveDatabaseProvider(' MySQL '), 'mysql');
});

test('rejects unknown provider values instead of silently falling back', () => {
  assert.throws(
    () => resolveDatabaseProvider('mariadb'),
    (error) => {
      assert.ok(error instanceof DatabaseProviderConfigurationError);
      assert.match(error.message, /Expected "supabase" or "mysql"/);
      return true;
    }
  );
});

test('keeps Supabase operational in development and production', () => {
  assert.equal(
    requireOperationalDatabaseProvider('supabase', 'development'),
    'supabase'
  );
  assert.equal(
    getOperationalDatabaseProvider('supabase', 'production'),
    'supabase'
  );
});

test('allows staged MySQL activation outside production', () => {
  assert.equal(
    requireOperationalDatabaseProvider('mysql', 'development'),
    'mysql'
  );
  assert.equal(getOperationalDatabaseProvider('mysql', 'test'), 'mysql');
  assert.equal(getOperationalDatabaseProvider('mysql', undefined), 'mysql');
});

test('blocks MySQL activation in production', () => {
  assert.throws(
    () => getOperationalDatabaseProvider('mysql', 'production'),
    (error) => {
      assert.ok(error instanceof DatabaseProviderProductionGuardError);
      assert.equal(error.provider, 'mysql');
      assert.match(error.message, /limited to local development/);
      return true;
    }
  );
});
