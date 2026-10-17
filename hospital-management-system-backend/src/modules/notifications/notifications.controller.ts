import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor } from '../../lib/request';
import { notificationsService } from './notifications.service';
import { listNotificationsQuerySchema } from './notifications.validation';

export const notificationsController = {
  async list(req: Request, res: Response) {
    const query = listNotificationsQuerySchema.parse(req.query);
    const { items, meta } = await notificationsService.list(getActor(req).id, query);
    sendSuccess(res, { message: 'Notifications retrieved', data: items, meta });
  },

  async unreadCount(req: Request, res: Response) {
    const data = await notificationsService.unreadCount(getActor(req).id);
    sendSuccess(res, { message: 'Unread count retrieved', data });
  },

  async markRead(req: Request, res: Response) {
    const data = await notificationsService.markRead(getActor(req).id, req.params.id);
    sendSuccess(res, { message: 'Notification marked as read', data });
  },

  async markAllRead(req: Request, res: Response) {
    const data = await notificationsService.markAllRead(getActor(req).id);
    sendSuccess(res, { message: 'All notifications marked as read', data });
  },
};
