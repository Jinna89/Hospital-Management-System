import { z } from 'zod';
import { DATE_PATTERN } from '../../lib/schedule';

const longText = (max: number) => z.string().trim().max(max);

export const createConsultationSchema = z.object({
  appointmentId: z.string().uuid(),
  chiefComplaint: longText(1000).optional(),
});

export const updateConsultationSchema = z
  .object({
    chiefComplaint: longText(1000),
    symptoms: longText(2000),
    diagnosis: longText(2000),
    clinicalNotes: longText(5000),
    treatmentPlan: longText(3000),
    followUpDate: z.string().regex(DATE_PATTERN, 'Use the YYYY-MM-DD format'),
    /** `COMPLETED` finalises the record and the appointment; it cannot be undone. */
    status: z.literal('COMPLETED'),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
