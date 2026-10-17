import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';
import { appointmentsService } from './appointments.service';
import { listAppointmentsQuerySchema } from './appointments.validation';

export const appointmentsController = {
  async create(req: Request, res: Response) {
    const data = await appointmentsService.create(getActor(req), req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Appointment booked', data });
  },

  async list(req: Request, res: Response) {
    const query = listAppointmentsQuerySchema.parse(req.query);
    const { items, meta } = await appointmentsService.list(getActor(req), query);
    sendSuccess(res, { message: 'Appointments retrieved', data: items, meta });
  },

  async getById(req: Request, res: Response) {
    const data = await appointmentsService.getById(getActor(req), req.params.id);
    sendSuccess(res, { message: 'Appointment retrieved', data });
  },

  async cancel(req: Request, res: Response) {
    const data = await appointmentsService.cancel(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Appointment cancelled', data });
  },

  async reschedule(req: Request, res: Response) {
    const data = await appointmentsService.reschedule(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Appointment rescheduled', data });
  },

  async checkIn(req: Request, res: Response) {
    const data = await appointmentsService.checkIn(getActor(req), req.params.id, requestMeta(req));
    sendSuccess(res, { message: 'Checked in', data });
  },

  async updateStatus(req: Request, res: Response) {
    const data = await appointmentsService.updateStatus(
      getActor(req),
      req.params.id,
      req.body,
      requestMeta(req),
    );
    sendSuccess(res, { message: 'Appointment status updated', data });
  },
};
