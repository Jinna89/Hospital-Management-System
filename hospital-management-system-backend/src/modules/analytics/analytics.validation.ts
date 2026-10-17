import { z } from 'zod';
import { DATE_PATTERN } from '../../lib/schedule';

const dateOnly = z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format');

export const revenueReportQuerySchema = z
  .object({ from: dateOnly.optional(), to: dateOnly.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export type RevenueReportQuery = z.infer<typeof revenueReportQuerySchema>;
