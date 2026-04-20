import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/availability/:userId — get all availability blocks for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const blocks = await prisma.availabilityBlock.findMany({
      where: { userId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ blocks });
  } catch (error: any) {
    // Table may not exist yet if migration hasn't run
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return res.json({ blocks: [] });
    }
    console.error('Get availability blocks error:', error?.message);
    res.status(500).json({ error: 'Failed to fetch availability blocks' });
  }
});

// POST /api/availability/:userId/batch — import a batch of blocks
router.post('/:userId/batch', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const { batchName, events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const created = await prisma.availabilityBlock.createMany({
      data: events.map((evt: any) => ({
        userId,
        date: evt.date,
        startTime: evt.startTime,
        duration: evt.duration || '60 min',
        title: batchName || 'Imported',
        batchId,
      })),
    });

    res.status(201).json({ count: created.count, batchId });
  } catch (error: any) {
    console.error(
      'Create availability batch error:',
      error?.code,
      error?.message
    );
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return res.status(503).json({
        error:
          'Availability table not yet created. Run: npx prisma migrate deploy',
      });
    }
    res.status(500).json({
      error: 'Failed to create availability blocks',
      details: error?.message,
    });
  }
});

// DELETE /api/availability/:userId/:blockId — delete a single block
router.delete('/:userId/:blockId', authMiddleware, async (req, res) => {
  try {
    const { userId, blockId } = req.params as {
      userId: string;
      blockId: string;
    };
    await prisma.availabilityBlock.deleteMany({
      where: { id: blockId, userId },
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete availability block error:', error?.message);
    res.status(500).json({ error: 'Failed to delete availability block' });
  }
});

// DELETE /api/availability/:userId/batch/:batchId — delete an entire batch
router.delete('/:userId/batch/:batchId', authMiddleware, async (req, res) => {
  try {
    const { userId, batchId } = req.params as {
      userId: string;
      batchId: string;
    };
    const result = await prisma.availabilityBlock.deleteMany({
      where: { userId, batchId },
    });
    res.json({ deleted: result.count });
  } catch (error: any) {
    console.error('Delete availability batch error:', error?.message);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

export default router;
