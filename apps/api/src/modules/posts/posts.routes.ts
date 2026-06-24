import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as postsController from './posts.controller';
import { createPostSchema, createCommentSchema, updatePostSchema, updatePrivacySchema, sharePostSchema } from './posts.validation';

export const postsRouter = Router();
export const feedRouter = Router();

// Posts endpoints
postsRouter.post('/', requireAuth, validate(createPostSchema), postsController.create);
postsRouter.post('/:id/like', requireAuth, postsController.toggleLike);
postsRouter.post('/:id/comments', requireAuth, validate(createCommentSchema), postsController.comment);
postsRouter.get('/:id/comments', requireAuth, postsController.listComments);
postsRouter.put('/:id', requireAuth, validate(updatePostSchema), postsController.update);
postsRouter.put('/:id/privacy', requireAuth, validate(updatePrivacySchema), postsController.updatePrivacy);
postsRouter.delete('/:id', requireAuth, postsController.remove);
postsRouter.post('/:id/share', requireAuth, validate(sharePostSchema), postsController.share);

// Feed endpoints
feedRouter.get('/recommended', requireAuth, postsController.getRecommendedFeed);
feedRouter.get('/following', requireAuth, postsController.getFollowingFeed);
