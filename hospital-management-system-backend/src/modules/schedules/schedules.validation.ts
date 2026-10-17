import { z } from 'zod';
import { DATE_PATTERN, TIME_PATTERN } from '../../lib/schedule';

const time = z.string().regex(TIME_PATTERN, 'Use 24-hour HH:mm');
const dayOfWeek = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const createScheduleSchema = z.object({
  dayOfWeek,
  startTime: time,
  endTime: time,
  consultationDurationMins: z.number().int().min(5).max(240).default(20),
  breakStartTime: time.optional(),
  breakEndTime: time.optional(),
});

export const updateScheduleSchema = createScheduleSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const createLeaveSchema = z
  .object({
    startDate: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format'),
    endDate: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format'),
    reason: z.string().trim().max(300).optional(),
    /** Cancel (and fully refund) appointments that fall inside the leave instead of rejecting it. */
    cancelConflictingAppointments: z.boolean().default(false),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const availableSlotsQuerySchema = z.object({
  date: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format'),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
