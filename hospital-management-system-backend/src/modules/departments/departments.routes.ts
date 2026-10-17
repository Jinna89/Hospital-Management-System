import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { departmentsController } from './departments.controller';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.validation';

const router = Router();

/** Reads are public (the list drives doctor search filters); admins additionally see inactive ones. */
function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    void requireAuth()(req, res, next);
    return;
  }
  next();
}

router.get('/', optionalAuth, departmentsController.list);

router.use(requireAuth(), requireRole('ADMIN'));
router.post('/', validate({ body: createDepartmentSchema }), departmentsController.create);
router.patch('/:id', validate({ body: updateDepartmentSchema }), departmentsController.update);
router.delete('/:id', departmentsController.remove);

export default router;
