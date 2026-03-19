/**
 * User-Level Stripe Connect Express Onboarding
 *
 * POST /onboard — Create Express account for the authenticated user, return account link URL
 * GET  /status  — Check the user's Connect account onboarding status
 *
 * This is separate from the entity-level onboarding in connect-onboarding.ts.
 * Here the stripeAccountId lives on the User record directly.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import {
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
    const userId = req.user!.userId;
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

    let accountId = user.stripeAccountId;

    // Create a new Express account if the user doesn't have one yet
    if (!accountId) {
      const account = await createConnectAccount(user.email);
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: accountId },
      });
    }

    // Generate an account link for onboarding
    const accountLink = await createConnectAccountLink(accountId, refreshUrl, returnUrl);

    return res.json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error('User Connect onboarding error:', err);
    return res.status(500).json({ error: 'Failed to start Connect onboarding' });
  }
});

// ---------------------------------------------------------------------------
// GET /status — Check the current user's Connect account status
// ---------------------------------------------------------------------------

router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

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
  } catch (err) {
    console.error('User Connect status error:', err);
    return res.status(500).json({ error: 'Failed to retrieve Connect status' });
  }
});

export default router;
