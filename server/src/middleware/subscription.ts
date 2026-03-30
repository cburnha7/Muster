/**
 * Subscription middleware — server-side enforcement of plan gates.
 *
 * Admins and users with a sufficient membershipTier bypass the paywall.
 *
 * Usage in routes:
 *   router.post('/leagues', requirePlan('league'), async (req, res) => { ... });
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const PLAN_HIERARCHY = ['free', 'roster', 'league', 'facility_basic', 'facility_pro'];

/** Maps membershipTier values to equivalent subscription plans */
const TIER_TO_PLAN: Record<string, string> = {
  facility: 'facility_pro',
  host: 'facility_basic',
  player: 'league',
  standard: 'free',
};

/**
 * Check if a user bypasses the plan gate via role or membershipTier.
 * Returns true if the user should be allowed through regardless of subscription.
 */
export async function userBypassesPlanGate(userId: string, requiredPlan: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, membershipTier: true, trialTier: true, trialExpiry: true },
  });

  if (!user) return false;

  // Admins bypass all gates
  if (user.role === 'admin') return true;

  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);

  // Check permanent membershipTier
  const tierPlan = TIER_TO_PLAN[user.membershipTier || 'standard'] || 'free';
  if (PLAN_HIERARCHY.indexOf(tierPlan) >= requiredIndex) return true;

  // Check active trial tier
  if (user.trialTier && user.trialExpiry && new Date(user.trialExpiry) > new Date()) {
    const trialPlan = TIER_TO_PLAN[user.trialTier] || 'free';
    if (PLAN_HIERARCHY.indexOf(trialPlan) >= requiredIndex) return true;
  }

  return false;
}

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

      // Admin / membershipTier bypass
      if (await userBypassesPlanGate(userId, requiredPlan)) {
        return next();
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
