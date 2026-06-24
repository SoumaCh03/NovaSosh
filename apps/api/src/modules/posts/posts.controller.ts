import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as postsService from './posts.service';
import { createPostSchema, createCommentSchema } from './posts.validation';

export async function create(req: AuthenticatedRequest, res: Response) {
  const result = await postsService.createPost(req.userId!, req.body);
  res.status(201).json(result);
}

export async function getRecommendedFeed(req: AuthenticatedRequest, res: Response) {
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  
  const result = await postsService.getFeed(req.userId!, 'recommended', cursor, limit);
  res.status(200).json(result);
}

export async function getFollowingFeed(req: AuthenticatedRequest, res: Response) {
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const result = await postsService.getFeed(req.userId!, 'following', cursor, limit);
  res.status(200).json(result);
}

export async function toggleLike(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.toggleLikePost(req.userId!, id);
  res.status(200).json(result);
}

export async function comment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.createComment(req.userId!, id, req.body);
  res.status(201).json(result);
}

export async function listComments(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const result = await postsService.getComments(id, cursor, limit);
  res.status(200).json(result);
}

export async function update(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.updatePost(req.userId!, id, req.body);
  res.status(200).json(result);
}

export async function updatePrivacy(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.updatePrivacy(req.userId!, id, req.body.visibility);
  res.status(200).json(result);
}

export async function remove(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.deletePost(req.userId!, id);
  res.status(200).json(result);
}

export async function share(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const result = await postsService.sharePostToTimeline(req.userId!, id, req.body);
  res.status(201).json(result);
}

