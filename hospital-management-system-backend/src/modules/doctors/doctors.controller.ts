import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { doctorsService } from './doctors.service';
import { listDoctorsQuerySchema, searchDoctorsQuerySchema } from './doctors.validation';

export const doctorsController = {
  async list(req: Request, res: Response) {
    const query = listDoctorsQuerySchema.parse(req.query);
    const { items, meta } = await doctorsService.list(query, getActor(req));
    sendSuccess(res, { message: 'Doctors retrieved', data: items, meta });
  },

  async search(req: Request, res: Response) {
    const query = searchDoctorsQuerySchema.parse(req.query);
    const { items, meta } = await doctorsService.list(query, getActor(req));
    sendSuccess(res, { message: 'Doctors retrieved', data: items, meta });
  },

  async getById(req: Request, res: Response) {
    const data = await doctorsService.getById(req.params.id, getActor(req));
    sendSuccess(res, { message: 'Doctor retrieved', data });
  },

  async getMe(req: Request, res: Response) {
    const data = await doctorsService.getMine(getActor(req).id);
    sendSuccess(res, { message: 'Doctor profile retrieved', data });
  },

  async updateMe(req: Request, res: Response) {
    const data = await doctorsService.updateMine(getActor(req).id, req.body, requestMeta(req));
    sendSuccess(res, { message: 'Doctor profile updated', data });
  },
};
