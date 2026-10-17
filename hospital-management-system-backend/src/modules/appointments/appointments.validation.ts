import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';
import { DATE_PATTERN, TIME_PATTERN } from '../../lib/schedule';

const dateOnly = z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format');
const time = z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm');

const APPOINTMENT_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
] as const;

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  appointmentDate: dateOnly,
  startTime: time,
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: dateOnly,
  startTime: time,
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

/**
 * Only the transitions a clinician may trigger by hand. Confirmation is
 * deliberately absent (it follows verified payment), and so is cancellation
 * (which has its own endpoint because it carries refund rules).
 */
export const updateStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'NO_SHOW']),
});

export const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
