import argon2 from 'argon2';
import { env } from '../../config/env';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

const PASSWORD_RULES = {
  minLength: 10,
  requiresUpper: /[A-Z]/,
  requiresLower: /[a-z]/,
  requiresNumber: /[0-9]/,
  requiresSymbol: /[^A-Za-z0-9]/,
};

/**
 * Returns a list of human-readable policy violations, or an empty array if
 * the password is acceptable. Kept separate from hashing so it can run
 * synchronously during request validation before any hashing work happens.
 */
export function getPasswordPolicyIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_RULES.minLength) {
    issues.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  }
  if (!PASSWORD_RULES.requiresUpper.test(password)) {
    issues.push('Password must contain an uppercase letter');
  }
  if (!PASSWORD_RULES.requiresLower.test(password)) {
    issues.push('Password must contain a lowercase letter');
  }
  if (!PASSWORD_RULES.requiresNumber.test(password)) {
    issues.push('Password must contain a number');
  }
  if (!PASSWORD_RULES.requiresSymbol.test(password)) {
    issues.push('Password must contain a symbol');
  }
  return issues;
}
