import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as storiesController from './stories.controller';

export const storiesRouter = Router();

storiesRouter.use(requireAuth);

storiesRouter.post('/', storiesController.createStory);
storiesRouter.get('/feed', storiesController.getFeed);
storiesRouter.post('/:storyId/view', storiesController.markViewed);
storiesRouter.post('/:storyId/react', storiesController.react);
