import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates (and coerces/strips-unknown via the schema) the given request
 * part, replacing it with the parsed result. Throws ZodError on failure,
 * which the global errorHandler converts into the standard error envelope.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    req[part] = schema.parse(req[part]);
    next();
  };
}
