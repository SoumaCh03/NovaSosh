import { describe, it, expect } from 'vitest';
import { getPasswordPolicyIssues } from '../../shared/utils/password';
import { hashRefreshToken, generateRefreshToken } from '../../shared/utils/jwt';
import { registerSchema, loginSchema } from './auth.validation';

describe('password policy', () => {
  it('rejects short passwords', () => {
    expect(getPasswordPolicyIssues('short1A!')).not.toHaveLength(0);
  });

  it('accepts a strong password', () => {
    expect(getPasswordPolicyIssues('Str0ngP@ssw0rd!')).toHaveLength(0);
  });

  it('flags missing character classes individually', () => {
    const issues = getPasswordPolicyIssues('alllowercase1234567890');
    expect(issues.some((i) => i.includes('uppercase'))).toBe(true);
    expect(issues.some((i) => i.includes('symbol'))).toBe(true);
  });
});

describe('refresh token hashing', () => {
  it('produces a deterministic hash for the same token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('produces different hashes for different tokens', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(hashRefreshToken(a)).not.toBe(hashRefreshToken(b));
  });
});

describe('validation schemas', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'jane@example.com',
      username: 'jane_doe',
      password: 'Str0ngP@ssw0rd!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a username with invalid characters', () => {
    const result = registerSchema.safeParse({
      email: 'jane@example.com',
      username: 'jane doe!!',
      password: 'Str0ngP@ssw0rd!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed email on login', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });
});
