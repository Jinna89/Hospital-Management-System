import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const PORT = 54330;
const DB_NAME = 'hms_test';
const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');

/**
 * Boots a throw-away PostgreSQL server for the whole test run and applies the
 * real Prisma migrations to it, so integration tests exercise the actual
 * constraints (notably the double-booking unique index) instead of mocks.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  // PostgreSQL refuses to run as root; embedded-postgres then switches to an
  // unprivileged OS user, which must be able to create the data directory.
  // Hence a world-writable parent and a *not yet existing* data directory.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hms-pg-'));
  fs.chmodSync(workDir, 0o777);
  const dataDir = path.join(workDir, 'data');
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: false,
  });

  await server.initialise();
  await server.start();
  await server.createDatabase(DB_NAME);

  const client = new pg.Client({
    host: 'localhost',
    port: PORT,
    user: 'postgres',
    password: 'postgres',
    database: DB_NAME,
  });
  await client.connect();
  const migrations = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of migrations) {
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8'));
  }
  await client.end();

  process.env.TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`;

  return async () => {
    await server.stop();
    fs.rmSync(workDir, { recursive: true, force: true });
  };
}
