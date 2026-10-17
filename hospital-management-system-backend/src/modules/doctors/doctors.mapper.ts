import type { Prisma } from '@prisma/client';
import { toNumber } from '../../lib/decimal';

export const doctorInclude = {
  departments: {
    where: { department: { deletedAt: null } },
    select: { department: { select: { id: true, name: true } } },
  },
} satisfies Prisma.DoctorInclude;

export type DoctorRow = Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>;

/** `licenseNumber` is only exposed to the doctor themself and to admins. */
export function toDoctorDto(doctor: DoctorRow, options: { includePrivate?: boolean } = {}) {
  return {
    id: doctor.id,
    userId: doctor.userId,
    name: doctor.name,
    specialty: doctor.specialty,
    departments: doctor.departments.map(({ department }) => department),
    qualification: doctor.qualification,
    experienceYears: doctor.experienceYears,
    consultationFee: toNumber(doctor.consultationFee),
    bio: doctor.bio,
    profileImage: doctor.profileImage,
    verificationStatus: doctor.verificationStatus,
    status: doctor.status,
    createdAt: doctor.createdAt,
    ...(options.includePrivate ? { licenseNumber: doctor.licenseNumber } : {}),
  };
}
