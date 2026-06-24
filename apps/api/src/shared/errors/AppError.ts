export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_ATTEMPTS'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'INVALID_INPUT';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_ATTEMPTS: 429,
  INTERNAL_ERROR: 500,
  BAD_REQUEST: 400,
  INVALID_INPUT: 400,
};

/**
 * All deliberate, expected failures should throw this (or a subclass) so
 * the global error handler can map them to the standard error envelope
 * documented in API.md §10. Anything else is treated as an unhandled bug.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Array<{ field: string; issue: string }>;

  constructor(code: ErrorCode, message: string, details?: Array<{ field: string; issue: string }>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
  }
}
