import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(globalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'srms-backend', time: new Date().toISOString() });
  });

  // Listing images are public; documents and work photos use /api/v1/files.
  for (const kind of ['property-images', 'room-images']) {
    app.use(`/uploads/${kind}`, express.static(path.join(env.upload.dir, kind), {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }));
  }

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const uploadsRoot = path.resolve(env.upload.dir);
