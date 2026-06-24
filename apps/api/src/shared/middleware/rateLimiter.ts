import type { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis';
import { AppError } from '../errors/AppError';

interface RateLimitOptions {
  /** Unique name for this limiter, used as part of the Redis key. */
  keyPrefix: string;
  /** Max requests allowed within the window. */
  max: number;
  /** Window size in seconds. */
  windowSeconds: number;
  /** How to derive the rate-limit key from the request. Defaults to IP. */
  keyFn?: (req: Request) => string;
}

/**
 * Fixed-window rate limiter backed by Redis INCR + EXPIRE. Good enough for
 * MVP traffic; swap for a sliding-window/token-bucket algorithm (e.g. via
 * `rate-limiter-flexible`) once real traffic patterns justify the added
 * complexity. Applied per-route in auth.routes.ts with tighter limits on
 * sensitive endpoints (login, register, password reset).
 */
export function rateLimiter(options: RateLimitOptions) {
  const { keyPrefix, max, windowSeconds, keyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = keyFn ? keyFn(req) : req.ip ?? 'unknown';
    const key = `ratelimit:${keyPrefix}:${identifier}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
    res.setHeader('X-RateLimit-Reset', ttl.toString());

    if (count > max) {
      res.setHeader('Retry-After', ttl.toString());
      throw new AppError('TOO_MANY_ATTEMPTS', 'Too many requests, please try again later');
    }

    next();
  };
}
