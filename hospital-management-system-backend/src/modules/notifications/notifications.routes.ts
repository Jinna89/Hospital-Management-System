import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { notificationsController } from './notifications.controller';

const router = Router();

router.use(requireAuth());
router.get('/', notificationsController.list);
router.get('/unread-count', notificationsController.unreadCount);
// Registered before `/:id/read` so "read-all" is never mistaken for an id.
router.patch('/read-all', notificationsController.markAllRead);
router.patch('/:id/read', notificationsController.markRead);

export default router;
