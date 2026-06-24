import { Router } from 'express';
import { getNotificationsHandler, markAsReadHandler, deleteNotificationsHandler, getSettingsHandler, updateSettingsHandler, subscribePushHandler } from './notifications.controller';
import { requireAuth } from '../../shared/middleware/requireAuth';

const router = Router();

router.use(requireAuth);
router.get('/', getNotificationsHandler);
router.patch('/:id/read', markAsReadHandler);
router.delete('/', deleteNotificationsHandler);
router.get('/settings', getSettingsHandler);
router.put('/settings', updateSettingsHandler);
router.post('/push/subscribe', subscribePushHandler);

export default router;
