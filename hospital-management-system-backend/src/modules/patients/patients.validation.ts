import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';
import { DATE_PATTERN } from '../../lib/schedule';

export const updatePatientProfileSchema = z
  .object({
    dateOfBirth: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format').optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    bloodGroup: z
      .string()
      .trim()
      .regex(/^(A|B|AB|O)[+-]$/, 'Use a blood group such as A+ or O-')
      .optional(),
    address: z.string().trim().max(500).optional(),
    emergencyContact: z.string().trim().max(120).optional(),
    allergies: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
