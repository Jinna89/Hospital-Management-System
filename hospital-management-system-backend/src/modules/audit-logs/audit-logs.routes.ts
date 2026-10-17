import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { auditLogsController } from './audit-logs.controller';

const router = Router();

router.use(requireAuth(), requireRole('ADMIN'));
router.get('/', auditLogsController.list);

export default router;
