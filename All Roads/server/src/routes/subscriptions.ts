import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

const PLAN_HIERARCHY = ['free', 'roster', 'league', 'facility_basic', 'facility_pro'];

/** Get subscription for a user */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      return res.json({
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/** Create or update subscription (called after Stripe checkout success) */
router.post('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { plan, stripeCustomerId, stripeSubscriptionId, stripePriceId, currentPeriodEnd } = req.body;

    if (!PLAN_HIERARCHY.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      },
      update: {
        plan,
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      },
    });

    res.json(subscription);
  } catch (error) {
    console.error('Create/update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;
