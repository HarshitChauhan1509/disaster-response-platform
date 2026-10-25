import { Request, Response, NextFunction } from 'express';
import { IdempotencyRecord } from '../shared/utils/idempotency.model.js';
import { logger } from '../shared/logger/logger.js';

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.header('idempotency-key');
  if (!idempotencyKey) {
    return next();
  }

  req.idempotencyKey = idempotencyKey;
  const userId = req.user?.id;

  try {
    const existing = await IdempotencyRecord.findOne({
      key: idempotencyKey,
      path: req.baseUrl + req.path,
    });

    if (existing) {
      logger.info({
        requestId: req.id,
        idempotencyKey,
        path: req.path,
      }, 'Idempotent request replayed from cache');

      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }

    // Intercept response to store upon successful completion
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      // Only cache successful or client error responses (don't cache 500s)
      if (res.statusCode < 500) {
        IdempotencyRecord.create({
          key: idempotencyKey,
          path: req.baseUrl + req.path,
          method: req.method,
          userId,
          statusCode: res.statusCode,
          responseBody: body,
        }).catch((err) => {
          logger.error({ err, idempotencyKey }, 'Failed to save idempotency record');
        });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
