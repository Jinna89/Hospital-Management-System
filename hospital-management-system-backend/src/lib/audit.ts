import type { Prisma, PrismaClient } from '@prisma/client';
import type { RequestMeta } from './request';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  meta?: RequestMeta;
}

/**
 * Appends an immutable audit record. Pass the transaction client when the
 * audited change happens inside `prisma.$transaction` so the log and the
 * change commit (or roll back) together.
 */
export async function recordAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.meta?.ip,
      userAgent: entry.meta?.userAgent,
    },
  });
}
