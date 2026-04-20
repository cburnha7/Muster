import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/invites/send — send an invite email to a non-Muster user
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { name, email, invitedBy, context, contextId } = req.body;
    // context: 'event' | 'roster'
    // contextId: event ID or roster ID

    if (!name || !email || !invitedBy) {
      return res
        .status(400)
        .json({ error: 'name, email, and invitedBy are required' });
    }

    // TODO: Send actual email via email service
    // For now, just log and return success
    console.log(
      `Invite sent to ${email} (${name}) by ${invitedBy} for ${context} ${contextId}`
    );

    res.status(201).json({
      success: true,
      message: `Invite sent to ${email}`,
      pendingInviteId: `pending-${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Send invite error:', error?.message);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

export default router;
