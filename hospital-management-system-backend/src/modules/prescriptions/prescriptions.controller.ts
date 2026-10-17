import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { prescriptionsService } from './prescriptions.service';
import { listPrescriptionsQuerySchema } from './prescriptions.validation';

export const prescriptionsController = {
  async create(req: Request, res: Response) {
    const data = await prescriptionsService.create(getActor(req), req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Prescription created', data });
  },

  async list(req: Request, res: Response) {
    const query = listPrescriptionsQuerySchema.parse(req.query);
    const { items, meta } = await prescriptionsService.list(getActor(req), query);
    sendSuccess(res, { message: 'Prescriptions retrieved', data: items, meta });
  },

  async getById(req: Request, res: Response) {
    const data = await prescriptionsService.getById(getActor(req), req.params.id);
    sendSuccess(res, { message: 'Prescription retrieved', data });
  },
};
