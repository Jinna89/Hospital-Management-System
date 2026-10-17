import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { prescriptionsController } from './prescriptions.controller';
import { createPrescriptionSchema } from './prescriptions.validation';

const router = Router();

router.use(requireAuth());

router.post(
  '/',
  requireRole('DOCTOR'),
  validate({ body: createPrescriptionSchema }),
  prescriptionsController.create,
);
router.get('/', prescriptionsController.list);
router.get('/:id', prescriptionsController.getById);

export default router;
