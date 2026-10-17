import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { laboratoryController } from './laboratory.controller';
import { createLabRequestSchema, updateLabResultSchema } from './laboratory.validation';

/** Mounted at `/lab-test-requests`. */
export const labRequestRoutes = Router();

labRequestRoutes.use(requireAuth());
labRequestRoutes.post(
  '/',
  requireRole('DOCTOR'),
  validate({ body: createLabRequestSchema }),
  laboratoryController.create,
);
labRequestRoutes.get('/', laboratoryController.list);
labRequestRoutes.get('/:id', laboratoryController.getById);
labRequestRoutes.patch(
  '/:id/result',
  requireRole('DOCTOR', 'ADMIN'),
  validate({ body: updateLabResultSchema }),
  laboratoryController.updateResult,
);

/** Mounted at `/lab-tests` — the catalog doctors pick from when requesting a test. */
export const labTestRoutes = Router();

labTestRoutes.get(
  '/',
  requireAuth(),
  requireRole('DOCTOR', 'ADMIN'),
  laboratoryController.listTests,
);
