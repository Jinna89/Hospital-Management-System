import type { Prisma } from '@prisma/client';
import { toNumber } from '../../lib/decimal';
import { formatDateOnly } from '../../lib/schedule';

export const appointmentInclude = {
  doctor: {
    select: { id: true, userId: true, name: true, specialty: true, consultationFee: true },
  },
  patient: {
    select: { id: true, userId: true, user: { select: { name: true, email: true, phone: true } } },
  },
  payment: { select: { id: true, status: true, amount: true, currency: true } },
  consultation: { select: { id: true, status: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export function toAppointmentDto(row: AppointmentRow) {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    appointmentDate: formatDateOnly(row.appointmentDate),
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    consultationFee: toNumber(row.consultationFee),
    reason: row.reason,
    cancelReason: row.cancelReason,
    doctor: {
      id: row.doctor.id,
      name: row.doctor.name,
      specialty: row.doctor.specialty,
      consultationFee: toNumber(row.doctor.consultationFee),
    },
    patient: {
      id: row.patient.id,
      name: row.patient.user.name,
      email: row.patient.user.email,
      phone: row.patient.user.phone,
    },
    payment: row.payment
      ? {
          id: row.payment.id,
          status: row.payment.status,
          amount: toNumber(row.payment.amount),
          currency: row.payment.currency,
        }
      : null,
    consultation: row.consultation,
    createdAt: row.createdAt,
  };
}
