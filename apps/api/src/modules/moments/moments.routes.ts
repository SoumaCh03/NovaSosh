import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as momentsController from './moments.controller';

export const momentsRouter = Router();

// Moments curation & feeds
momentsRouter.post('/', requireAuth, momentsController.create);
momentsRouter.get('/feed', requireAuth, momentsController.getRecommendedFeed);
momentsRouter.get('/trending', momentsController.getTrendingMoments);
momentsRouter.get('/analytics', requireAuth, momentsController.getCreatorAnalytics);

// Engagement & comments
momentsRouter.post('/:id/like', requireAuth, momentsController.toggleLike);
momentsRouter.post('/:id/comments', requireAuth, momentsController.comment);
momentsRouter.get('/:id/comments', momentsController.listComments);
momentsRouter.post('/:id/view', momentsController.registerView);
