import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import EmailService from '../services/EmailService';

const router = Router();

/**
 * POST /api/invites/send
 * Send an invite email to someone who isn't on Muster yet.
 * Creates a PendingInvite record so it can be claimed on registration.
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, email, context, contextId, contextName } = req.body as {
      name: string;
      email: string;
      context?: string;
      contextId?: string;
      contextName?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if this person already has a Muster account
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existingUser) {
      // User already exists — add them directly to the roster if context is roster
      if (context === 'roster' && contextId) {
        const alreadyMember = await prisma.teamMember.findFirst({
          where: { teamId: contextId, userId: existingUser.id },
        });
        if (!alreadyMember) {
          await prisma.teamMember.create({
            data: {
              teamId: contextId,
              userId: existingUser.id,
              role: 'member',
              status: 'pending',
            },
          });
        }
      }
      return res.json({
        success: true,
        message: `${name} is already on Muster and has been invited`,
        alreadyOnMuster: true,
      });
    }

    // Create pending invite record
    const invite = await prisma.pendingInvite.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        invitedBy: userId,
        context: context || 'roster',
        contextId: contextId || '',
        contextName: contextName || null,
      },
    });

    // Get inviter's name for the email
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`.trim()
      : 'Someone';

    // Send invite email
    await EmailService.sendInviteEmail(
      normalizedEmail,
      name.trim(),
      inviterName,
      contextName || 'a roster',
      context || 'roster'
    );

    res.status(201).json({
      success: true,
      message: `Invite sent to ${email}`,
      pendingInviteId: invite.id,
    });
  } catch (error: any) {
    console.error('Send invite error:', error?.message);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

export default router;
