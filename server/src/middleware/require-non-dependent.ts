/**
 * Require Non-Dependent Middleware
 *
 * Rejects requests where the effective user (req.effectiveUserId or
 * X-User-Id / JWT user) is a dependent account. Used to guard creation,
 * management, payment, and other privileged routes that dependents
 * (free-tier restricted users) are not allowed to access.
 *
 * Must run AFTER authMiddleware and activeContextMiddleware.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

/** In-memory cache so we don't hit the DB on every request. */
const dependentCache = new Map<string, { isDependent: boolean; ts: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export const requireNonDependent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId =
    req.effectiveUserId ||
    req.user?.userId ||
    (req.headers['x-user-id'] as string | undefined);

  if (!userId) {
    return next(); // Let downstream auth handle 401
  }

  try {
    const cached = dependentCache.get(userId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      if (cached.isDependent) {
        return res.status(403).json({
          error: 'Dependents are not permitted to perform this action',
        });
      }
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDependent: true },
    });

    const isDependent = user?.isDependent === true;
    dependentCache.set(userId, { isDependent, ts: Date.now() });

    if (isDependent) {
      return res.status(403).json({
        error: 'Dependents are not permitted to perform this action',
      });
    }

    return next();
  } catch (error) {
    console.error('requireNonDependent middleware error:', error);
    // If the isDependent column doesn't exist yet (migration not applied),
    // allow the request through rather than blocking all writes with a 500.
    return next();
  }
};

/** Exported for testing — clears the in-memory cache. */
export function clearDependentCache(): void {
  dependentCache.clear();
}
