import { z } from "zod";

export const complaintSchema = z.object({
  chiefComplaint: z.string().trim().min(3, "Describe the chief complaint"),
});

export const clinicalSchema = z.object({
  symptoms: z.string().trim().min(1, "Symptoms are required"),
  diagnosis: z.string().trim().min(1, "Diagnosis is required"),
  clinicalNotes: z.string().trim().optional(),
  treatmentPlan: z.string().trim().optional(),
});

const prescriptionItemSchema = z.object({
  medicineId: z.string().trim().min(1, "Medicine is required"),
  dosage: z.string().trim().min(1, "Dosage is required"),
  frequency: z.string().trim().min(1, "Frequency is required"),
  duration: z.string().trim().min(1, "Duration is required"),
  instructions: z.string().trim().optional(),
});

export const prescriptionSchema = z.object({
  notes: z.string().trim().optional(),
  items: z.array(prescriptionItemSchema).min(1, "Add at least one medicine").max(10),
});

export const labRequestSchema = z.object({
  labTestId: z.string().trim().min(1, "Lab test is required"),
  notes: z.string().trim().optional(),
});

export type ComplaintValues = z.infer<typeof complaintSchema>;
export type ClinicalValues = z.infer<typeof clinicalSchema>;
export type PrescriptionValues = z.infer<typeof prescriptionSchema>;
export type LabRequestValues = z.infer<typeof labRequestSchema>;
