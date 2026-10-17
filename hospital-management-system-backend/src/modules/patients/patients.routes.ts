import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { patientsController } from './patients.controller';
import { updatePatientProfileSchema } from './patients.validation';

const router = Router();

router.use(requireAuth());

router.get('/me', requireRole('PATIENT'), patientsController.getMe);
router.patch(
  '/me',
  requireRole('PATIENT'),
  validate({ body: updatePatientProfileSchema }),
  patientsController.updateMe,
);
router.get('/', requireRole('ADMIN'), patientsController.list);
router.get('/:id/history', requireRole('DOCTOR', 'ADMIN'), patientsController.history);

export default router;
