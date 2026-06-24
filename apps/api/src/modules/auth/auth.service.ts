import crypto from 'node:crypto';
import { prisma } from '../../shared/lib/prisma';
import { redis } from '../../shared/lib/redis';
import { emailService } from '../../shared/lib/email';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { hashPassword, verifyPassword, getPasswordPolicyIssues } from '../../shared/utils/password';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../../shared/utils/jwt';
import type { RegisterInput, LoginInput } from './auth.validation';

const EMAIL_VERIFICATION_PREFIX = 'verify-email';
const PASSWORD_RESET_PREFIX = 'reset-password';
const VERIFICATION_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1h
const PASSWORD_HISTORY_CHECK_DEPTH = 5;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export async function registerUser(input: RegisterInput) {
  const policyIssues = getPasswordPolicyIssues(input.password);
  if (policyIssues.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Password does not meet policy requirements',
      policyIssues.map((issue) => ({ field: 'password', issue })),
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { profile: { username: input.username } }] },
  });
  if (existing) {
    throw new AppError('CONFLICT', 'Email or username is already taken');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      profile: {
        create: {
          username: input.username,
          displayName: input.username,
        },
      },
      passwordHistory: {
        create: { passwordHash },
      },
    },
  });

  const verificationToken = crypto.randomBytes(32).toString('base64url');
  await redis.set(
    `${EMAIL_VERIFICATION_PREFIX}:${verificationToken}`,
    user.id,
    'EX',
    VERIFICATION_TOKEN_TTL_SECONDS,
  );
  await emailService.sendVerificationEmail(user.email, verificationToken);
  await writeAuditLog(user.id, 'USER_REGISTERED');

  return { userId: user.id, status: user.status };
}

export async function authenticateUser(input: LoginInput, meta: SessionMeta) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
    throw new AppError('ACCOUNT_SUSPENDED', 'This account is not active');
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    await writeAuditLog(user.id, 'LOGIN_FAILED');
    throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const { accessToken, refreshToken, expiresIn } = await issueSession(user.id, meta);
  await writeAuditLog(user.id, 'LOGIN_SUCCESS');

  return {
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      username: user.profile?.username,
      displayName: user.profile?.displayName,
    },
  };
}

export async function issueSession(userId: string, meta: SessionMeta) {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  const accessToken = signAccessToken(userId);

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function refreshSession(presentedToken: string, meta: SessionMeta) {
  const presentedHash = hashRefreshToken(presentedToken);

  const session = await prisma.session.findUnique({ where: { refreshTokenHash: presentedHash } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError('UNAUTHENTICATED', 'Refresh token is invalid or expired');
  }

  // Rotate on every use: revoke the presented token and issue a new one.
  // This bounds the damage window if a refresh token is ever intercepted —
  // a reused, already-revoked token is a strong signal of token theft.
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(session.userId, meta);
}

export async function revokeSession(presentedToken: string) {
  const presentedHash = hashRefreshToken(presentedToken);
  await prisma.session.updateMany({
    where: { refreshTokenHash: presentedHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await writeAuditLog(userId, 'LOGOUT_ALL_DEVICES');
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, userAgent: true, ipAddress: true, deviceLabel: true, createdAt: true },
  });
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError('NOT_FOUND', 'Session not found');
  }
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always resolve successfully regardless of whether the email exists, so
  // the controller can return the same response either way (enumeration
  // protection — never let an attacker learn which emails are registered).
  if (!user) return;

  const token = crypto.randomBytes(32).toString('base64url');
  await redis.set(`${PASSWORD_RESET_PREFIX}:${token}`, user.id, 'EX', RESET_TOKEN_TTL_SECONDS);
  await emailService.sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, newPassword: string) {
  const policyIssues = getPasswordPolicyIssues(newPassword);
  if (policyIssues.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Password does not meet policy requirements',
      policyIssues.map((issue) => ({ field: 'newPassword', issue })),
    );
  }

  const userId = await redis.get(`${PASSWORD_RESET_PREFIX}:${token}`);
  if (!userId) {
    throw new AppError('VALIDATION_ERROR', 'Reset token is invalid or expired');
  }

  const recentHashes = await prisma.passwordHistoryEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PASSWORD_HISTORY_CHECK_DEPTH,
  });
  for (const entry of recentHashes) {
    if (await verifyPassword(entry.passwordHash, newPassword)) {
      throw new AppError('VALIDATION_ERROR', 'You cannot reuse a recent password', [
        { field: 'newPassword', issue: 'must not match a recently used password' },
      ]);
    }
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.passwordHistoryEntry.create({ data: { userId, passwordHash } }),
    prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await redis.del(`${PASSWORD_RESET_PREFIX}:${token}`);
  await writeAuditLog(userId, 'PASSWORD_RESET');
}

export async function verifyEmail(token: string) {
  const userId = await redis.get(`${EMAIL_VERIFICATION_PREFIX}:${token}`);
  if (!userId) {
    throw new AppError('VALIDATION_ERROR', 'Verification token is invalid or expired');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
  });
  await redis.del(`${EMAIL_VERIFICATION_PREFIX}:${token}`);
  await writeAuditLog(userId, 'EMAIL_VERIFIED');
}

async function writeAuditLog(userId: string, action: string) {
  await prisma.auditLog.create({ data: { userId, action } });
}
