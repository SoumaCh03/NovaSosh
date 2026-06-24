import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env';

export interface AccessTokenPayload {
  sub: string; // userId
}

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings, NOT JWTs. Only a salted hash is
 * ever stored server-side (Session.refreshTokenHash), so a leaked database
 * cannot be used to forge sessions, and individual sessions can be revoked
 * by deleting/marking a single row.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
