import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
});

export const verifyDoctorSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type VerifyDoctorInput = z.infer<typeof verifyDoctorSchema>;
