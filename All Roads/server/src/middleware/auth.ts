import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as { userId: string };

    // Add user info to request
    req.user = { userId: decoded.userId };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional auth middleware - doesn't fail if no token
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const xUserId = req.headers['x-user-id'] as string | undefined;
    
    console.log('🔐 Optional Auth - Header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'none');
    console.log('🔐 Optional Auth - X-User-Id:', xUserId);
    
    // Accept X-User-Id header as fallback authentication
    // This allows the app to work when JWT tokens expire but user data is still cached
    if (xUserId) {
      req.user = { userId: xUserId };
      console.log('🔐 Optional Auth - Using X-User-Id header:', xUserId);
      return next();
    }
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Check if it's a mock token (starts with 'mock_token_')
      if (token.startsWith('mock_token_') && process.env.NODE_ENV === 'development') {
        console.log('🔐 Optional Auth - Mock token detected, but no X-User-Id header');
        // Continue without user - frontend should send X-User-Id
        return next();
      }
      
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as { userId: string };
      
      req.user = { userId: decoded.userId };
      console.log('🔐 Optional Auth - Decoded userId:', decoded.userId);
    } else {
      console.log('🔐 Optional Auth - No valid token, continuing without auth');
    }

    next();
  } catch (error) {
    console.log('🔐 Optional Auth - Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    // Continue without user if token is invalid
    next();
  }
};
