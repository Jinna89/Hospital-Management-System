import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { adminService } from './admin.service';
import { listUsersQuerySchema } from './admin.validation';

export const adminController = {
  async listUsers(req: Request, res: Response) {
    const query = listUsersQuerySchema.parse(req.query);
    const { items, meta } = await adminService.listUsers(query);
    sendSuccess(res, { message: 'Users retrieved', data: items, meta });
  },

  async updateUserStatus(req: Request, res: Response) {
    const data = await adminService.updateUserStatus(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'User status updated', data });
  },

  async verifyDoctor(req: Request, res: Response) {
    const data = await adminService.verifyDoctor(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Doctor verification updated', data });
  },
};
