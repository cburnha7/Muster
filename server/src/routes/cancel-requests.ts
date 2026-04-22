/**
 * Cancel Request Routes
 *
 * Endpoints for ground owners to view, approve, and deny
 * cancel requests for reservations inside the cancellation window.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  approveCancelRequest,
  denyCancelRequest,
} from '../services/cancel-request';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ---------------------------------------------------------------------------
// GET /cancel-requests/pending
// Fetch pending cancel requests for the authenticated owner's grounds
// ---------------------------------------------------------------------------
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const ownerId = req.user!.userId;

    const cancelRequests = await prisma.cancelRequest.findMany({
      where: {
        status: 'pending',
        ground: {
          ownerId,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reservation: {
          select: {
            totalPrice: true,
            timeSlot: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
                court: {
                  select: {
                    name: true,
                    facility: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });

    return res.json(cancelRequests);
  } catch (error) {
    console.error('Get pending cancel requests error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /cancel-requests/:id/approve
// Approve a pending cancel request (ground owner only)
// ---------------------------------------------------------------------------
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const ownerId = req.user!.userId;

    await approveCancelRequest(id, ownerId, prisma);

    const updated = await prisma.cancelRequest.findUnique({
      where: { id },
    });

    return res.json(updated);
  } catch (error: any) {
    if (error.message === 'Cancel request not found')
      return res.status(404).json({ error: error.message });
    if (error.message === 'Unauthorized')
      return res.status(403).json({ error: error.message });
    if (error.message === 'Cancel request already resolved')
      return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /cancel-requests/:id/deny
// Deny a pending cancel request (ground owner only)
// ---------------------------------------------------------------------------
router.post('/:id/deny', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const ownerId = req.user!.userId;

    await denyCancelRequest(id, ownerId, prisma);

    const updated = await prisma.cancelRequest.findUnique({
      where: { id },
    });

    return res.json(updated);
  } catch (error: any) {
    if (error.message === 'Cancel request not found')
      return res.status(404).json({ error: error.message });
    if (error.message === 'Unauthorized')
      return res.status(403).json({ error: error.message });
    if (error.message === 'Cancel request already resolved')
      return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
