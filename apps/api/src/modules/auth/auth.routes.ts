import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { requireAuth } from '../../shared/middleware/requireAuth';
import { rateLimiter } from '../../shared/middleware/rateLimiter';
import * as authController from './auth.controller';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';

export const authRouter = Router();

// Sensitive endpoints get tighter, IP-scoped rate limits than the (future)
// global default — see ARCHITECTURE.md §5.
const loginLimiter = rateLimiter({ keyPrefix: 'login', max: 10, windowSeconds: 60 });
const registerLimiter = rateLimiter({ keyPrefix: 'register', max: 5, windowSeconds: 60 * 60 });
const passwordResetLimiter = rateLimiter({
  keyPrefix: 'password-reset',
  max: 5,
  windowSeconds: 60 * 60,
});

authRouter.post('/register', registerLimiter, validate(registerSchema), authController.register);
authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/logout-all', requireAuth, authController.logoutAll);

authRouter.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

authRouter.get('/sessions', requireAuth, authController.listSessions);
authRouter.delete('/sessions/:id', requireAuth, authController.revokeSessionById);
