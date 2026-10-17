import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { analyticsController } from './analytics.controller';

const router = Router();

router.use(requireAuth(), requireRole('ADMIN'));
router.get('/dashboard-stats', analyticsController.dashboardStats);
router.get('/revenue-report', analyticsController.revenueReport);

export default router;
