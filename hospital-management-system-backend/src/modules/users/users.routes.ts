import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { usersController } from './users.controller';
import { updateProfileSchema } from './users.validation';

const router = Router();

router.use(requireAuth());
router.get('/me', usersController.getMe);
router.patch('/me', validate({ body: updateProfileSchema }), usersController.updateMe);

export default router;
