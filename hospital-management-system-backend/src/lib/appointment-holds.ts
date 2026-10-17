import type { Prisma, PrismaClient } from '@prisma/client';
import { PENDING_PAYMENT_TTL_MINUTES } from '../config/rules';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * An unpaid booking must not hold a slot forever. Anything still
 * PENDING_PAYMENT after the TTL is cancelled and its slot freed, so the
 * unique "one active booking per slot" index stops blocking other patients.
 *
 * Run lazily (before availability reads and bookings) instead of via a cron,
 * which keeps the API free of background infrastructure and works on
 * serverless hosts.
 */
export async function releaseExpiredHolds(
  db: Db,
  scope: Prisma.AppointmentWhereInput = {},
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - PENDING_PAYMENT_TTL_MINUTES * 60_000);
  const expired = await db.appointment.findMany({
    where: { ...scope, status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  const ids = expired.map((row) => row.id);
  await db.appointment.updateMany({
    where: { id: { in: ids }, status: 'PENDING_PAYMENT' },
    data: {
      status: 'CANCELLED',
      holdsSlot: null,
      cancelReason: 'Payment was not completed in time',
    },
  });
  await db.appointmentStatusHistory.createMany({
    data: ids.map((appointmentId) => ({
      appointmentId,
      fromStatus: 'PENDING_PAYMENT' as const,
      toStatus: 'CANCELLED' as const,
      changedBy: 'system',
      note: 'Payment window expired',
    })),
  });
  return ids.length;
}
