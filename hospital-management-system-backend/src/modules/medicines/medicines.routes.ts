import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { toPageArgs, toPageMeta, paginationQuerySchema } from '../../lib/pagination';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

const listQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

/** Medicine catalog used to autocomplete prescription items. Read-only for clinicians. */
router.get('/', requireAuth(), requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where = {
    deletedAt: null,
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { genericName: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const { skip, take } = toPageArgs(query);
  const [items, total] = await prisma.$transaction([
    prisma.medicine.findMany({
      where,
      select: { id: true, name: true, genericName: true, form: true, strength: true },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.medicine.count({ where }),
  ]);
  sendSuccess(res, { message: 'Medicines retrieved', data: items, meta: toPageMeta(query, total) });
});

export default router;
