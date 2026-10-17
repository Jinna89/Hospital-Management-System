import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';
import { DATE_PATTERN } from '../../lib/schedule';

const numberFromQuery = z.coerce.number().nonnegative();

const doctorFilters = {
  specialty: z.string().trim().min(1).optional(),
  /** Department id or (case-insensitive) name. */
  department: z.string().trim().min(1).optional(),
  minFee: numberFromQuery.optional(),
  maxFee: numberFromQuery.optional(),
  minExperience: z.coerce.number().int().nonnegative().optional(),
  /** Only doctors who work on this date's weekday and are not on leave that day. */
  availableOn: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format').optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  sortBy: z.enum(['name', 'experience', 'consultationFee', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
};

export const listDoctorsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  ...doctorFilters,
});

export const searchDoctorsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(2, 'Search term must be at least 2 characters'),
  ...doctorFilters,
});

export const updateDoctorProfileSchema = z
  .object({
    specialty: z.string().trim().min(2).max(80),
    qualification: z.string().trim().max(200),
    experienceYears: z.number().int().min(0).max(70),
    consultationFee: z.number().positive().max(1_000_000),
    bio: z.string().trim().max(2000),
    profileImage: z.string().url().max(500),
    departmentIds: z.array(z.string().uuid()).max(5),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
