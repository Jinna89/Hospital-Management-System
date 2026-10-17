import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { analyticsService } from './analytics.service';
import { revenueReportQuerySchema } from './analytics.validation';

export const analyticsController = {
  async dashboardStats(_req: Request, res: Response) {
    const data = await analyticsService.dashboardStats();
    sendSuccess(res, { message: 'Dashboard statistics retrieved', data });
  },

  async revenueReport(req: Request, res: Response) {
    const query = revenueReportQuerySchema.parse(req.query);
    const data = await analyticsService.revenueReport(query);
    sendSuccess(res, { message: 'Revenue report retrieved', data });
  },
};
