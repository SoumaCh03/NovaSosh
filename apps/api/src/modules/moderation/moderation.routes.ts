import { Router } from 'express';
import { createReportHandler, getReportsHandler, resolveReportHandler } from './moderation.controller';
import { requireAuth } from '../../shared/middleware/requireAuth';

const router = Router();

router.use(requireAuth);
router.post('/reports', createReportHandler);
router.get('/reports', getReportsHandler); // Admin only
router.patch('/reports/:id/resolve', resolveReportHandler); // Admin only

export default router;
