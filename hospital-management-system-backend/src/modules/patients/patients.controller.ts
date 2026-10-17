import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor } from '../../lib/request';
import { patientsService } from './patients.service';
import { listPatientsQuerySchema } from './patients.validation';

export const patientsController = {
  async getMe(req: Request, res: Response) {
    const data = await patientsService.getMine(getActor(req).id);
    sendSuccess(res, { message: 'Patient profile retrieved', data });
  },

  async updateMe(req: Request, res: Response) {
    const data = await patientsService.updateMine(getActor(req).id, req.body);
    sendSuccess(res, { message: 'Patient profile updated', data });
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await patientsService.list(listPatientsQuerySchema.parse(req.query));
    sendSuccess(res, { message: 'Patients retrieved', data: items, meta });
  },

  async history(req: Request, res: Response) {
    const data = await patientsService.getHistory(req.params.id, getActor(req));
    sendSuccess(res, { message: 'Patient medical history retrieved', data });
  },
};
