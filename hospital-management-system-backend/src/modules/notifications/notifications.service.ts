import type { Notification, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import { AppError } from '../../utils/AppError';
import type { ListNotificationsQuery } from './notifications.validation';

function toNotificationDto(row: Notification) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.isRead,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export const notificationsService = {
  async list(userId: string, query: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.isRead === undefined ? {} : { isRead: query.isRead }),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where }),
    ]);
    return { items: rows.map(toNotificationDto), meta: toPageMeta(query, total) };
  },

  async unreadCount(userId: string) {
    return { count: await prisma.notification.count({ where: { userId, isRead: false } }) };
  },

  async markRead(userId: string, id: string) {
    // Scoped by owner so one user can never touch another's notification.
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count === 0) throw AppError.notFound('Notification not found');
    const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
    return toNotificationDto(row);
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  },
};
