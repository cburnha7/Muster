import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/waivers/facility/:facilityId — get current waiver
router.get('/facility/:facilityId', async (req, res) => {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: req.params.facilityId },
      select: { waiverRequired: true, waiverText: true, waiverVersion: true },
    });
    if (!facility || !facility.waiverRequired || !facility.waiverText) {
      return res.status(404).json({ error: 'No waiver found for this facility' });
    }
    res.json({ waiverRequired: facility.waiverRequired, waiverText: facility.waiverText, waiverVersion: facility.waiverVersion });
  } catch (error) {
    console.error('Get waiver error:', error);
    res.status(500).json({ error: 'Failed to fetch waiver' });
  }
});

// GET /api/waivers/facility/:facilityId/status?userId= — waiver status for user
router.get('/facility/:facilityId/status', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.query.userId as string || req.user?.userId || req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const facility = await prisma.facility.findUnique({
      where: { id: req.params.facilityId },
      select: { waiverRequired: true, waiverVersion: true },
    });
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    if (!facility.waiverRequired || !facility.waiverVersion) {
      return res.json({ required: false, signed: false, waiverVersion: null });
    }

    const signature = await prisma.waiverSignature.findUnique({
      where: { userId_facilityId_waiverVersion: { userId, facilityId: req.params.facilityId, waiverVersion: facility.waiverVersion } },
    });

    res.json({ required: true, signed: !!signature, waiverVersion: facility.waiverVersion });
  } catch (error) {
    console.error('Get waiver status error:', error);
    res.status(500).json({ error: 'Failed to fetch waiver status' });
  }
});

// POST /api/waivers/sign — sign the current waiver
router.post('/sign', optionalAuthMiddleware, async (req, res) => {
  try {
    const { userId, facilityId } = req.body;
    if (!userId || !facilityId) return res.status(400).json({ error: 'userId and facilityId are required' });

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { waiverRequired: true, waiverVersion: true, waiverText: true },
    });
    if (!facility || !facility.waiverRequired || !facility.waiverVersion) {
      return res.status(400).json({ error: 'This facility does not have a waiver' });
    }

    // Check for existing signature
    const existing = await prisma.waiverSignature.findUnique({
      where: { userId_facilityId_waiverVersion: { userId, facilityId, waiverVersion: facility.waiverVersion } },
    });
    if (existing) return res.status(409).json({ error: 'Waiver already signed for this version' });

    const signature = await prisma.waiverSignature.create({
      data: {
        userId,
        facilityId,
        waiverVersion: facility.waiverVersion,
        ipAddress: req.ip || null,
      },
    });

    res.status(201).json(signature);
  } catch (error) {
    console.error('Sign waiver error:', error);
    res.status(500).json({ error: 'Failed to sign waiver' });
  }
});

export default router;
