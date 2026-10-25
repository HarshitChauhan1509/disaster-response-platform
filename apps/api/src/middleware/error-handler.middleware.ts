import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../shared/errors/app-error.js';
import { ErrorCodes } from '../shared/errors/error-codes.js';
import { logger } from '../shared/logger/logger.js';
import { config } from '../config/index.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const requestId = req.id || 'unknown';

  // 1. Handled AppError
  if (err instanceof AppError) {
    logger.warn({
      requestId,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method,
    }, `Operational error: ${err.message}`);

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.flatten();
    logger.warn({
      requestId,
      statusCode: 422,
      code: ErrorCodes.VALIDATION_ERROR,
      details: formatted,
      path: req.path,
      method: req.method,
    }, 'Validation error');

    res.status(422).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid input payload',
        details: formatted,
      },
      requestId,
    });
    return;
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message: `Invalid format for field '${err.path}': ${err.value}`,
      },
      requestId,
    });
    return;
  }

  // 4. Mongoose Validation Error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Database schema validation failed',
        details,
      },
      requestId,
    });
    return;
  }

  // 5. MongoDB Duplicate Key (E11000)
  if ((err as unknown as { code?: number }).code === 11000) {
    const keyVal = (err as unknown as { keyValue?: Record<string, unknown> }).keyValue;
    res.status(409).json({
      success: false,
      error: {
        code: ErrorCodes.CONFLICT,
        message: `Unique constraint violation`,
        details: keyVal,
      },
      requestId,
    });
    return;
  }

  // 6. JSON Parse Error in body
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message: 'Malformed JSON payload',
      },
      requestId,
    });
    return;
  }

  // 7. Unhandled Unexpected Error
  logger.error({
    requestId,
    error: err.message,
    stack: config.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  }, 'Unhandled internal error');

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: config.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message,
    },
    requestId,
  });
};
