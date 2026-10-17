import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import {
  CHECK_IN_OPENS_MINUTES_BEFORE,
  MAX_BOOKING_HORIZON_DAYS,
  RESCHEDULE_MIN_HOURS_BEFORE,
} from '../../config/rules';
import { releaseExpiredHolds } from '../../lib/appointment-holds';
import { recordAudit } from '../../lib/audit';
import { findSlot } from '../../lib/availability';
import { notify } from '../../lib/notifications';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { hospitalToday, parseDateOnly, slotStartsAt } from '../../lib/schedule';
import { AppError } from '../../utils/AppError';
import { bookableDoctorWhere } from '../doctors/doctors.queries';
import { generateTranId } from '../payments/payments.mapper';
import {
  appointmentStartsAt,
  cancelAppointmentInTx,
  completeConsultationInTx,
  lifecycleInclude,
  transitionAppointment,
} from './appointment-lifecycle';
import { appointmentInclude, toAppointmentDto } from './appointments.mapper';
import type {
  CancelAppointmentInput,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateStatusInput,
} from './appointments.validation';

const MS_PER_DAY = 86_400_000;

/** Restricts a query to the appointments the actor is allowed to see. */
function visibleTo(actor: Actor): Prisma.AppointmentWhereInput {
  switch (actor.role) {
    case 'PATIENT':
      return { patient: { userId: actor.id } };
    case 'DOCTOR':
      return { doctor: { userId: actor.id } };
    default:
      return {};
  }
}

/** Loads an appointment the actor may see, or 404 (never leaking that it exists). */
async function findVisible(actor: Actor, id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, ...visibleTo(actor) },
    include: lifecycleInclude,
  });
  if (!appointment) throw AppError.notFound('Appointment not found');
  return appointment;
}

async function loadDto(id: string) {
  const row = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: appointmentInclude,
  });
  return toAppointmentDto(row);
}

/**
 * Validates that `startTime` on `date` is a real, future, unbooked slot of the
 * doctor and inside the booking horizon. The database unique index remains the
 * final arbiter against concurrent requests; this gives early, clear errors.
 */
async function assertBookableSlot(
  doctorId: string,
  date: string,
  startTime: string,
  now: Date,
): Promise<{ endTime: string }> {
  const today = hospitalToday(now, env.HOSPITAL_UTC_OFFSET_MINUTES);
  if (date < today) throw AppError.unprocessable('Past slots cannot be booked');
  const horizon = new Date(parseDateOnly(today).getTime() + MAX_BOOKING_HORIZON_DAYS * MS_PER_DAY);
  if (parseDateOnly(date) > horizon) {
    throw AppError.unprocessable(
      `Appointments can only be booked up to ${MAX_BOOKING_HORIZON_DAYS} days ahead`,
    );
  }

  const slot = await findSlot(prisma, doctorId, date, startTime, now);
  if (!slot) throw AppError.unprocessable('The doctor has no consultation slot at this time');
  if (slotStartsAt(date, startTime, env.HOSPITAL_UTC_OFFSET_MINUTES) <= now) {
    throw AppError.unprocessable('Past slots cannot be booked');
  }
  if (!slot.available) throw AppError.conflict('This slot has already been booked');
  return { endTime: slot.endTime };
}

