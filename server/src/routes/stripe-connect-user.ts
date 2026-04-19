import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import {
  getStripe,
  createConnectAccount,
  createConnectAccountLink,
  getConnectAccountStatus,
} from '../services/stripe-connect';

const router = Router();

router.use(authMiddleware);

// ---------------------------------------------------------------------------
// POST /onboard — Start or resume Connect onboarding for the current user
// ---------------------------------------------------------------------------

router.post('/onboard', async (req: Request, res: Response) => {
  try {
    if (!getStripe()) {
      return res.status(503).json({
        error: 'Payments are not configured yet. Please contact support.',
      });
    }

    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Authentication required' });

    const { refreshUrl, returnUrl } = req.body;

    if (!refreshUrl || !returnUrl) {
      return res.status(400).json({
        error: 'Missing required fields: refreshUrl, returnUrl',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Dependent accounts have no email — use a placeholder so Stripe doesn't reject
    const email = user.email ?? undefined;

    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await createConnectAccount(email);
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: accountId },
      });
    }

    const accountLink = await createConnectAccountLink(
      accountId,
      refreshUrl,
      returnUrl
    );

    return res.json({ url: accountLink.url, accountId });
  } catch (err: any) {
    console.error('User Connect onboarding error:', err?.message || err);
    const msg =
      err?.type === 'StripeInvalidRequestError'
        ? err.message
        : 'Failed to start Connect onboarding';
    return res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /status — Check the current user's Connect account status
// ---------------------------------------------------------------------------

router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Authentication required' });

    if (!getStripe()) {
      return res.json({
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeAccountId) {
      return res.json({
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    const status = await getConnectAccountStatus(user.stripeAccountId);

    return res.json({
      onboarded: true,
      accountId: user.stripeAccountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
    });
  } catch (err: any) {
    console.error('User Connect status error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve Connect status' });
  }
});

export default router;
