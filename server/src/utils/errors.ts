import { Request, Response, NextFunction } from 'express';

/**
 * Standardized error codes used across the API.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Application error class with status code and error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Send a standardized error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  });
}

/**
 * Wraps an async route handler to catch rejected promises
 * and forward them to Express error handling via next().
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Send a service error response. Extracts statusCode and message from
 * ServiceError instances, falls back to 500 for unknown errors.
 * Use this in route handlers: `sendServiceError(res, error)`
 */
export function sendServiceError(res: Response, error: any): void {
  const status = error.statusCode || 500;
  const body: any = { error: error.message || 'Internal error' };
  if (error.extra) Object.assign(body, error.extra);
  res.status(status).json(body);
}
