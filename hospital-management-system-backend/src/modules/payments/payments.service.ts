import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { releaseExpiredHolds } from '../../lib/appointment-holds';
import { recordAudit } from '../../lib/audit';
import { notify } from '../../lib/notifications';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { formatDateOnly, parseDateOnly, slotStartsAt } from '../../lib/schedule';
import { sslcommerz } from '../../lib/sslcommerz';
import { AppError } from '../../utils/AppError';
import { lifecycleInclude, transitionAppointment } from '../appointments/appointment-lifecycle';
import { generateTranId, paymentInclude, toPaymentDto } from './payments.mapper';
import type { ListPaymentsQuery } from './payments.validation';

const SUCCESSFUL_GATEWAY_STATUSES = ['VALID', 'VALIDATED'];
const AMOUNT_TOLERANCE = 0.01;
/** A payment may be (re)attempted until it succeeds: these states can still become PAID. */
const PAYABLE_STATUSES = ['PENDING', 'FAILED', 'CANCELLED'] as const;

const callbackUrl = (path: string) => `${env.API_PUBLIC_URL}${env.API_BASE_PATH}/payments/${path}`;

export interface CallbackOutcome {
  paymentId: string;
  appointmentId: string;
  status: string;
}

function visibleTo(actor: Actor): Prisma.PaymentWhereInput {
  return actor.role === 'PATIENT' ? { patient: { userId: actor.id } } : {};
}

async function findByTranId(tranId: string) {
  const payment = await prisma.payment.findUnique({ where: { gatewayTranId: tranId } });
  if (!payment) throw AppError.notFound('Unknown payment transaction');
  return payment;
}

