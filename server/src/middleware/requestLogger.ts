import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Structured request logger middleware.
 * - Generates or reads X-Request-ID for correlation
 * - Logs method, path, status, and duration as JSON
 * - Attaches requestId to req for downstream use
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const start = Date.now();

  // Attach to request for downstream use
  (req as any).requestId = requestId;

  // Set response header so clients can correlate
  res.setHeader('X-Request-ID', requestId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.userId || null;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      userId,
      ip: req.ip,
    };

    // Log as JSON for Railway/structured log ingestion
    if (res.statusCode >= 500) {
      console.error(JSON.stringify(logEntry));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify(logEntry));
    } else if (req.originalUrl !== '/health') {
      // Skip health check noise
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
}
