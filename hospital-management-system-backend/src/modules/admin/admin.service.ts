import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { recordAudit } from '../../lib/audit';
import { notify } from '../../lib/notifications';
import { toPageArgs, toPageMeta } from '../../lib/pagination';
import type { Actor, RequestMeta } from '../../lib/request';
import { toAuthUser } from '../../lib/user.mapper';
import { AppError } from '../../utils/AppError';
import { doctorInclude, toDoctorDto } from '../doctors/doctors.mapper';
import type { ListUsersQuery, UpdateUserStatusInput, VerifyDoctorInput } from './admin.validation';

const adminUserInclude = {
  doctor: { select: { id: true, verificationStatus: true } },
} satisfies Prisma.UserInclude;

type AdminUserRow = Prisma.UserGetPayload<{ include: typeof adminUserInclude }>;

/** Doctors carry their profile id and verification state so the console can act on them. */
function toAdminUserDto(row: AdminUserRow) {
  return {
    ...toAuthUser(row),
    doctor: row.doctor
      ? { id: row.doctor.id, verificationStatus: row.doctor.verificationStatus }
      : null,
  };
}

export const adminService = {
  async listUsers(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = toPageArgs(query);
    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: adminUserInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
    return { items: rows.map(toAdminUserDto), meta: toPageMeta(query, total) };
  },

  /** Suspending or deactivating an account also ends every session it has open. */
  async updateUserStatus(
    actor: Actor,
    id: string,
    input: UpdateUserStatusInput,
    meta: RequestMeta,
  ) {
    if (id === actor.id) {
      throw AppError.forbidden('You cannot change the status of your own account');
    }
    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: adminUserInclude,
    });
    if (!existing) throw AppError.notFound('User not found');
    if (existing.status === input.status) return toAdminUserDto(existing);

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id },
        data: { status: input.status },
        include: adminUserInclude,
      });
      if (input.status !== 'ACTIVE') {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'USER_STATUS_CHANGED',
        entityType: 'User',
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
        meta,
      });
      return row;
    });
    return toAdminUserDto(updated);
  },

  async verifyDoctor(actor: Actor, doctorId: string, input: VerifyDoctorInput, meta: RequestMeta) {
    const existing = await prisma.doctor.findFirst({
      where: { id: doctorId, deletedAt: null },
      select: { id: true, userId: true, verificationStatus: true },
    });
    if (!existing) throw AppError.notFound('Doctor not found');

    const doctor = await prisma.$transaction(async (tx) => {
      const row = await tx.doctor.update({
        where: { id: doctorId },
        data: { verificationStatus: input.verificationStatus },
        include: doctorInclude,
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: `DOCTOR_${input.verificationStatus}`,
        entityType: 'Doctor',
        entityId: doctorId,
        oldValue: { verificationStatus: existing.verificationStatus },
        newValue: { verificationStatus: input.verificationStatus },
        meta,
      });
      if (existing.verificationStatus !== input.verificationStatus) {
        await notify(tx, {
          userId: existing.userId,
          type: 'GENERAL',
          title: 'Verification update',
          message: `Your doctor profile is now ${input.verificationStatus.toLowerCase()}.`,
          metadata: { doctorId },
        });
      }
      return row;
    });
    return toDoctorDto(doctor, { includePrivate: true });
  },
};
