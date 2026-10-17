import type { Prisma } from '@prisma/client';

/** Doctors patients may see and book: verified, active, not deleted, with a live account. */
export const bookableDoctorWhere: Prisma.DoctorWhereInput = {
  deletedAt: null,
  verificationStatus: 'VERIFIED',
  status: 'ACTIVE',
  user: { status: 'ACTIVE', deletedAt: null },
};
