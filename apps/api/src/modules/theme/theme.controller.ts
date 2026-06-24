import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as themeService from './theme.service';

export async function getThemePreference(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const prefs = await themeService.getTheme(userId);
  res.status(200).json({ theme: prefs.theme });
}

export async function updateThemePreference(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { theme } = req.body;

  if (!theme || typeof theme !== 'string') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Theme property is required and must be a string' } });
    return;
  }

  try {
    const updated = await themeService.updateTheme(userId, theme);
    res.status(200).json({ theme: updated.theme });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}
