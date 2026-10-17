import type { Prisma } from '@prisma/client';
import { formatDateOnly } from '../../lib/schedule';

export const consultationInclude = {
  doctor: { select: { id: true, userId: true, name: true, specialty: true } },
  appointment: {
    select: {
      id: true,
      status: true,
      appointmentDate: true,
      startTime: true,
      patient: { select: { id: true, userId: true, user: { select: { name: true } } } },
    },
  },
} satisfies Prisma.ConsultationInclude;

export type ConsultationRow = Prisma.ConsultationGetPayload<{
  include: typeof consultationInclude;
}>;

export function toConsultationDto(row: ConsultationRow) {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    doctorId: row.doctorId,
    patientId: row.patientId,
    chiefComplaint: row.chiefComplaint,
    symptoms: row.symptoms,
    diagnosis: row.diagnosis,
    clinicalNotes: row.clinicalNotes,
    treatmentPlan: row.treatmentPlan,
    followUpDate: row.followUpDate ? formatDateOnly(row.followUpDate) : null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doctor: { id: row.doctor.id, name: row.doctor.name, specialty: row.doctor.specialty },
    patient: { id: row.appointment.patient.id, name: row.appointment.patient.user.name },
    appointment: {
      id: row.appointment.id,
      status: row.appointment.status,
      appointmentDate: formatDateOnly(row.appointment.appointmentDate),
      startTime: row.appointment.startTime,
    },
  };
}
