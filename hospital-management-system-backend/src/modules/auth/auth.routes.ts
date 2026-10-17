import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { loginSchema, refreshTokenSchema, registerSchema } from './auth.validation';
import { loginRateLimiter, registerRateLimiter } from '../../middlewares/rate-limit.middleware';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.post(
  '/register',
  registerRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);
router.post('/login', loginRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post('/logout', validate({ body: refreshTokenSchema }), authController.logout);
router.get('/me', requireAuth(), authController.me);

export default router;
