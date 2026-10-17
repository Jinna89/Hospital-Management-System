import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { appointmentCreateRateLimiter } from '../../middlewares/rate-limit.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { appointmentsController } from './appointments.controller';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  updateStatusSchema,
} from './appointments.validation';

const router = Router();

router.use(requireAuth());

router.post(
  '/',
  requireRole('PATIENT'),
  appointmentCreateRateLimiter,
  validate({ body: createAppointmentSchema }),
  appointmentsController.create,
);
router.get('/', appointmentsController.list);
router.get('/:id', appointmentsController.getById);
router.patch(
  '/:id/cancel',
  validate({ body: cancelAppointmentSchema }),
  appointmentsController.cancel,
);
router.patch(
  '/:id/reschedule',
  requireRole('PATIENT', 'ADMIN'),
  validate({ body: rescheduleAppointmentSchema }),
  appointmentsController.reschedule,
);
router.patch('/:id/check-in', appointmentsController.checkIn);
router.patch(
  '/:id/status',
  requireRole('DOCTOR', 'ADMIN'),
  validate({ body: updateStatusSchema }),
  appointmentsController.updateStatus,
);

export default router;
