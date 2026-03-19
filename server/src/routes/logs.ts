import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/logs — accept a single log entry or a batch
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const entries = Array.isArray(body) ? body : [body];

    // Basic validation
    const valid = entries.filter(
      (e: any) => e.logType && e.message
    );

    if (valid.length === 0) {
      return res.status(400).json({ error: 'Each log entry requires logType and message' });
    }

    await prisma.appLog.createMany({
      data: valid.map((e: any) => ({
        logType: String(e.logType).substring(0, 50),
        message: String(e.message).substring(0, 2000),
        userId: e.userId ? String(e.userId).substring(0, 100) : null,
        screen: e.screen ? String(e.screen).substring(0, 200) : null,
        metadata: e.metadata ?? null,
      })),
    });

    res.status(201).json({ accepted: valid.length });
  } catch (error) {
    console.error('Error writing logs:', error);
    res.status(500).json({ error: 'Failed to write logs' });
  }
});

// GET /api/logs — query logs (admin/debug)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { logType, userId, screen, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 200);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (logType) where.logType = logType;
    if (userId) where.userId = userId;
    if (screen) where.screen = { contains: screen as string, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.appLog.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.appLog.count({ where }),
    ]);

    res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

export default router;
