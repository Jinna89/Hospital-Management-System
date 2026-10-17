import 'express-async-errors';

import type { Application } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { env, isProduction } from './config/env';
import { generalRateLimiter } from './middlewares/rate-limit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import apiRouter from './routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without an Origin header,
        // such as server-to-server requests and health checks.
        if (!origin) {
          return callback(null, true);
        }

        // Support wildcard configuration.
        // Do not combine wildcard origins with credentials in production.
        if (allowedOrigins.includes('*')) {
          if (env.NODE_ENV === 'production') {
            return callback(new Error('Wildcard CORS origin is not allowed in production.'));
          }

          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Response compression
  app.use(compression());

  // Request body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // HTTP request logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(isProduction ? 'combined' : 'dev'));
  }

  // Rate limiting
  app.use(generalRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        uptime: process.uptime(),
      },
    });
  });

  // API routes
  app.use(env.API_BASE_PATH, apiRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
