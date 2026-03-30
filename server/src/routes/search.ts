import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Search teams by name
router.get('/teams', async (req, res) => {
  try {
    const { query, page = '1', limit = '20' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length < 1) {
      return res.status(400).json({ error: 'Search query must be at least 1 character' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where = {
      name: {
        contains: query,
        mode: 'insensitive' as const,
      },
    };

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { members: true } },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.team.count({ where }),
    ]);

    const results = teams.map(({ _count, ...team }) => ({
      ...team,
      memberCount: _count.members,
    }));

    res.json({
      results,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Search teams error:', error);
    res.status(500).json({ error: 'Failed to search teams' });
  }
});

export default router;
