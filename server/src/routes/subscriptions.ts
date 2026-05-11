import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { requireNonDependent } from '../middleware/require-non-dependent';
import { getStripe } from '../services/stripe-connect';

const router = Router();

const PLAN_HIERARCHY = [
  'free',
  'roster',
  'league',
  'facility_basic',
  'facility_pro',
];

/** Map plan names to Stripe price env vars */
const PLAN_TO_PRICE_ENV: Record<string, string> = {
  roster: 'STRIPE_PRICE_ROSTER',
  league: 'STRIPE_PRICE_LEAGUE',
  facility_basic: 'STRIPE_PRICE_FACILITY_BASIC',
  facility_pro: 'STRIPE_PRICE_FACILITY_PRO',
};

/** Get subscription for a user */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };

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

// ---------------------------------------------------------------------------
// POST /create-checkout-session — Create a Stripe Checkout Session
// ---------------------------------------------------------------------------
router.post(
  '/create-checkout-session',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { plan } = req.body;

      if (!plan || !PLAN_TO_PRICE_ENV[plan]) {
        return res.status(400).json({ error: 'Invalid plan selection' });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Payment service unavailable' });
      }

      const priceId = process.env[PLAN_TO_PRICE_ENV[plan]];
      if (!priceId) {
        return res
          .status(503)
          .json({ error: `Price not configured for plan: ${plan}` });
      }

      // Get user email for Stripe customer
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user?.email) {
        return res
          .status(400)
          .json({ error: 'User email is required for checkout' });
      }

      // Find or create Stripe customer
      let stripeCustomerId: string | undefined;
      const existingSub = await prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });

      if (existingSub?.stripeCustomerId) {
        stripeCustomerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            undefined,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
      }

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.CORS_ORIGIN || 'https://muster-ecru.vercel.app'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CORS_ORIGIN || 'https://muster-ecru.vercel.app'}/subscription-cancelled`,
        metadata: { userId, plan },
        subscription_data: {
          metadata: { userId, plan },
        },
      });

      // Upsert subscription record with customer ID (plan stays free until webhook confirms)
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: 'free',
          status: 'active',
          stripeCustomerId,
        },
        update: {
          stripeCustomerId,
        },
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('Create checkout session error:', error);
      return res
        .status(500)
        .json({ error: 'Failed to create checkout session' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /cancel — Cancel subscription at period end
// ---------------------------------------------------------------------------
router.post(
  '/cancel',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Payment service unavailable' });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { stripeSubscriptionId: true },
      });

      if (!subscription?.stripeSubscriptionId) {
        return res
          .status(400)
          .json({ error: 'No active subscription to cancel' });
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });

      return res.json({ success: true, cancelAtPeriodEnd: true });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
);

/** Create or update subscription (called after Stripe checkout success) */
router.post(
  '/',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        plan,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodEnd,
      } = req.body;

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
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd)
            : null,
        },
        update: {
          plan,
          status: 'active',
          stripeCustomerId,
          stripeSubscriptionId,
          stripePriceId,
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd)
            : null,
        },
      });

      res.json(subscription);
    } catch (error) {
      console.error('Create/update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  }
);

export default router;
