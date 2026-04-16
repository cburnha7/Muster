/**
 * Connect Express Onboarding API Routes
 *
 * Thin route layer that delegates to the connect-onboarding service.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthMiddleware } from '../middleware/auth';
import { getStripe } from '../services/stripe-connect';
import {
  EntityType,
  startOnboarding,
  checkOnboardingStatus,
  listConnectAccounts,
} from '../services/connect-onboarding';

const router = Router();

router.use(optionalAuthMiddleware);

// ---------------------------------------------------------------------------
// POST /onboard — Start or resume Connect onboarding
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
    const { entityType, entityId, refreshUrl, returnUrl } = req.body;

    if (!entityType || !entityId || !refreshUrl || !returnUrl) {
      return res.status(400).json({
        error:
          'Missing required fields: entityType, entityId, refreshUrl, returnUrl',
      });
    }

    if (!['roster', 'facility', 'league'].includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entityType. Must be roster, facility, or league',
      });
    }

    const result = await startOnboarding(
      prisma,
      userId,
      entityType as EntityType,
      entityId,
      refreshUrl,
      returnUrl
    );

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.json({ url: result.url });
  } catch (err: any) {
    console.error('Connect onboarding error:', err?.message || err);
    const msg =
      err?.type === 'StripeInvalidRequestError'
        ? err.message
        : 'Failed to start Connect onboarding';
    return res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /status/:entityType/:entityId — Check onboarding status
// ---------------------------------------------------------------------------

router.get(
  '/status/:entityType/:entityId',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId)
        return res.status(401).json({ error: 'Authentication required' });
      const { entityType, entityId } = req.params;

      if (!['roster', 'facility', 'league'].includes(entityType)) {
        return res.status(400).json({
          error: 'Invalid entityType. Must be roster, facility, or league',
        });
      }

      const result = await checkOnboardingStatus(
        prisma,
        userId,
        entityType as EntityType,
        entityId
      );

      if (result.error) {
        return res.status(result.status || 500).json({ error: result.error });
      }

      return res.json(result.data);
    } catch (err) {
      console.error('Connect status error:', err);
      return res
        .status(500)
        .json({ error: 'Failed to retrieve Connect status' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /accounts — List all Connect accounts for the current user
// ---------------------------------------------------------------------------

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: 'Authentication required' });
    const accounts = await listConnectAccounts(prisma, userId);
    return res.json({ accounts });
  } catch (err) {
    console.error('Connect accounts list error:', err);
    return res.status(500).json({ error: 'Failed to list Connect accounts' });
  }
});

export default router;
