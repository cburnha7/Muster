import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required in production'
  );
}
const SECRET = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
      /** The effective user ID for the current request. Set by activeContextMiddleware.
       *  When a guardian is acting on behalf of a dependent, this is the dependent's ID.
       *  Otherwise, it equals req.user.userId. */
      effectiveUserId?: string;
    }
  }
}

/**
 * Strict auth middleware — requires a valid JWT Bearer token.
 * No fallbacks. Used on all mutating endpoints.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string };

    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional auth middleware — tries JWT first, falls back to X-User-Id header.
 * Used on read endpoints where auth is helpful but not required,
 * and on endpoints that need backward compatibility during token refresh.
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const xUserId = req.headers['x-user-id'] as string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Skip mock tokens in development
      if (
        token.startsWith('mock_token_') &&
        process.env.NODE_ENV === 'development'
      ) {
        if (xUserId) {
          req.user = { userId: xUserId };
        }
        return next();
      }

      const decoded = jwt.verify(token, SECRET) as { userId: string };
      req.user = { userId: decoded.userId };
      return next();
    }

    // Fallback to X-User-Id header (for backward compat during token refresh)
    if (xUserId) {
      req.user = { userId: xUserId };
    }

    next();
  } catch (error) {
    // JWT verification failed — try X-User-Id as last resort
    const xUserId = req.headers['x-user-id'] as string | undefined;
    if (xUserId) {
      req.user = { userId: xUserId };
    }
    next();
  }
};
