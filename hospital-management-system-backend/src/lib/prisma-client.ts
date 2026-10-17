import type { PoolConfig } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export interface PrismaClientOptions {
  /** Maximum connections in this process's pool (keep low on serverless). */
  poolMax?: number;
  log?: ('query' | 'info' | 'warn' | 'error')[];
}

/**
 * Translates a libpq-style `sslmode` into node-postgres options.
 *
 * node-postgres treats `sslmode=require` as full certificate verification,
 * whereas libpq (and Prisma's former native engine) only encrypt the
 * connection. Managed Postgres poolers commonly present certificates that
 * fail strict verification, so `require` keeps its libpq meaning here; use
 * `verify-full` / `verify-ca` when the server certificate should be verified.
 */
export function buildPoolConfig(databaseUrl: string, poolMax = 10): PoolConfig {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  let ssl: PoolConfig['ssl'];
  if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'allow') {
    ssl = { rejectUnauthorized: false };
  } else if (sslMode === 'verify-full' || sslMode === 'verify-ca') {
    ssl = true;
  }

  return { connectionString: url.toString(), max: poolMax, ssl };
}

export function createPrismaClient(
  databaseUrl: string,
  options: PrismaClientOptions = {},
): PrismaClient {
  const adapter = new PrismaPg(buildPoolConfig(databaseUrl, options.poolMax));
  return new PrismaClient({ adapter, log: options.log });
}
