import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { laboratoryService } from './laboratory.service';
import { listLabRequestsQuerySchema, listLabTestsQuerySchema } from './laboratory.validation';

export const laboratoryController = {
  async listTests(req: Request, res: Response) {
    const query = listLabTestsQuerySchema.parse(req.query);
    const { items, meta } = await laboratoryService.listTests(query);
    sendSuccess(res, { message: 'Lab tests retrieved', data: items, meta });
  },

  async create(req: Request, res: Response) {
    const data = await laboratoryService.create(getActor(req), req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Lab test requested', data });
  },

  async list(req: Request, res: Response) {
    const query = listLabRequestsQuerySchema.parse(req.query);
    const { items, meta } = await laboratoryService.list(getActor(req), query);
    sendSuccess(res, { message: 'Lab test requests retrieved', data: items, meta });
  },

  async getById(req: Request, res: Response) {
    const data = await laboratoryService.getById(getActor(req), req.params.id);
    sendSuccess(res, { message: 'Lab test request retrieved', data });
  },

  async updateResult(req: Request, res: Response) {
    const data = await laboratoryService.updateResult(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Lab test request updated', data });
  },
};
