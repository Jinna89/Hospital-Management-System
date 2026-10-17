import type { Prisma } from '@prisma/client';

export const prescriptionInclude = {
  doctor: { select: { id: true, name: true, specialty: true } },
  patient: { select: { id: true, user: { select: { name: true } } } },
  consultation: { select: { id: true, diagnosis: true, appointmentId: true } },
  items: {
    include: { medicine: { select: { id: true, name: true, strength: true, form: true } } },
  },
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionRow = Prisma.PrescriptionGetPayload<{
  include: typeof prescriptionInclude;
}>;

export function toPrescriptionDto(row: PrescriptionRow) {
  return {
    id: row.id,
    consultationId: row.consultationId,
    appointmentId: row.consultation.appointmentId,
    doctorId: row.doctorId,
    patientId: row.patientId,
    doctor: row.doctor,
    patient: { id: row.patient.id, name: row.patient.user.name },
    diagnosis: row.consultation.diagnosis,
    notes: row.notes,
    createdAt: row.createdAt,
    items: row.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      medicine: item.medicine,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
  };
}
