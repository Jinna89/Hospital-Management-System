import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { toAuthUser } from '../../lib/user.mapper';
import type { UpdateProfileInput } from './users.validation';

export const usersService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    return toAuthUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: input });
      // Doctors carry a public display name on their profile; keep it in sync.
      if (input.name && updated.role === 'DOCTOR') {
        await tx.doctor.updateMany({ where: { userId }, data: { name: input.name } });
      }
      return updated;
    });
    return toAuthUser(user);
  },
};
