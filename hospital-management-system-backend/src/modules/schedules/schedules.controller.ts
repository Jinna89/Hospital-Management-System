import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { schedulesService } from './schedules.service';
import { availableSlotsQuerySchema } from './schedules.validation';

export const schedulesController = {
  async list(req: Request, res: Response) {
    const data = await schedulesService.listSchedules(getActor(req).id);
    sendSuccess(res, { message: 'Schedules retrieved', data });
  },

  async create(req: Request, res: Response) {
    const data = await schedulesService.createSchedule(
      getActor(req).id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { statusCode: 201, message: 'Schedule created', data });
  },

  async update(req: Request, res: Response) {
    const data = await schedulesService.updateSchedule(
      getActor(req).id,
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Schedule updated', data });
  },

  async remove(req: Request, res: Response) {
    await schedulesService.removeSchedule(getActor(req).id, req.params.id, requestMeta(req));
    sendSuccess(res, { message: 'Schedule deleted' });
  },

  async listLeaves(req: Request, res: Response) {
    const data = await schedulesService.listLeaves(getActor(req).id);
    sendSuccess(res, { message: 'Leaves retrieved', data });
  },

  async createLeave(req: Request, res: Response) {
    const data = await schedulesService.createLeave(getActor(req).id, req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Leave created', data });
  },

  async removeLeave(req: Request, res: Response) {
    await schedulesService.removeLeave(getActor(req).id, req.params.id, requestMeta(req));
    sendSuccess(res, { message: 'Leave deleted' });
  },

  async availableSlots(req: Request, res: Response) {
    const { date } = availableSlotsQuerySchema.parse(req.query);
    const data = await schedulesService.availableSlots(req.params.id, date);
    sendSuccess(res, { message: 'Available slots retrieved', data });
  },
};
