import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as privacyController from './privacy.controller';

export const privacyRouter = Router();

privacyRouter.get('/', requireAuth, privacyController.getSettings);
privacyRouter.patch('/', requireAuth, privacyController.updateSettings);
