import type { NotificationType, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

/** Creates an in-app notification. Safe to call inside a transaction. */
export async function notify(db: Db, input: NotificationInput): Promise<void> {
  await db.notification.create({ data: input });
}
