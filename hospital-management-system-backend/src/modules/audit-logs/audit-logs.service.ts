import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { ListAuditLogsQuery } from './audit-logs.validation';

export const auditLogsService = {
  async list(query: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        actorId: row.actorId,
        actor: row.actor,
        oldValue: row.oldValue,
        newValue: row.newValue,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
      })),
      meta: toPageMeta(query, total),
    };
  },
};
