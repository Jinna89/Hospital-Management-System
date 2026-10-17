import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

const LAB_STATUSES = [
  'REQUESTED',
  'SAMPLE_COLLECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'RESULT_AVAILABLE',
  'CANCELLED',
] as const;

export const createLabRequestSchema = z.object({
  consultationId: z.string().uuid(),
  labTestId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const listLabRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(LAB_STATUSES).optional(),
  consultationId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export const updateLabResultSchema = z.object({
  status: z.enum(LAB_STATUSES.filter((s) => s !== 'REQUESTED') as [string, ...string[]]),
  resultSummary: z.string().trim().min(1).max(2000).optional(),
  resultFileUrl: z.string().trim().url().max(500).optional(),
});

export const listLabTestsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

export type CreateLabRequestInput = z.infer<typeof createLabRequestSchema>;
export type ListLabRequestsQuery = z.infer<typeof listLabRequestsQuerySchema>;
export type UpdateLabResultInput = z.infer<typeof updateLabResultSchema>;
export type ListLabTestsQuery = z.infer<typeof listLabTestsQuerySchema>;
