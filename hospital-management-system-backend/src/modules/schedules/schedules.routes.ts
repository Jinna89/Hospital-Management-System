import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { schedulesController } from './schedules.controller';
import {
  createLeaveSchema,
  createScheduleSchema,
  updateScheduleSchema,
} from './schedules.validation';

/**
 * Mounted at `/doctors` ahead of the doctors router, because schedules,
 * leaves and availability are all addressed beneath a doctor.
 */
const router = Router();

router.use(requireAuth());

const doctorOnly = requireRole('DOCTOR');

router.get('/me/schedules', doctorOnly, schedulesController.list);
router.post(
  '/me/schedules',
  doctorOnly,
  validate({ body: createScheduleSchema }),
  schedulesController.create,
);
router.patch(
  '/me/schedules/:id',
  doctorOnly,
  validate({ body: updateScheduleSchema }),
  schedulesController.update,
);
router.delete('/me/schedules/:id', doctorOnly, schedulesController.remove);

router.get('/me/leaves', doctorOnly, schedulesController.listLeaves);
router.post(
  '/me/leaves',
  doctorOnly,
  validate({ body: createLeaveSchema }),
  schedulesController.createLeave,
);
router.delete('/me/leaves/:id', doctorOnly, schedulesController.removeLeave);

router.get('/:id/available-slots', schedulesController.availableSlots);

export default router;
