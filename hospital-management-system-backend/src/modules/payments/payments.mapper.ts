import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { toNumber } from '../../lib/decimal';
import { formatDateOnly } from '../../lib/schedule';

export const paymentInclude = {
  appointment: {
    select: {
      id: true,
      appointmentDate: true,
      startTime: true,
      status: true,
      doctor: { select: { name: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

export type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

/** Unique, unguessable transaction id we hand to the gateway for each payment attempt. */
export const generateTranId = (): string => `HMS-${randomUUID()}`;

/** Gateway internals (`gatewayValId`, raw response) are deliberately not exposed. */
export function toPaymentDto(payment: PaymentRow) {
  return {
    id: payment.id,
    appointmentId: payment.appointmentId,
    patientId: payment.patientId,
    amount: toNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
    gateway: payment.gateway,
    tranId: payment.gatewayTranId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    appointment: {
      id: payment.appointment.id,
      appointmentDate: formatDateOnly(payment.appointment.appointmentDate),
      startTime: payment.appointment.startTime,
      status: payment.appointment.status,
      doctorName: payment.appointment.doctor.name,
    },
  };
}
