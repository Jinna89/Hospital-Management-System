import type { Prisma } from '@prisma/client';

/** Prisma `Decimal` columns serialise as strings; the API exposes plain numbers. */
export function toNumber(value: Prisma.Decimal | number | string): number {
  return typeof value === 'number' ? value : Number(value.toString());
}