export const appointmentsService = {
  async create(actor: Actor, input: CreateAppointmentInput, meta: RequestMeta) {
    const now = new Date();
    const patient = await prisma.patient.findFirst({
      where: { userId: actor.id, deletedAt: null },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!patient) throw AppError.notFound('Patient profile not found');

    const doctor = await prisma.doctor.findFirst({
      where: { id: input.doctorId, ...bookableDoctorWhere },
      select: { id: true, userId: true, name: true, consultationFee: true },
    });
    if (!doctor) throw AppError.notFound('Doctor not found or not accepting appointments');

    const { endTime } = await assertBookableSlot(
      doctor.id,
      input.appointmentDate,
      input.startTime,
      now,
    );

    const date = parseDateOnly(input.appointmentDate);
    const clash = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        appointmentDate: date,
        startTime: input.startTime,
        holdsSlot: true,
      },
      select: { id: true },
    });
    if (clash) throw AppError.conflict('You already have an appointment at this time');

    const id = await prisma.$transaction(async (tx) => {
      // The (doctor, date, start, holdsSlot) unique index makes the insert
      // itself the lock: of two concurrent bookings only one can succeed.
      const created = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate: date,
          startTime: input.startTime,
          endTime,
          consultationFee: doctor.consultationFee,
          reason: input.reason,
        },
      });
      await tx.appointmentStatusHistory.create({
        data: { appointmentId: created.id, toStatus: 'PENDING_PAYMENT', changedBy: actor.id },
      });
      // The amount always comes from the server-side fee snapshot, never the client.
      await tx.payment.create({
        data: {
          appointmentId: created.id,
          patientId: patient.id,
          amount: doctor.consultationFee,
          gatewayTranId: generateTranId(),
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'APPOINTMENT_BOOKED',
        entityType: 'Appointment',
        entityId: created.id,
        newValue: {
          doctorId: doctor.id,
          date: input.appointmentDate,
          startTime: input.startTime,
          status: 'PENDING_PAYMENT',
        },
        meta,
      });
      await notify(tx, {
        userId: actor.id,
        type: 'APPOINTMENT_BOOKED',
        title: 'Appointment booked',
        message: `Your slot with ${doctor.name} on ${input.appointmentDate} at ${input.startTime} is reserved. Complete the payment to confirm it.`,
        metadata: { appointmentId: created.id },
      });
      return created.id;
    });

    return loadDto(id);
  },

  async list(actor: Actor, query: ListAppointmentsQuery) {
    const where: Prisma.AppointmentWhereInput = {
      ...visibleTo(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.doctorId && actor.role !== 'DOCTOR' ? { doctorId: query.doctorId } : {}),
      ...(query.patientId && actor.role !== 'PATIENT' ? { patientId: query.patientId } : {}),
      ...(query.from || query.to
        ? {
            appointmentDate: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    // Unpaid bookings past their window should not clutter anyone's list.
    await releaseExpiredHolds(prisma, visibleTo(actor));

    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: [{ appointmentDate: query.sortOrder }, { startTime: query.sortOrder }],
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items: rows.map(toAppointmentDto), meta: toPageMeta(query, total) };
  },

  async getById(actor: Actor, id: string) {
    await releaseExpiredHolds(prisma, { id });
    const appointment = await prisma.appointment.findFirst({
      where: { id, ...visibleTo(actor) },
      include: appointmentInclude,
    });
    if (!appointment) throw AppError.notFound('Appointment not found');
    return toAppointmentDto(appointment);
  },

  async cancel(actor: Actor, id: string, input: CancelAppointmentInput, meta: RequestMeta) {
    const appointment = await findVisible(actor, id);
    const result = await prisma.$transaction((tx) =>
      cancelAppointmentInTx(tx, appointment, {
        actor,
        reason: input.reason,
        meta,
        // Only a patient cancelling late forfeits the fee; the clinic never penalises its own cancellations.
        fullRefund: actor.role !== 'PATIENT',
      }),
    );
    return { ...(await loadDto(id)), refunded: result.refunded };
  },

  async reschedule(actor: Actor, id: string, input: RescheduleAppointmentInput, meta: RequestMeta) {
    const now = new Date();
    const appointment = await findVisible(actor, id);
    if (actor.role === 'DOCTOR') {
      throw AppError.forbidden('Doctors cannot reschedule appointments, cancel them instead');
    }
    if (appointment.status !== 'CONFIRMED') {
      throw AppError.conflict('Only confirmed appointments can be rescheduled');
    }
    const hoursUntil = (appointmentStartsAt(appointment).getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil < RESCHEDULE_MIN_HOURS_BEFORE) {
      throw AppError.unprocessable(
        `Appointments can only be rescheduled at least ${RESCHEDULE_MIN_HOURS_BEFORE} hours in advance`,
      );
    }
    const sameSlot =
      input.appointmentDate === appointment.appointmentDate.toISOString().slice(0, 10) &&
      input.startTime === appointment.startTime;
    if (sameSlot) throw AppError.unprocessable('Choose a different slot to reschedule to');

    const { endTime } = await assertBookableSlot(
      appointment.doctorId,
      input.appointmentDate,
      input.startTime,
      now,
    );

    const newId = await prisma.$transaction(async (tx) => {
      const moved = await tx.appointment.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentDate: parseDateOnly(input.appointmentDate),
          startTime: input.startTime,
          endTime,
          status: 'CONFIRMED',
          // The patient already paid the original fee; rescheduling never re-prices it.
          consultationFee: appointment.consultationFee,
          reason: appointment.reason,
        },
      });
      await transitionAppointment(tx, appointment, 'RESCHEDULED', {
        changedBy: actor.id,
        note: `Moved to ${input.appointmentDate} ${input.startTime}`,
      });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: moved.id,
          toStatus: 'CONFIRMED',
          changedBy: actor.id,
          note: `Rescheduled from appointment ${appointment.id}`,
        },
      });
      // The single payment follows the patient to the new appointment.
      await tx.payment.update({
        where: { appointmentId: appointment.id },
        data: { appointmentId: moved.id },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'APPOINTMENT_RESCHEDULED',
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValue: {
          date: appointment.appointmentDate.toISOString().slice(0, 10),
          startTime: appointment.startTime,
        },
        newValue: {
          appointmentId: moved.id,
          date: input.appointmentDate,
          startTime: input.startTime,
        },
        meta,
      });
      const message = `Appointment moved to ${input.appointmentDate} at ${input.startTime}.`;
      for (const userId of new Set([appointment.patient.userId, appointment.doctor.userId])) {
        await notify(tx, {
          userId,
          type: 'APPOINTMENT_CONFIRMED',
          title: 'Appointment rescheduled',
          message,
          metadata: { appointmentId: moved.id },
        });
      }
      return moved.id;
    });

    return loadDto(newId);
  },

  async checkIn(actor: Actor, id: string, meta: RequestMeta) {
    const now = new Date();
    const appointment = await findVisible(actor, id);
    if (appointment.status !== 'CONFIRMED') {
      throw AppError.conflict(
        appointment.status === 'PENDING_PAYMENT'
          ? 'Pay for the appointment before checking in'
          : `An appointment that is ${appointment.status} cannot be checked in`,
      );
    }

    // Admins may check a patient in at the front desk at any time.
    if (actor.role !== 'ADMIN') {
      const startsAt = appointmentStartsAt(appointment);
      const opensAt = new Date(startsAt.getTime() - CHECK_IN_OPENS_MINUTES_BEFORE * 60_000);
      const today = hospitalToday(now, env.HOSPITAL_UTC_OFFSET_MINUTES);
      if (appointment.appointmentDate.toISOString().slice(0, 10) !== today || now < opensAt) {
        throw AppError.unprocessable(
          `Check-in opens ${CHECK_IN_OPENS_MINUTES_BEFORE} minutes before the appointment`,
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await transitionAppointment(tx, appointment, 'CHECKED_IN', { changedBy: actor.id });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'APPOINTMENT_CHECKED_IN',
        entityType: 'Appointment',
        entityId: id,
        oldValue: { status: 'CONFIRMED' },
        newValue: { status: 'CHECKED_IN' },
        meta,
      });
      await notify(tx, {
        userId: appointment.doctor.userId,
        type: 'GENERAL',
        title: 'Patient checked in',
        message: `A patient has checked in for the ${appointment.startTime} appointment.`,
        metadata: { appointmentId: id },
      });
    });
    return loadDto(id);
  },

  async updateStatus(actor: Actor, id: string, input: UpdateStatusInput, meta: RequestMeta) {
    const now = new Date();
    const appointment = await findVisible(actor, id);
    if (actor.role === 'PATIENT') {
      throw AppError.forbidden('Patients cannot change the clinical status of an appointment');
    }
    const target = input.status;

    if (target === 'NO_SHOW' && appointmentStartsAt(appointment) > now) {
      throw AppError.unprocessable('An appointment can only be marked no-show after it started');
    }

    await prisma.$transaction(async (tx) => {
      if (target === 'COMPLETED') {
        await completeConsultationInTx(tx, appointment, actor.id);
      } else {
        await transitionAppointment(tx, appointment, target, { changedBy: actor.id });
      }

      await recordAudit(tx, {
        actorId: actor.id,
        action: 'APPOINTMENT_STATUS_CHANGED',
        entityType: 'Appointment',
        entityId: id,
        oldValue: { status: appointment.status },
        newValue: { status: target },
        meta,
      });
    });
    return loadDto(id);
  },
};
