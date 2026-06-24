import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as privacyService from './privacy.service';

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  const settings = await privacyService.getPrivacySettings(req.userId!);
  res.status(200).json(settings);
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const settings = await privacyService.updatePrivacySettings(req.userId!, req.body);
  res.status(200).json(settings);
}
