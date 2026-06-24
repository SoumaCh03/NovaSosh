import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../shared/middleware/requireAuth';
import * as profilesController from './profiles.controller';

export const profilesRouter = Router();

// Allow public viewing but check auth if available for privacy logic
profilesRouter.get('/:username', optionalAuth, profilesController.getProfile);

profilesRouter.patch('/me', requireAuth, profilesController.updateProfile);
profilesRouter.post('/me/close-friends', requireAuth, profilesController.addCloseFriend);
profilesRouter.delete('/me/close-friends/:friendId', requireAuth, profilesController.removeCloseFriend);
