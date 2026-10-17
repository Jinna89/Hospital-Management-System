import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { consultationsService } from './consultations.service';

export const consultationsController = {
  async create(req: Request, res: Response) {
    const data = await consultationsService.create(getActor(req), req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Consultation started', data });
  },

  async getById(req: Request, res: Response) {
    const data = await consultationsService.getById(getActor(req), req.params.id);
    sendSuccess(res, { message: 'Consultation retrieved', data });
  },

  async update(req: Request, res: Response) {
    const data = await consultationsService.update(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Consultation updated', data });
  },
};