export const paymentsService = {
  /** Starts a hosted checkout for an unpaid appointment and returns the gateway URL. */
  async initiate(actor: Actor, appointmentId: string, meta: RequestMeta) {
    await releaseExpiredHolds(prisma, { id: appointmentId });
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { userId: actor.id } },
      include: {
        payment: true,
        doctor: { select: { name: true } },
        patient: {
          select: { id: true, user: { select: { name: true, email: true, phone: true } } },
        },
      },
    });
    if (!appointment) throw AppError.notFound('Appointment not found');
    if (appointment.status === 'CANCELLED') {
      throw AppError.conflict('This booking expired or was cancelled, please book again');
    }
    if (appointment.status !== 'PENDING_PAYMENT') {
      throw AppError.conflict('Only appointments awaiting payment can be paid');
    }
    if (appointment.payment?.status === 'PAID') throw AppError.conflict('Already paid');

    // The charge is always the fee snapshotted when the slot was booked.
    const amount = Number(appointment.consultationFee);
    const tranId = generateTranId();

    // Persist the transaction id *before* the patient can possibly pay with it.
    const payment = await prisma.payment.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        patientId: appointment.patient.id,
        amount: appointment.consultationFee,
        gatewayTranId: tranId,
      },
      update: { gatewayTranId: tranId, status: 'PENDING', amount: appointment.consultationFee },
    });

    const session = await sslcommerz.createSession({
      tranId,
      amount,
      currency: payment.currency,
      successUrl: callbackUrl('success'),
      failUrl: callbackUrl('fail'),
      cancelUrl: callbackUrl('cancel'),
      ipnUrl: callbackUrl('ipn'),
      productName: `Consultation with ${appointment.doctor.name}`,
      customer: appointment.patient.user,
    });

    await recordAudit(prisma, {
      actorId: actor.id,
      action: 'PAYMENT_INITIATED',
      entityType: 'Payment',
      entityId: payment.id,
      newValue: { tranId, amount },
      meta,
    });

    return {
      paymentId: payment.id,
      tranId,
      amount,
      currency: payment.currency,
      gatewayUrl: session.gatewayUrl,
    };
  },

  /**
   * Confirms a payment from a gateway callback or IPN.
   *
   * Nothing in the callback is believed: the `val_id` is sent back to
   * SSLCommerz, and only a VALID answer whose transaction id, amount and
   * currency all match our own record marks the payment PAID. The state
   * change is a conditional update, so duplicate or concurrent callbacks
   * (browser redirect + IPN) confirm exactly once.
   */
  async confirm(
    tranId: string,
    valId: string | undefined,
    meta: RequestMeta,
  ): Promise<CallbackOutcome> {
    const existing = await findByTranId(tranId);
    const settled = (status: string): CallbackOutcome => ({
      paymentId: existing.id,
      appointmentId: existing.appointmentId,
      status,
    });
    if (existing.status === 'PAID') return settled('PAID');
    if (!valId) throw AppError.unprocessable('The gateway did not send a validation id');

    const verdict = await sslcommerz.validate(valId);
    const matches =
      SUCCESSFUL_GATEWAY_STATUSES.includes(verdict.status) &&
      verdict.tranId === existing.gatewayTranId &&
      verdict.currency === existing.currency &&
      Math.abs(verdict.amount - Number(existing.amount)) < AMOUNT_TOLERANCE;

    if (!matches) {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.payment.updateMany({
          where: { id: existing.id, status: 'PENDING' },
          data: { status: 'FAILED', gatewayResponse: verdict.raw as Prisma.InputJsonValue },
        });
        if (count > 0) {
          await recordAudit(tx, {
            action: 'PAYMENT_VERIFICATION_FAILED',
            entityType: 'Payment',
            entityId: existing.id,
            newValue: { gatewayStatus: verdict.status },
            meta,
          });
        }
      });
      throw AppError.unprocessable('Payment could not be verified with the gateway');
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: existing.id, status: { in: [...PAYABLE_STATUSES] } },
        data: {
          status: 'PAID',
          gatewayValId: verdict.valId,
          gatewayResponse: verdict.raw as Prisma.InputJsonValue,
          paidAt: new Date(),
        },
      });
      if (count === 0) return; // another callback already settled it

      await recordAudit(tx, {
        action: 'PAYMENT_PAID',
        entityType: 'Payment',
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: 'PAID', valId: verdict.valId },
        meta,
      });

      const appointment = await tx.appointment.findUniqueOrThrow({
        where: { id: existing.appointmentId },
        include: lifecycleInclude,
      });
      const when = `${formatDateOnly(appointment.appointmentDate)} at ${appointment.startTime}`;

      if (appointment.status === 'PENDING_PAYMENT') {
        await transitionAppointment(tx, appointment, 'CONFIRMED', {
          changedBy: 'system',
          note: 'Payment verified',
        });
      } else if (!(await restoreExpiredBooking(tx, appointment))) {
        // The payment window lapsed and the slot went to someone else.
        await tx.payment.update({ where: { id: existing.id }, data: { status: 'REFUNDED' } });
        await recordAudit(tx, {
          action: 'PAYMENT_REFUND_REQUIRED',
          entityType: 'Payment',
          entityId: existing.id,
          newValue: { reason: 'Slot no longer available after payment' },
          meta,
        });
        await notify(tx, {
          userId: appointment.patient.userId,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Payment received after the slot was released',
          message: `The ${when} slot is no longer available, so your payment will be refunded.`,
          metadata: { appointmentId: appointment.id },
        });
        return;
      }

      await notify(tx, {
        userId: appointment.patient.userId,
        type: 'PAYMENT_SUCCESSFUL',
        title: 'Payment successful',
        message: `We received your payment for the appointment on ${when}.`,
        metadata: { appointmentId: appointment.id, paymentId: existing.id },
      });
      await notify(tx, {
        userId: appointment.patient.userId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Appointment confirmed',
        message: `Your appointment with ${appointment.doctor.name} on ${when} is confirmed.`,
        metadata: { appointmentId: appointment.id },
      });
      await notify(tx, {
        userId: appointment.doctor.userId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'New confirmed appointment',
        message: `A patient confirmed an appointment on ${when}.`,
        metadata: { appointmentId: appointment.id },
      });
    });

    const settledPayment = await findByTranId(tranId);
    return {
      paymentId: settledPayment.id,
      appointmentId: settledPayment.appointmentId,
      status: settledPayment.status,
    };
  },

  /** Records a patient-cancelled or failed checkout. A paid payment is never downgraded. */
  async markUnsuccessful(
    tranId: string,
    to: 'CANCELLED' | 'FAILED',
    reason: string | undefined,
    meta: RequestMeta,
  ): Promise<CallbackOutcome> {
    const payment = await findByTranId(tranId);
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: to },
      });
      if (count === 0) return;
      await recordAudit(tx, {
        action: to === 'CANCELLED' ? 'PAYMENT_CANCELLED' : 'PAYMENT_FAILED',
        entityType: 'Payment',
        entityId: payment.id,
        oldValue: { status: 'PENDING' },
        newValue: { status: to, reason: reason ?? null },
        meta,
      });
    });
    const current = await findByTranId(tranId);
    return { paymentId: current.id, appointmentId: current.appointmentId, status: current.status };
  },

  async getById(actor: Actor, id: string) {
    const payment = await prisma.payment.findFirst({
      where: { id, ...visibleTo(actor) },
      include: paymentInclude,
    });
    if (!payment) throw AppError.notFound('Payment not found');
    return toPaymentDto(payment);
  },

  async list(actor: Actor, query: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {
      ...visibleTo(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lt: new Date(parseDateOnly(query.to).getTime() + 86_400_000) } : {}),
            },
          }
        : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);
    return { items: rows.map(toPaymentDto), meta: toPageMeta(query, total) };
  },
};

/**
 * A verified payment arrived for a booking that the unpaid-hold sweeper
 * already cancelled. If the slot is still free and still in the future the
 * booking is revived; otherwise the caller must refund. This is the one place
 * an appointment legitimately leaves CANCELLED, so it bypasses the state
 * machine on purpose and is audited.
 */
async function restoreExpiredBooking(
  tx: Prisma.TransactionClient,
  appointment: Prisma.AppointmentGetPayload<{ include: typeof lifecycleInclude }>,
): Promise<boolean> {
  if (appointment.status !== 'CANCELLED') return false;
  const date = formatDateOnly(appointment.appointmentDate);
  if (slotStartsAt(date, appointment.startTime, env.HOSPITAL_UTC_OFFSET_MINUTES) <= new Date()) {
    return false;
  }
  const taken = await tx.appointment.findFirst({
    where: {
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      holdsSlot: true,
    },
    select: { id: true },
  });
  if (taken) return false;

  await tx.appointment.update({
    where: { id: appointment.id },
    data: { status: 'CONFIRMED', holdsSlot: true, cancelReason: null },
  });
  await tx.appointmentStatusHistory.create({
    data: {
      appointmentId: appointment.id,
      fromStatus: 'CANCELLED',
      toStatus: 'CONFIRMED',
      changedBy: 'system',
      note: 'Payment verified after the hold expired; slot was still free',
    },
  });
  return true;
}
