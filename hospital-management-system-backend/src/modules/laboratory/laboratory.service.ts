import type { LabTestRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { recordAudit } from '../../lib/audit';
import { notify } from '../../lib/notifications';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { AppError } from '../../utils/AppError';
import { labRequestInclude, toLabRequestDto, toLabTestDto } from './laboratory.mapper';
import type {
  CreateLabRequestInput,
  ListLabRequestsQuery,
  ListLabTestsQuery,
  UpdateLabResultInput,
} from './laboratory.validation';

/** Progress order of a lab request; cancellation is a separate, early-only exit. */
const PROGRESS: readonly LabTestRequestStatus[] = [
  'REQUESTED',
  'SAMPLE_COLLECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'RESULT_AVAILABLE',
];

const NON_CLINICAL_APPOINTMENT = ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'];

function visibleTo(actor: Actor): Prisma.LabTestRequestWhereInput {
  switch (actor.role) {
    case 'PATIENT':
      return { patient: { userId: actor.id } };
    case 'DOCTOR':
      return { doctor: { userId: actor.id } };
    default:
      return {};
  }
}

/** Requests only ever move forward, and can only be cancelled before they complete. */
function assertTransition(from: LabTestRequestStatus, to: LabTestRequestStatus): void {
  const fromRank = PROGRESS.indexOf(from);
  const finished = from === 'CANCELLED' || from === 'RESULT_AVAILABLE';
  if (finished) {
    throw AppError.conflict(`Lab request is already ${from} and can no longer change`);
  }
  if (to === 'CANCELLED') {
    if (fromRank >= PROGRESS.indexOf('COMPLETED')) {
      throw AppError.conflict('A completed lab request cannot be cancelled');
    }
    return;
  }
  if (PROGRESS.indexOf(to) <= fromRank) {
    throw AppError.conflict(`Cannot move a lab request from ${from} back to ${to}`);
  }
}

export const laboratoryService = {
  async listTests(query: ListLabTestsQuery) {
    const where: Prisma.LabTestWhereInput = {
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { code: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.labTest.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      prisma.labTest.count({ where }),
    ]);
    return { items: rows.map(toLabTestDto), meta: toPageMeta(query, total) };
  },

  async create(actor: Actor, input: CreateLabRequestInput, meta: RequestMeta) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: input.consultationId, doctor: { userId: actor.id } },
      include: {
        appointment: { select: { status: true, patient: { select: { userId: true } } } },
        doctor: { select: { name: true } },
      },
    });
    if (!consultation) throw AppError.notFound('Consultation not found');
    if (NON_CLINICAL_APPOINTMENT.includes(consultation.appointment.status)) {
      throw AppError.conflict('Lab tests cannot be requested for a cancelled appointment');
    }

    const labTest = await prisma.labTest.findFirst({
      where: { id: input.labTestId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!labTest) throw AppError.unprocessable('Unknown lab test');

    const id = await prisma.$transaction(async (tx) => {
      const created = await tx.labTestRequest.create({
        data: {
          consultationId: consultation.id,
          doctorId: consultation.doctorId,
          patientId: consultation.patientId,
          labTestId: labTest.id,
          notes: input.notes,
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'LAB_TEST_REQUESTED',
        entityType: 'LabTestRequest',
        entityId: created.id,
        newValue: { consultationId: consultation.id, labTest: labTest.name },
        meta,
      });
      await notify(tx, {
        userId: consultation.appointment.patient.userId,
        type: 'GENERAL',
        title: 'Lab test requested',
        message: `${consultation.doctor.name} requested a ${labTest.name} test for you.`,
        metadata: { labTestRequestId: created.id },
      });
      return created.id;
    });

    return this.getById(actor, id);
  },

  async list(actor: Actor, query: ListLabRequestsQuery) {
    const where: Prisma.LabTestRequestWhereInput = {
      ...visibleTo(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.consultationId ? { consultationId: query.consultationId } : {}),
      ...(query.patientId && actor.role !== 'PATIENT' ? { patientId: query.patientId } : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.labTestRequest.findMany({
        where,
        include: labRequestInclude,
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
      }),
      prisma.labTestRequest.count({ where }),
    ]);
    return { items: rows.map(toLabRequestDto), meta: toPageMeta(query, total) };
  },

  async getById(actor: Actor, id: string) {
    const row = await prisma.labTestRequest.findFirst({
      where: { id, ...visibleTo(actor) },
      include: labRequestInclude,
    });
    if (!row) throw AppError.notFound('Lab test request not found');
    return toLabRequestDto(row);
  },

  /** Advances a request; the requesting doctor or an admin records progress and the final result. */
  async updateResult(actor: Actor, id: string, input: UpdateLabResultInput, meta: RequestMeta) {
    const existing = await prisma.labTestRequest.findFirst({
      where: { id, ...(actor.role === 'ADMIN' ? {} : { doctor: { userId: actor.id } }) },
      include: { patient: { select: { userId: true } }, labTest: { select: { name: true } } },
    });
    if (!existing) throw AppError.notFound('Lab test request not found');

    const next = input.status as LabTestRequestStatus;
    assertTransition(existing.status, next);

    if (next === 'RESULT_AVAILABLE' && !input.resultSummary && !input.resultFileUrl) {
      throw AppError.unprocessable('Provide a result summary or file before publishing a result');
    }

    await prisma.$transaction(async (tx) => {
      await tx.labTestRequest.update({ where: { id }, data: { status: next } });
      if (input.resultSummary || input.resultFileUrl) {
        const data = {
          resultSummary: input.resultSummary,
          resultFileUrl: input.resultFileUrl,
          reviewedByUserId: actor.id,
        };
        await tx.labResult.upsert({
          where: { labTestRequestId: id },
          create: { labTestRequestId: id, ...data },
          update: data,
        });
      }
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'LAB_TEST_STATUS_CHANGED',
        entityType: 'LabTestRequest',
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: next },
        meta,
      });
      if (next === 'RESULT_AVAILABLE') {
        await notify(tx, {
          userId: existing.patient.userId,
          type: 'LAB_RESULT_AVAILABLE',
          title: 'Lab result available',
          message: `Your ${existing.labTest.name} result is ready.`,
          metadata: { labTestRequestId: id },
        });
      }
    });

    return this.getById(actor, id);
  },
};
