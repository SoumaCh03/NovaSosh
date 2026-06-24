import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as themeController from './theme.controller';

export const themeRouter = Router();

themeRouter.get('/', requireAuth, themeController.getThemePreference);
themeRouter.patch('/', requireAuth, themeController.updateThemePreference);
