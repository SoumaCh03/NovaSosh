import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';

// Avoids exhausting DB connections from creating a new PrismaClient on every
// hot-reload in dev (tsx watch). In production a single instance per process
// is also correct.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}
