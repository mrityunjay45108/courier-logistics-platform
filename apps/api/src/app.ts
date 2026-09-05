import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import healthRoutes from './modules/health/health.routes';
import apiRoutes from './routes';
import { sendError } from './utils/response';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (e.g. Nginx, Docker, Cloudflare)
  app.set('trust proxy', 1);

  // Security HTTP Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = config.corsOrigin.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl) in non-production
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || !config.isProduction) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-request-id',
        'X-Api-Key',
        'x-api-key',
        'X-Signature',
        'x-signature',
        'X-Timestamp',
        'x-timestamp',
        'Idempotency-Key',
        'idempotency-key',
      ],
    })
  );

  // Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Structured Logging
  app.use(requestLogger);

  // Health and Diagnostic probes (excluded from rate limiting)
  app.use('/', healthRoutes);
  app.use('/api', healthRoutes);

  // Domain API Routes (protected by rate limiting)
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use((req, res) => {
    sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
