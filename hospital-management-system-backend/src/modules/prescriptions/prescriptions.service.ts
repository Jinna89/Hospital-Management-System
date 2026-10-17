import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { recordAudit } from '../../lib/audit';
import { notify } from '../../lib/notifications';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { AppError } from '../../utils/AppError';
import { prescriptionInclude, toPrescriptionDto } from './prescriptions.mapper';
import type { CreatePrescriptionInput, ListPrescriptionsQuery } from './prescriptions.validation';

type Tx = Prisma.TransactionClient;

function visibleTo(actor: Actor): Prisma.PrescriptionWhereInput {
  switch (actor.role) {
    case 'PATIENT':
      return { patient: { userId: actor.id } };
    case 'DOCTOR':
      return { doctor: { userId: actor.id } };
    default:
      return {};
  }
}

/** Resolves an item to a catalog medicine id, creating the catalog entry for a new name. */
async function resolveMedicineId(
  tx: Tx,
  item: CreatePrescriptionInput['items'][number],
): Promise<string> {
  if (item.medicineId) {
    const medicine = await tx.medicine.findFirst({
      where: { id: item.medicineId, deletedAt: null },
      select: { id: true },
    });
    if (!medicine) throw AppError.unprocessable(`Unknown medicine: ${item.medicineId}`);
    return medicine.id;
  }
  const name = item.medicineName as string;
  const existing = await tx.medicine.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  return (await tx.medicine.create({ data: { name }, select: { id: true } })).id;
}

const NON_PRESCRIBABLE = ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] as const;

export const prescriptionsService = {
  async create(actor: Actor, input: CreatePrescriptionInput, meta: RequestMeta) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: input.consultationId, doctor: { userId: actor.id } },
      include: {
        appointment: {
          select: { id: true, status: true, patient: { select: { userId: true } } },
        },
        doctor: { select: { name: true } },
      },
    });
    if (!consultation) throw AppError.notFound('Consultation not found');
    if ((NON_PRESCRIBABLE as readonly string[]).includes(consultation.appointment.status)) {
      throw AppError.conflict('Prescriptions cannot be created for a cancelled appointment');
    }

    const id = await prisma.$transaction(async (tx) => {
      const items: Prisma.PrescriptionItemCreateWithoutPrescriptionInput[] = [];
      for (const item of input.items) {
        items.push({
          medicine: { connect: { id: await resolveMedicineId(tx, item) } },
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
        });
      }

      const created = await tx.prescription.create({
        data: {
          consultationId: consultation.id,
          doctorId: consultation.doctorId,
          patientId: consultation.patientId,
          notes: input.notes,
          items: { create: items },
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'PRESCRIPTION_CREATED',
        entityType: 'Prescription',
        entityId: created.id,
        newValue: { consultationId: consultation.id, items: input.items.length },
        meta,
      });
      await notify(tx, {
        userId: consultation.appointment.patient.userId,
        type: 'PRESCRIPTION_CREATED',
        title: 'New prescription',
        message: `${consultation.doctor.name} issued you a prescription.`,
        metadata: { prescriptionId: created.id },
      });
      return created.id;
    });

    return this.getById(actor, id);
  },

  async list(actor: Actor, query: ListPrescriptionsQuery) {
    const where: Prisma.PrescriptionWhereInput = {
      ...visibleTo(actor),
      ...(query.consultationId ? { consultationId: query.consultationId } : {}),
      ...(query.patientId && actor.role !== 'PATIENT' ? { patientId: query.patientId } : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.prescription.findMany({
        where,
        include: prescriptionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.prescription.count({ where }),
    ]);
    return { items: rows.map(toPrescriptionDto), meta: toPageMeta(query, total) };
  },

  async getById(actor: Actor, id: string) {
    const row = await prisma.prescription.findFirst({
      where: { id, ...visibleTo(actor) },
      include: prescriptionInclude,
    });
    if (!row) throw AppError.notFound('Prescription not found');
    return toPrescriptionDto(row);
  },
};
