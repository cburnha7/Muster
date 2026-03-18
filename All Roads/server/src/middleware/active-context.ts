/**
 * Active Context Middleware
 *
 * Reads the optional `X-Active-User-Id` header and, when it differs from the
 * authenticated (JWT) user, verifies that the target user is a dependent owned
 * by the guardian. On success, `req.effectiveUserId` is set to the validated
 * dependent ID so downstream handlers can use it transparently.
 *
 * Must run AFTER authMiddleware / optionalAuthMiddleware.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

/** Simple in-memory cache for guardian→dependent ownership checks. */
const guardianCache = new Map<string, { valid: boolean; ts: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function cacheKey(guardianId: string, dependentId: string): string {
  return `${guardianId}:${dependentId}`;
}

export const activeContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // If no authenticated user, nothing to resolve — let downstream handle 401.
  if (!req.user?.userId) {
    return next();
  }

  const jwtUserId = req.user.userId;
  const activeUserHeader = req.headers['x-active-user-id'] as string | undefined;

  // No header or same as JWT user → default behaviour.
  if (!activeUserHeader || activeUserHeader === jwtUserId) {
    req.effectiveUserId = jwtUserId;
    return next();
  }

  // Header present and differs — validate guardian ownership.
  try {
    const key = cacheKey(jwtUserId, activeUserHeader);
    const cached = guardianCache.get(key);

    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      if (cached.valid) {
        req.effectiveUserId = activeUserHeader;
        return next();
      }
      return res.status(403).json({ error: 'Not authorized to act as this user' });
    }

    const dependent = await prisma.user.findUnique({
      where: { id: activeUserHeader },
      select: { guardianId: true, isDependent: true },
    });

    const valid =
      !!dependent &&
      dependent.isDependent === true &&
      dependent.guardianId === jwtUserId;

    guardianCache.set(key, { valid, ts: Date.now() });

    if (!valid) {
      return res.status(403).json({ error: 'Not authorized to act as this user' });
    }

    req.effectiveUserId = activeUserHeader;
    return next();
  } catch (error) {
    console.error('Active context middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/** Exported for testing — clears the in-memory guardian cache. */
export function clearGuardianCache(): void {
  guardianCache.clear();
}
