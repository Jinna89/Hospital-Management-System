import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

const prescriptionItemSchema = z
  .object({
    /** Pick an existing catalog entry… */
    medicineId: z.string().uuid().optional(),
    /** …or name a medicine and let the catalog find or create it. */
    medicineName: z.string().trim().min(2).max(120).optional(),
    dosage: z.string().trim().min(1).max(100),
    frequency: z.string().trim().min(1).max(100),
    duration: z.string().trim().min(1).max(100),
    instructions: z.string().trim().max(300).optional(),
  })
  .refine((item) => Boolean(item.medicineId) !== Boolean(item.medicineName), {
    message: 'Provide either medicineId or medicineName',
    path: ['medicineId'],
  });

export const createPrescriptionSchema = z.object({
  consultationId: z.string().uuid(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Add at least one medicine').max(20),
});

export const listPrescriptionsQuerySchema = paginationQuerySchema.extend({
  consultationId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>;
