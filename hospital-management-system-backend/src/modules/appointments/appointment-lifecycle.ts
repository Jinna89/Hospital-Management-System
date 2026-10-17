import type { Appointment, AppointmentStatus, Payment, Prisma } from '@prisma/client';
import { FULL_REFUND_WINDOW_HOURS } from '../../config/rules';
import { env } from '../../config/env';
import { assertTransition, releasesSlot } from '../../lib/appointment-state';
import { recordAudit } from '../../lib/audit';
import { notify } from '../../lib/notifications';
import type { Actor, RequestMeta } from '../../lib/request';
import { formatDateOnly, slotStartsAt } from '../../lib/schedule';
import { AppError } from '../../utils/AppError';

type Tx = Prisma.TransactionClient;

/** Everything a status change needs to know about the appointment's participants. */
export type LifecycleAppointment = Appointment & {
  payment: Payment | null;
  doctor: { userId: string; name: string };
  patient: { userId: string };
};

export const lifecycleInclude = {
  payment: true,
  doctor: { select: { userId: true, name: true } },
  patient: { select: { userId: true } },
} satisfies Prisma.AppointmentInclude;

export const appointmentStartsAt = (
  appointment: Pick<Appointment, 'appointmentDate' | 'startTime'>,
) =>
  slotStartsAt(
    formatDateOnly(appointment.appointmentDate),
    appointment.startTime,
    env.HOSPITAL_UTC_OFFSET_MINUTES,
  );

export interface TransitionOptions {
  changedBy: string;
  note?: string;
  /** Extra columns to write together with the status. */
  data?: Prisma.AppointmentUncheckedUpdateManyInput;
}

/**
 * Moves an appointment to `to` after checking the state machine.
 *
 * The update is conditional on the status we read, so two concurrent actors
 * (say a cancel racing a payment confirmation) cannot both win: the loser
 * sees a conflict instead of silently overwriting the other's change.
 */
export async function transitionAppointment(
  tx: Tx,
  appointment: Pick<Appointment, 'id' | 'status'>,
  to: AppointmentStatus,
  options: TransitionOptions,
): Promise<void> {
  assertTransition(appointment.status, to);

  const { count } = await tx.appointment.updateMany({
    where: { id: appointment.id, status: appointment.status },
    data: { ...options.data, status: to, ...(releasesSlot(to) ? { holdsSlot: null } : {}) },
  });
  if (count === 0) {
    throw AppError.conflict('The appointment was changed by someone else, please retry');
  }

  await tx.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: appointment.status,
      toStatus: to,
      changedBy: options.changedBy,
      note: options.note,
    },
  });
}

export interface CancellationOptions {
  actor: Actor;
  reason?: string;
  meta: RequestMeta;
  /** Clinic-initiated cancellations (doctor, admin, leave) always refund in full. */
  fullRefund?: boolean;
  now?: Date;
}

export interface CancellationResult {
  refunded: boolean;
}

/** Cancels an appointment, settles its payment and notifies both parties — all inside `tx`. */
export async function cancelAppointmentInTx(
  tx: Tx,
  appointment: LifecycleAppointment,
  options: CancellationOptions,
): Promise<CancellationResult> {
  const now = options.now ?? new Date();
  if (appointment.status === 'COMPLETED') {
    throw AppError.conflict('Completed appointments cannot be cancelled');
  }

  await transitionAppointment(tx, appointment, 'CANCELLED', {
    changedBy: options.actor.id,
    note: options.reason,
    data: { cancelReason: options.reason ?? 'Cancelled' },
  });

  let refunded = false;
  const payment = appointment.payment;
  if (payment?.status === 'PAID') {
    const hoursUntil = (appointmentStartsAt(appointment).getTime() - now.getTime()) / 3_600_000;
    refunded = options.fullRefund === true || hoursUntil >= FULL_REFUND_WINDOW_HOURS;
    if (refunded) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      await recordAudit(tx, {
        actorId: options.actor.id,
        action: 'PAYMENT_REFUNDED',
        entityType: 'Payment',
        entityId: payment.id,
        oldValue: { status: 'PAID' },
        newValue: { status: 'REFUNDED' },
        meta: options.meta,
      });
    }
  } else if (payment && payment.status !== 'REFUNDED' && payment.status !== 'CANCELLED') {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'CANCELLED' } });
  }

  await recordAudit(tx, {
    actorId: options.actor.id,
    action: 'APPOINTMENT_CANCELLED',
    entityType: 'Appointment',
    entityId: appointment.id,
    oldValue: { status: appointment.status },
    newValue: { status: 'CANCELLED', reason: options.reason ?? null, refunded },
    meta: options.meta,
  });

  const when = `${formatDateOnly(appointment.appointmentDate)} ${appointment.startTime}`;
  const refundNote = refunded ? ' The fee has been refunded.' : '';
  const recipients = new Set([appointment.patient.userId, appointment.doctor.userId]);
  recipients.delete(options.actor.id);
  for (const userId of recipients) {
    await notify(tx, {
      userId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Appointment cancelled',
      message: `The appointment on ${when} was cancelled.${refundNote}`,
      metadata: { appointmentId: appointment.id },
    });
  }

  return { refunded };
}

/**
 * Finishes a consultation: locks the clinical record, completes the
 * appointment and tells the patient. Shared by the consultation and
 * appointment-status endpoints so both enforce the same rules.
 */
export async function completeConsultationInTx(
  tx: Tx,
  appointment: LifecycleAppointment,
  actorId: string,
): Promise<void> {
  const consultation = await tx.consultation.findUnique({
    where: { appointmentId: appointment.id },
    select: { id: true, diagnosis: true },
  });
  if (!consultation) {
    throw AppError.conflict('Start the consultation before completing the appointment');
  }
  if (!consultation.diagnosis?.trim()) {
    throw AppError.unprocessable('Record a diagnosis before completing the consultation');
  }

  await transitionAppointment(tx, appointment, 'COMPLETED', { changedBy: actorId });
  await tx.consultation.update({ where: { id: consultation.id }, data: { status: 'COMPLETED' } });
  await notify(tx, {
    userId: appointment.patient.userId,
    type: 'CONSULTATION_COMPLETED',
    title: 'Consultation completed',
    message: `Your consultation with ${appointment.doctor.name} is complete.`,
    metadata: { consultationId: consultation.id, appointmentId: appointment.id },
  });
}
