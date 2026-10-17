import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import { parseDateOnly } from '../../lib/schedule';
import type { Actor } from '../../lib/request';
import type { ListPatientsQuery, UpdatePatientProfileInput } from './patients.validation';

const patientInclude = {
  user: { select: { id: true, email: true, name: true, phone: true, status: true } },
} satisfies Prisma.PatientInclude;

type PatientRow = Prisma.PatientGetPayload<{ include: typeof patientInclude }>;

function toPatientDto(patient: PatientRow) {
  return {
    id: patient.id,
    userId: patient.userId,
    name: patient.user.name,
    email: patient.user.email,
    phone: patient.user.phone,
    status: patient.user.status,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    address: patient.address,
    emergencyContact: patient.emergencyContact,
    allergies: patient.allergies,
    createdAt: patient.createdAt,
  };
}

async function findOwnPatient(userId: string) {
  const patient = await prisma.patient.findFirst({
    where: { userId, deletedAt: null },
    include: patientInclude,
  });
  if (!patient) throw AppError.notFound('Patient profile not found');
  return patient;
}

export const patientsService = {
  async getMine(userId: string) {
    return toPatientDto(await findOwnPatient(userId));
  },

  async updateMine(userId: string, input: UpdatePatientProfileInput) {
    const existing = await findOwnPatient(userId);
    const { dateOfBirth, ...rest } = input;
    const updated = await prisma.patient.update({
      where: { id: existing.id },
      data: { ...rest, ...(dateOfBirth ? { dateOfBirth: parseDateOnly(dateOfBirth) } : {}) },
      include: patientInclude,
    });
    return toPatientDto(updated);
  },

  async list(query: ListPatientsQuery) {
    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
      ...(query.q
        ? {
            user: {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        include: patientInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.patient.count({ where }),
    ]);
    return { items: rows.map(toPatientDto), meta: toPageMeta(query, total) };
  },

  /**
   * Medical history. A doctor may only read the history of patients they have
   * actually treated (an appointment with them); admins may read any.
   */
  async getHistory(patientId: string, actor: Actor) {
    if (actor.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findFirst({
        where: { userId: actor.id, deletedAt: null },
      });
      const treated = doctor
        ? await prisma.appointment.count({ where: { doctorId: doctor.id, patientId } })
        : 0;
      if (treated === 0) {
        throw AppError.forbidden('You can only view the history of patients you have treated');
      }
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      include: patientInclude,
    });
    if (!patient) throw AppError.notFound('Patient not found');

    const consultations = await prisma.consultation.findMany({
      where: { patientId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        doctor: { select: { id: true, name: true, specialty: true } },
        prescriptions: { select: { id: true, createdAt: true } },
      },
    });

    return {
      patient: toPatientDto(patient),
      consultations: consultations.map((c) => ({
        id: c.id,
        appointmentId: c.appointmentId,
        doctor: c.doctor,
        chiefComplaint: c.chiefComplaint,
        diagnosis: c.diagnosis,
        treatmentPlan: c.treatmentPlan,
        followUpDate: c.followUpDate,
        prescriptionIds: c.prescriptions.map((p) => p.id),
        createdAt: c.createdAt,
      })),
    };
  },
};
