import { logger } from './logger';

export interface EmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string): Promise<void>;
}

/**
 * Dev/console implementation — logs instead of sending. This exists so the
 * auth flows are fully wired and testable without a real email provider.
 * Swap for SES/Resend/Postmark behind this same interface in Phase 2 — no
 * other code needs to change.
 */
class ConsoleEmailService implements EmailService {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    logger.info({ to, token }, '[email:dev] Verification email');
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    logger.info({ to, token }, '[email:dev] Password reset email');
  }
}

export const emailService: EmailService = new ConsoleEmailService();
