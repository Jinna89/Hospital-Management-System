import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { departmentsService } from './departments.service';

export const departmentsController = {
  async list(req: Request, res: Response) {
    const data = await departmentsService.list({ includeInactive: req.user?.role === 'ADMIN' });
    sendSuccess(res, { message: 'Departments retrieved', data });
  },

  async create(req: Request, res: Response) {
    const data = await departmentsService.create(req.body, getActor(req).id, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Department created', data });
  },

  async update(req: Request, res: Response) {
    const data = await departmentsService.update(
      req.params.id,
      req.body,
      getActor(req).id,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Department updated', data });
  },

  async remove(req: Request, res: Response) {
    await departmentsService.remove(req.params.id, getActor(req).id, requestMeta(req));
    sendSuccess(res, { message: 'Department deleted' });
  },
};
