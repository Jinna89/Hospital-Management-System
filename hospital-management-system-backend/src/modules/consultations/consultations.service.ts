import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { recordAudit } from '../../lib/audit';
import type { Actor, RequestMeta } from '../../lib/request';
import { hospitalToday, parseDateOnly } from '../../lib/schedule';
import { AppError } from '../../utils/AppError';
import {
  completeConsultationInTx,
  lifecycleInclude,
  transitionAppointment,
} from '../appointments/appointment-lifecycle';
import { consultationInclude, toConsultationDto } from './consultations.mapper';
import type { CreateConsultationInput, UpdateConsultationInput } from './consultations.validation';

/**
 * Doctors see their own consultations; patients only see the ones that are
 * finished (a draft the doctor is still writing is not yet part of the
 * patient's record); admins can read everything for oversight.
 */
function visibleTo(actor: Actor): Prisma.ConsultationWhereInput {
  switch (actor.role) {
    case 'DOCTOR':
      return { doctor: { userId: actor.id } };
    case 'PATIENT':
      return { status: 'COMPLETED', appointment: { patient: { userId: actor.id } } };
    default:
      return {};
  }
}

const EDITABLE_FIELDS = [
  'chiefComplaint',
  'symptoms',
  'diagnosis',
  'clinicalNotes',
  'treatmentPlan',
] as const;

export const consultationsService = {
  /** Starts the consultation for a checked-in patient and moves the appointment to IN_PROGRESS. */
  async create(actor: Actor, input: CreateConsultationInput, meta: RequestMeta) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, doctor: { userId: actor.id } },
      include: lifecycleInclude,
    });
    if (!appointment) throw AppError.notFound('Appointment not found');
    if (appointment.status !== 'CHECKED_IN' && appointment.status !== 'IN_PROGRESS') {
      throw AppError.conflict(
        `A consultation can only start for a checked-in patient (appointment is ${appointment.status})`,
      );
    }
    const alreadyStarted = await prisma.consultation.findUnique({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });
    if (alreadyStarted) {
      throw AppError.conflict('A consultation already exists for this appointment');
    }

    const id = await prisma.$transaction(async (tx) => {
      if (appointment.status === 'CHECKED_IN') {
        await transitionAppointment(tx, appointment, 'IN_PROGRESS', { changedBy: actor.id });
      }
      const created = await tx.consultation.create({
        data: {
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          chiefComplaint: input.chiefComplaint,
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'CONSULTATION_STARTED',
        entityType: 'Consultation',
        entityId: created.id,
        newValue: { appointmentId: appointment.id },
        meta,
      });
      return created.id;
    });

    return this.getById(actor, id);
  },

  async getById(actor: Actor, id: string) {
    const row = await prisma.consultation.findFirst({
      where: { id, ...visibleTo(actor) },
      include: consultationInclude,
    });
    if (!row) throw AppError.notFound('Consultation not found');
    return toConsultationDto(row);
  },

  async update(actor: Actor, id: string, input: UpdateConsultationInput, meta: RequestMeta) {
    const existing = await prisma.consultation.findFirst({
      where: { id, doctor: { userId: actor.id } },
      include: { appointment: { include: lifecycleInclude } },
    });
    if (!existing) throw AppError.notFound('Consultation not found');
    if (existing.status === 'COMPLETED') {
      throw AppError.conflict(
        'A completed consultation is part of the medical record and is locked',
      );
    }

    if (input.followUpDate) {
      const today = hospitalToday(new Date(), env.HOSPITAL_UTC_OFFSET_MINUTES);
      if (input.followUpDate < today) {
        throw AppError.unprocessable('Follow-up date cannot be in the past');
      }
    }

    const completing = input.status === 'COMPLETED';
    const diagnosis = input.diagnosis ?? existing.diagnosis;
    if (completing && !diagnosis?.trim()) {
      throw AppError.unprocessable('Record a diagnosis before completing the consultation');
    }

    const data: Prisma.ConsultationUpdateInput = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = input[field];
      if (value !== undefined && value !== existing[field]) {
        data[field] = value;
        before[field] = existing[field];
        after[field] = value;
      }
    }
    if (input.followUpDate) {
      data.followUpDate = parseDateOnly(input.followUpDate);
      before.followUpDate = existing.followUpDate?.toISOString().slice(0, 10) ?? null;
      after.followUpDate = input.followUpDate;
    }
    if (completing) after.status = 'COMPLETED';

    await prisma.$transaction(async (tx) => {
      await tx.consultation.update({ where: { id }, data });
      if (completing) await completeConsultationInTx(tx, existing.appointment, actor.id);
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'CONSULTATION_UPDATED',
        entityType: 'Consultation',
        entityId: id,
        oldValue: before as Prisma.InputJsonObject,
        newValue: after as Prisma.InputJsonObject,
        meta,
      });
    });

    return this.getById(actor, id);
  },
};
