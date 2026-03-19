/**
 * Promo Code Routes (user-facing)
 *
 * POST /api/promo-codes/validate — Validate a promo code, return trial duration
 * POST /api/promo-codes/redeem   — Redeem a code with a selected tier
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate, redeem } from '../services/promo-code';
import { getEffectiveTier } from '../utils/effective-tier';

const router = Router();

router.use(authMiddleware);

const VALID_TIERS = ['player', 'host', 'facility'];

// ---------------------------------------------------------------------------
// POST /validate — Check whether a promo code is valid
// ---------------------------------------------------------------------------

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    const result = await validate(code);
    return res.json(result);
  } catch (error) {
    console.error('Error validating promo code:', error);
    return res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

// ---------------------------------------------------------------------------
// POST /redeem — Redeem a promo code with a selected tier
// ---------------------------------------------------------------------------

router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { code, selectedTier } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    if (!selectedTier || !VALID_TIERS.includes(selectedTier)) {
      return res.status(400).json({ error: 'Invalid tier selection' });
    }

    const updatedUser = await redeem(userId, code, selectedTier);

    const effectiveTier = getEffectiveTier({
      membershipTier: (updatedUser as any).membershipTier ?? 'standard',
      trialTier: (updatedUser as any).trialTier ?? null,
      trialExpiry: (updatedUser as any).trialExpiry ?? null,
    });

    return res.json({ ...updatedUser, effectiveTier });
  } catch (error: any) {
    console.error('Error redeeming promo code:', error);

    if (error.message === 'Invalid promo code') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Invalid tier selection') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'You already have this tier or higher from this code') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to redeem promo code' });
  }
});

export default router;
