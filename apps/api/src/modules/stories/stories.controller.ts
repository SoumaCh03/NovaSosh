import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as storiesService from './stories.service';

export async function createStory(req: AuthenticatedRequest, res: Response) {
  const { mediaFileIds, customExpiresAt } = req.body;
  const story = await storiesService.createStory(req.userId!, mediaFileIds, customExpiresAt ? new Date(customExpiresAt) : undefined);
  res.status(201).json({ story });
}

export async function getFeed(req: AuthenticatedRequest, res: Response) {
  const stories = await storiesService.getActiveFeedStories(req.userId!);
  res.json({ stories });
}

export async function markViewed(req: AuthenticatedRequest, res: Response) {
  const { storyId } = req.params;
  await storiesService.markStoryAsViewed(storyId, req.userId!);
  res.json({ success: true });
}

export async function react(req: AuthenticatedRequest, res: Response) {
  const { storyId } = req.params;
  const { type } = req.body;
  const reaction = await storiesService.reactToStory(storyId, req.userId!, type);
  res.json({ reaction });
}
