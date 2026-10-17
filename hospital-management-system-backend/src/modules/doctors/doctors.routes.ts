import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { doctorsController } from './doctors.controller';
import { updateDoctorProfileSchema } from './doctors.validation';

const router = Router();

router.use(requireAuth());

router.get('/', doctorsController.list);
router.get('/search', doctorsController.search);
router.get('/me', requireRole('DOCTOR'), doctorsController.getMe);
router.patch(
  '/me',
  requireRole('DOCTOR'),
  validate({ body: updateDoctorProfileSchema }),
  doctorsController.updateMe,
);
router.get('/:id', doctorsController.getById);

export default router;
