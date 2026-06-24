import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './shared/lib/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { postsRouter, feedRouter } from './modules/posts/posts.routes';
import path from 'node:path';
import { themeRouter } from './modules/theme/theme.routes';
import { mediaRouter } from './modules/media/media.routes';
import { momentsRouter } from './modules/moments/moments.routes';
import { privacyRouter } from './modules/privacy/privacy.routes';
import { messengerRouter } from './modules/messenger/messenger.routes';
import { storiesRouter } from './modules/stories/stories.routes';
import { profilesRouter } from './modules/profiles/profiles.routes';
import { graphRouter } from './modules/graph/graph.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/posts', postsRouter);
  app.use('/api/v1/feed', feedRouter);
  app.use('/api/v1/theme', themeRouter);
  app.use('/api/v1/media', mediaRouter);
  app.use('/api/v1/moments', momentsRouter);
  app.use('/api/v1/privacy', privacyRouter);
  app.use('/api/v1/messenger', messengerRouter);
  app.use('/api/v1/stories', storiesRouter);
  app.use('/api/v1/profiles', profilesRouter);
  app.use('/api/v1/graph', graphRouter);
  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  // Add further module routers here as they're built:
  // app.use('/api/v1/users', usersRouter);
  // app.use('/api/v1/posts', postsRouter);
  // ...

  // Must be registered last — Express only treats a 4-arg middleware as an
  // error handler if it comes after all routes.
  app.use(errorHandler);

  return app;
}
