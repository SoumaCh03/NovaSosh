import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as profilesService from './profiles.service';

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  const { username } = req.params;
  const profile = await profilesService.getProfile(username, req.userId);
  res.json({ profile });
}

import { updateProfileSchema } from './profiles.validation';

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const parsedData = updateProfileSchema.parse(req.body);
  const profile = await profilesService.updateProfile(req.userId!, parsedData);
  res.json({ profile });
}

export async function addCloseFriend(req: AuthenticatedRequest, res: Response) {
  const { friendId } = req.body;
  await profilesService.addCloseFriend(req.userId!, friendId);
  res.json({ success: true });
}

export async function removeCloseFriend(req: AuthenticatedRequest, res: Response) {
  const { friendId } = req.params;
  await profilesService.removeCloseFriend(req.userId!, friendId);
  res.json({ success: true });
}
