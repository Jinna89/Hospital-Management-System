import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { auditLogsService } from './audit-logs.service';
import { listAuditLogsQuerySchema } from './audit-logs.validation';

export const auditLogsController = {
  async list(req: Request, res: Response) {
    const query = listAuditLogsQuerySchema.parse(req.query);
    const { items, meta } = await auditLogsService.list(query);
    sendSuccess(res, { message: 'Audit logs retrieved', data: items, meta });
  },
};
