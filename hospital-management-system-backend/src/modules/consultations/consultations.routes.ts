import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { consultationsController } from './consultations.controller';
import { createConsultationSchema, updateConsultationSchema } from './consultations.validation';

const router = Router();

router.use(requireAuth());

router.post(
  '/',
  requireRole('DOCTOR'),
  validate({ body: createConsultationSchema }),
  consultationsController.create,
);
router.get('/:id', consultationsController.getById);
router.patch(
  '/:id',
  requireRole('DOCTOR'),
  validate({ body: updateConsultationSchema }),
  consultationsController.update,
);

export default router;
