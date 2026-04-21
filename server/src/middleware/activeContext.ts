import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Middleware that validates the X-Active-User-Id header.
 *
 * If the header is present and differs from the authenticated user,
 * verifies the authenticated user is the guardian of the active user.
 * Sets req.effectiveUserId to the validated active user ID.
 *
 * If the header is absent, req.effectiveUserId = req.user.userId.
 *
 * Must be placed AFTER authMiddleware.
 */
export async function activeContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authUserId = req.user?.userId;
  if (!authUserId) {
    // No auth — skip context resolution
    return next();
  }

  const activeId = req.headers['x-active-user-id'] as string | undefined;

  if (!activeId || activeId === authUserId) {
    req.effectiveUserId = authUserId;
    return next();
  }

  // Verify guardian relationship
  try {
    const dependent = await prisma.user.findFirst({
      where: {
        id: activeId,
        guardianId: authUserId,
        isDependent: true,
      },
      select: { id: true },
    });

    if (!dependent) {
      res.status(403).json({
        error: 'You can only act on behalf of your own dependents',
      });
      return;
    }

    req.effectiveUserId = activeId;
    next();
  } catch (error) {
    console.error('Active context middleware error:', error);
    // Allow through on error to avoid blocking all requests
    req.effectiveUserId = authUserId;
    next();
  }
}
