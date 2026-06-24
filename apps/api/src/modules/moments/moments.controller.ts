import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as momentsService from './moments.service';

export async function create(req: AuthenticatedRequest, res: Response) {
  const creatorId = req.userId!;
  const { mediaFileId, caption, visibility, hashtags, mentions } = req.body;

  if (!mediaFileId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'mediaFileId is required to publish a moment.' } });
    return;
  }

  try {
    const result = await momentsService.createMoment(creatorId, {
      mediaFileId,
      caption,
      visibility,
      hashtags,
      mentions
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function getRecommendedFeed(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  try {
    const result = await momentsService.getFeed(userId, cursor, limit);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function toggleLike(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const result = await momentsService.toggleLike(userId, id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function comment(req: AuthenticatedRequest, res: Response) {
  const authorId = req.userId!;
  const { id } = req.params;
  const { content, parentId } = req.body;

  if (!content) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Comment content is required.' } });
    return;
  }

  try {
    const result = await momentsService.createComment(authorId, id, { content, parentId });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function listComments(req: Request, res: Response) {
  const { id } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  try {
    const result = await momentsService.getComments(id, cursor, limit);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function registerView(req: Request, res: Response) {
  const { id } = req.params;
  const { watchTime, completed, userId } = req.body;

  if (watchTime === undefined) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'watchTime is required.' } });
    return;
  }

  try {
    const result = await momentsService.registerView(
      userId || null,
      id,
      parseFloat(watchTime),
      !!completed
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function getCreatorAnalytics(req: AuthenticatedRequest, res: Response) {
  const creatorId = req.userId!;

  try {
    const result = await momentsService.getCreatorAnalytics(creatorId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function getTrendingMoments(req: Request, res: Response) {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  try {
    const result = await momentsService.getTrendingMoments(limit);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}
