import type { Request, Response } from 'express';
import { env } from '../../config/env';
import type { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as authService from './auth.service';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validation';

const REFRESH_COOKIE_NAME = 'nova_refresh_token';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    // Scoped to the auth path so the refresh cookie isn't sent on every
    // unrelated request — it's only needed by /refresh and /logout.
    path: '/api/v1/auth',
  };
}

function sessionMetaFrom(req: Request<any, any, any>) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

export async function register(req: Request<unknown, unknown, RegisterInput>, res: Response) {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req: Request<unknown, unknown, LoginInput>, res: Response) {
  const { accessToken, refreshToken, expiresIn, user } = await authService.authenticateUser(
    req.body,
    sessionMetaFrom(req),
  );
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(200).json({ accessToken, expiresIn, user });
}

export async function refresh(req: Request, res: Response) {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!presented) {
    res
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'No refresh token presented' } });
    return;
  }

  const { accessToken, refreshToken, expiresIn } = await authService.refreshSession(
    presented,
    sessionMetaFrom(req),
  );
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(200).json({ accessToken, expiresIn });
}

export async function logout(req: Request, res: Response) {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME];
  if (presented) {
    await authService.revokeSession(presented);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  res.status(204).send();
}

export async function logoutAll(req: AuthenticatedRequest, res: Response) {
  await authService.revokeAllSessions(req.userId!);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  res.status(204).send();
}

export async function listSessions(req: AuthenticatedRequest, res: Response) {
  const sessions = await authService.listSessions(req.userId!);
  res.status(200).json({ data: sessions });
}

export async function revokeSessionById(req: AuthenticatedRequest, res: Response) {
  await authService.revokeSessionById(req.userId!, req.params.id);
  res.status(204).send();
}

export async function forgotPassword(
  req: Request<unknown, unknown, ForgotPasswordInput>,
  res: Response,
) {
  await authService.requestPasswordReset(req.body.email);
  // Always 202 with the same message, regardless of whether the email
  // exists — see authService.requestPasswordReset for why.
  res.status(202).json({ message: 'If that email exists, a reset link has been sent' });
}

export async function resetPassword(
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response,
) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ message: 'Password updated successfully' });
}

export async function verifyEmail(
  req: Request<unknown, unknown, VerifyEmailInput>,
  res: Response,
) {
  await authService.verifyEmail(req.body.token);
  res.status(200).json({ message: 'Email verified successfully' });
}
