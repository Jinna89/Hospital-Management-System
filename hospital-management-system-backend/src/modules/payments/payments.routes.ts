import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { paymentInitiateRateLimiter } from '../../middlewares/rate-limit.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { paymentsController } from './payments.controller';
import { initiatePaymentSchema } from './payments.validation';

const router = Router();

// Gateway callbacks: unauthenticated by nature (the gateway or the patient's
// browser calls them), which is why none of them trusts its own payload.
router.post('/success', paymentsController.success);
router.post('/fail', paymentsController.fail);
router.post('/cancel', paymentsController.cancel);
router.post('/ipn', paymentsController.ipn);

router.use(requireAuth());

router.post(
  '/initiate',
  requireRole('PATIENT'),
  paymentInitiateRateLimiter,
  validate({ body: initiatePaymentSchema }),
  paymentsController.initiate,
);
router.get('/', requireRole('PATIENT', 'ADMIN'), paymentsController.list);
router.get('/:id', requireRole('PATIENT', 'ADMIN'), paymentsController.getById);

export default router;
