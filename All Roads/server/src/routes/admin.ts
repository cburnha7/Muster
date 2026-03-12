import { Router } from 'express';
import { verificationService } from '../services/VerificationService';

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

export default router;
