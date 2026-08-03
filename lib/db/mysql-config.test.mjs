import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMySqlConfig,
  MySqlConfigurationError,
} from './mysql-config.mjs';

const REQUIRED = {
  MYSQL_DATABASE: 'gapura_oneclick_local',
  MYSQL_USER: 'gapura_app',
  MYSQL_PASSWORD: 'test-only-password',
};

test('uses safe local connection defaults', () => {
  assert.deepEqual(getMySqlConfig(REQUIRED), {
    host: '127.0.0.1',
    port: 3306,
    database: 'gapura_oneclick_local',
    user: 'gapura_app',
    password: 'test-only-password',
    connectionLimit: 5,
    connectTimeout: 5000,
  });
});

test('parses explicit bounded numeric settings', () => {
  const config = getMySqlConfig({
    ...REQUIRED,
    MYSQL_HOST: 'localhost',
    MYSQL_PORT: '3307',
    MYSQL_CONNECTION_LIMIT: '8',
    MYSQL_CONNECT_TIMEOUT_MS: '12000',
  });

  assert.equal(config.host, 'localhost');
  assert.equal(config.port, 3307);
  assert.equal(config.connectionLimit, 8);
  assert.equal(config.connectTimeout, 12000);
});

test('requires database, application user, and password', () => {
  for (const name of ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']) {
    assert.throws(
      () => getMySqlConfig({ ...REQUIRED, [name]: '' }),
      (error) => {
        assert.ok(error instanceof MySqlConfigurationError);
        assert.match(error.message, new RegExp(name));
        return true;
      }
    );
  }
});

test('rejects invalid ports and connection limits', () => {
  assert.throws(
    () => getMySqlConfig({ ...REQUIRED, MYSQL_PORT: '70000' }),
    MySqlConfigurationError
  );
  assert.throws(
    () => getMySqlConfig({ ...REQUIRED, MYSQL_CONNECTION_LIMIT: '0' }),
    MySqlConfigurationError
  );
});
