/**
 * Subscription middleware — server-side enforcement of plan gates.
 *
 * Usage in routes:
 *   router.post('/leagues', requirePlan('league'), async (req, res) => { ... });
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

const PLAN_HIERARCHY = ['free', 'roster', 'league', 'facility_basic', 'facility_pro'];

/**
 * Returns middleware that checks the authenticated user has at least `requiredPlan`.
 */
export function requirePlan(requiredPlan: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { plan: true, status: true },
      });

      const userPlan = subscription?.plan || 'free';
      const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trialing';

      const userIndex = PLAN_HIERARCHY.indexOf(userPlan);
      const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);

      if (!isActive || userIndex < requiredIndex) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          requiredPlan,
          currentPlan: userPlan,
        });
      }

      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({ error: 'Failed to verify subscription' });
    }
  };
}
