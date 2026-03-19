import { Router, Request, Response } from 'express';
import { verificationService } from '../services/VerificationService';
import { authMiddleware } from '../middleware/auth';
import { create, list } from '../services/promo-code';
import { prisma } from '../index';

const router = Router();

// Get all pending verifications
router.get('/verifications/pending', async (req, res) => {
  try {
    const verifications = await verificationService.getPendingVerifications();
    res.json(verifications);
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

// Review verification
router.put('/verifications/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewerId, notes, rejectionReason } = req.body;

    if (!status || !reviewerId) {
      return res.status(400).json({ error: 'status and reviewerId are required' });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ error: 'rejectionReason is required when rejecting' });
    }

    const verification = await verificationService.reviewVerification(
      id,
      status,
      reviewerId,
      notes,
      rejectionReason
    );

    res.json(verification);
  } catch (error: any) {
    console.error('Review verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to review verification' });
  }
});

// ---------------------------------------------------------------------------
// Promo Code Admin Endpoints (admin-only)
// ---------------------------------------------------------------------------

router.post('/promo-codes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { code, trialDurationDays } = req.body;
    const promoCode = await create(code, trialDurationDays ?? 30, userId);
    return res.status(201).json(promoCode);
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    if (error.message === 'A promo code with this value already exists') {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create promo code' });
  }
});

router.get('/promo-codes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const promoCodes = await list();
    return res.json(promoCodes);
  } catch (error) {
    console.error('Error listing promo codes:', error);
    return res.status(500).json({ error: 'Failed to list promo codes' });
  }
});

export default router;
