import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { recordAudit } from '../../lib/audit';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { dayOfWeekForDate, parseDateOnly } from '../../lib/schedule';
import { doctorInclude, toDoctorDto } from './doctors.mapper';
import { bookableDoctorWhere } from './doctors.queries';
import type { ListDoctorsQuery, UpdateDoctorProfileInput } from './doctors.validation';

const SORT_COLUMNS = {
  name: 'name',
  experience: 'experienceYears',
  consultationFee: 'consultationFee',
  createdAt: 'createdAt',
} as const;

function buildWhere(query: ListDoctorsQuery, isAdmin: boolean): Prisma.DoctorWhereInput {
  const and: Prisma.DoctorWhereInput[] = [];

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { specialty: { contains: query.q, mode: 'insensitive' } },
        { qualification: { contains: query.q, mode: 'insensitive' } },
        {
          departments: {
            some: { department: { name: { contains: query.q, mode: 'insensitive' } } },
          },
        },
      ],
    });
  }
  if (query.specialty) {
    and.push({ specialty: { equals: query.specialty, mode: 'insensitive' } });
  }
  if (query.department) {
    and.push({
      departments: {
        some: {
          department: {
            OR: [
              { id: query.department },
              { name: { equals: query.department, mode: 'insensitive' } },
            ],
          },
        },
      },
    });
  }
  if (query.minFee !== undefined || query.maxFee !== undefined) {
    and.push({ consultationFee: { gte: query.minFee, lte: query.maxFee } });
  }
  if (query.minExperience !== undefined) {
    and.push({ experienceYears: { gte: query.minExperience } });
  }
  if (query.availableOn) {
    const date = parseDateOnly(query.availableOn);
    and.push({
      schedules: { some: { dayOfWeek: dayOfWeekForDate(date), isActive: true } },
      leaves: { none: { startDate: { lte: date }, endDate: { gte: date } } },
    });
  }

  // Only admins may look beyond verified, active doctors.
  const visibility: Prisma.DoctorWhereInput = isAdmin
    ? {
        deletedAt: null,
        ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      }
    : bookableDoctorWhere;

  return { AND: [visibility, ...and] };
}

export const doctorsService = {
  async list(query: ListDoctorsQuery, actor: Actor) {
    const isAdmin = actor.role === 'ADMIN';
    const where = buildWhere(query, isAdmin);
    const { skip, take } = toPageArgs(query);

    const [rows, total] = await prisma.$transaction([
      prisma.doctor.findMany({
        where,
        include: doctorInclude,
        orderBy: { [SORT_COLUMNS[query.sortBy]]: query.sortOrder },
        skip,
        take,
      }),
      prisma.doctor.count({ where }),
    ]);

    return {
      items: rows.map((row) => toDoctorDto(row, { includePrivate: isAdmin })),
      meta: toPageMeta(query, total),
    };
  },

  async getById(id: string, actor: Actor) {
    const doctor = await prisma.doctor.findFirst({
      where: { id, deletedAt: null },
      include: doctorInclude,
    });
    if (!doctor) throw AppError.notFound('Doctor not found');

    const isOwner = doctor.userId === actor.id;
    const isAdmin = actor.role === 'ADMIN';
    const isBookable = doctor.verificationStatus === 'VERIFIED' && doctor.status === 'ACTIVE';
    if (!isOwner && !isAdmin && !isBookable) throw AppError.notFound('Doctor not found');

    return toDoctorDto(doctor, { includePrivate: isOwner || isAdmin });
  },

  async getMine(userId: string) {
    const doctor = await prisma.doctor.findFirst({
      where: { userId, deletedAt: null },
      include: doctorInclude,
    });
    if (!doctor) throw AppError.notFound('Doctor profile not found');
    return toDoctorDto(doctor, { includePrivate: true });
  },

  async updateMine(userId: string, input: UpdateDoctorProfileInput, meta: RequestMeta) {
    const existing = await prisma.doctor.findFirst({
      where: { userId, deletedAt: null },
      include: doctorInclude,
    });
    if (!existing) throw AppError.notFound('Doctor profile not found');

    const { departmentIds, ...fields } = input;
    if (departmentIds) {
      const found = await prisma.department.count({
        where: { id: { in: departmentIds }, deletedAt: null, status: true },
      });
      if (found !== new Set(departmentIds).size) {
        throw AppError.unprocessable('One or more departments do not exist or are inactive');
      }
    }

    return prisma.$transaction(async (tx) => {
      if (departmentIds) {
        await tx.doctorDepartment.deleteMany({ where: { doctorId: existing.id } });
        await tx.doctorDepartment.createMany({
          data: [...new Set(departmentIds)].map((departmentId) => ({
            doctorId: existing.id,
            departmentId,
          })),
        });
      }
      const updated = await tx.doctor.update({
        where: { id: existing.id },
        data: fields,
        include: doctorInclude,
      });

      // Fee changes affect revenue, so they are recorded; cosmetic edits are not.
      if (fields.consultationFee !== undefined) {
        await recordAudit(tx, {
          actorId: userId,
          action: 'DOCTOR_FEE_CHANGED',
          entityType: 'Doctor',
          entityId: existing.id,
          oldValue: { consultationFee: Number(existing.consultationFee) },
          newValue: { consultationFee: fields.consultationFee },
          meta,
        });
      }
      return toDoctorDto(updated, { includePrivate: true });
    });
  },
};
