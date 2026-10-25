import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config/index.js';
import { logger } from './shared/logger/logger.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { AppError } from './shared/errors/app-error.js';

// Module routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { incidentRoutes } from './modules/incidents/incident.routes.js';
import { responderRoutes } from './modules/responders/responder.routes.js';
import { assignmentRoutes } from './modules/assignments/assignment.routes.js';
import { resourceRoutes } from './modules/resources/resource.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Baseline Security
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    })
  );

  // Request ID
  app.use(requestIdMiddleware);

  // Body parser
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTP Request Logging (excluding health checks)
  if (config.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => (req as Request).id,
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      })
    );
  }

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'disaster-response-api',
      environment: config.NODE_ENV,
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/incidents', incidentRoutes);
  app.use('/api/v1/responders', responderRoutes);
  app.use('/api/v1/assignments', assignmentRoutes);
  app.use('/api/v1/resources', resourceRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);

  // 404 Route Handler
  app.use((req: Request) => {
    throw AppError.notFound(`Cannot ${req.method} ${req.path}`);
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
