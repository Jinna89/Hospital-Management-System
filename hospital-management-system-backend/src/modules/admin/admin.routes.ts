import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { adminController } from './admin.controller';
import { updateUserStatusSchema, verifyDoctorSchema } from './admin.validation';

const router = Router();

router.use(requireAuth(), requireRole('ADMIN'));
router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/status',
  validate({ body: updateUserStatusSchema }),
  adminController.updateUserStatus,
);
router.patch(
  '/doctors/:id/verify',
  validate({ body: verifyDoctorSchema }),
  adminController.verifyDoctor,
);

export default router;
