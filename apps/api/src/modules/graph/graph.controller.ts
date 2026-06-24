import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as graphService from './graph.service';

export async function followUser(req: AuthenticatedRequest, res: Response) {
  const { targetId } = req.params;
  const follow = await graphService.followUser(req.userId!, targetId);
  res.json({ success: true, follow });
}

export async function unfollowUser(req: AuthenticatedRequest, res: Response) {
  const { targetId } = req.params;
  await graphService.unfollowUser(req.userId!, targetId);
  res.json({ success: true });
}

export async function sendFriendRequest(req: AuthenticatedRequest, res: Response) {
  const { targetId } = req.params;
  const request = await graphService.sendFriendRequest(req.userId!, targetId);
  res.json({ success: true, request });
}

export async function acceptFriendRequest(req: AuthenticatedRequest, res: Response) {
  const { requestId } = req.params;
  const request = await graphService.acceptFriendRequest(req.userId!, requestId);
  res.json({ success: true, request });
}

export async function rejectFriendRequest(req: AuthenticatedRequest, res: Response) {
  const { requestId } = req.params;
  const request = await graphService.rejectFriendRequest(req.userId!, requestId);
  res.json({ success: true, request });
}

export async function cancelFriendRequest(req: AuthenticatedRequest, res: Response) {
  const { requestId } = req.params;
  await graphService.cancelFriendRequest(req.userId!, requestId);
  res.json({ success: true });
}

export async function removeFriend(req: AuthenticatedRequest, res: Response) {
  const { targetId } = req.params;
  await graphService.removeFriend(req.userId!, targetId);
  res.json({ success: true });
}

export async function getFollowers(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;
  const followers = await graphService.getFollowers(userId, skip, limit);
  res.json({ followers });
}

export async function getFollowing(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;
  const following = await graphService.getFollowing(userId, skip, limit);
  res.json({ following });
}

export async function getFriends(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;
  const friends = await graphService.getFriends(userId, skip, limit);
  res.json({ friends });
}
