import { ErrorCode, ErrorCodes } from './error-codes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, ErrorCodes.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, ErrorCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Permission denied'): AppError {
    return new AppError(403, ErrorCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, ErrorCodes.NOT_FOUND, message);
  }

  static conflict(message: string, code: ErrorCode = ErrorCodes.CONFLICT, details?: unknown): AppError {
    return new AppError(409, code, message, details);
  }

  static validation(details: unknown, message = 'Input validation failed'): AppError {
    return new AppError(422, ErrorCodes.VALIDATION_ERROR, message, details);
  }

  static resourceInsufficient(message = 'Insufficient resource quantity available', details?: unknown): AppError {
    return new AppError(409, ErrorCodes.RESOURCE_INSUFFICIENT, message, details);
  }

  static invalidStatusTransition(from: string, to: string, details?: unknown): AppError {
    return new AppError(
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
      `Cannot transition status from '${from}' to '${to}'`,
      details
    );
  }

  static responderUnavailable(message = 'Responder is currently unavailable'): AppError {
    return new AppError(409, ErrorCodes.RESPONDER_UNAVAILABLE, message);
  }

  static skillMismatch(requiredSkills: string[], responderSkills: string[]): AppError {
    return new AppError(
      400,
      ErrorCodes.SKILL_MISMATCH,
      `Responder skills [${responderSkills.join(', ')}] do not meet required skills [${requiredSkills.join(', ')}]`,
      { requiredSkills, responderSkills }
    );
  }

  static activeAssignmentExists(message = 'Responder already has an active assignment'): AppError {
    return new AppError(409, ErrorCodes.ACTIVE_ASSIGNMENT_EXISTS, message);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, ErrorCodes.INTERNAL_SERVER_ERROR, message, undefined, false);
  }
}
