import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../lib/prisma-client';
import { env, isProduction } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// In dev, tsx watch re-executes this module on every file change; without a
// global singleton that would open a new connection pool on every reload.
export const prisma =
  global.__prisma__ ??
  createPrismaClient(env.DATABASE_URL, {
    poolMax: env.DATABASE_POOL_MAX,
    log: ['error', 'warn'],
  });

if (!isProduction) {
  global.__prisma__ = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
