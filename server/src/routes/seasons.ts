import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateAvgCourtCost } from '../services/balance';
import { calculateSuggestedDues } from '../services/suggested-dues';

const router = express.Router();

// GET /api/seasons - Get all seasons with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      isActive,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (leagueId) {
      where.leagueId = leagueId;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get total count
    const total = await prisma.season.count({ where });

    // Get seasons with relations
    const seasons = await prisma.season.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
        memberships: {
          where: { status: 'active' },
          select: { id: true }
        },
        matches: {
          select: { id: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    // Add counts
    const seasonsWithCounts = seasons.map(season => ({
      ...season,
      memberCount: season.memberships.length,
      matchCount: season.matches.length,
      memberships: undefined,
      matches: undefined
    }));

    res.json({
      data: seasonsWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

// GET /api/seasons/suggested-dues - Calculate suggested minimum dues for a paid season
router.get('/suggested-dues', async (req: Request, res: Response) => {
  try {
    const { sportType, gamesPerTeam, rosterCount } = req.query;

    if (!sportType || !gamesPerTeam || !rosterCount) {
      return res.status(400).json({
        error: 'Missing required query parameters: sportType, gamesPerTeam, rosterCount',
      });
    }

    const gamesNum = parseInt(gamesPerTeam as string, 10);
    const rosterNum = parseInt(rosterCount as string, 10);

    if (isNaN(gamesNum) || gamesNum <= 0) {
      return res.status(400).json({ error: 'gamesPerTeam must be a positive integer' });
    }
    if (isNaN(rosterNum) || rosterNum <= 0) {
      return res.status(400).json({ error: 'rosterCount must be a positive integer' });
    }

    const avgCourtCost = await calculateAvgCourtCost(sportType as string);
    const suggestedDues = calculateSuggestedDues(gamesNum, avgCourtCost, rosterNum);

    res.json({
      avgCourtCost,
      gamesPerTeam: gamesNum,
      rosterCount: rosterNum,
      suggestedMinDues: suggestedDues,
    });
  } catch (error) {
    console.error('Error calculating suggested dues:', error);
    res.status(500).json({ error: 'Failed to calculate suggested dues' });
  }
});

// GET /api/seasons/:id - Get season by ID with standings
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
            pointsConfig: true
          }
        },
        memberships: {
          where: { status: 'active' },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sportType: true
              }
            }
          },
          orderBy: [
            { points: 'desc' },
            { goalDifference: 'desc' },
            { goalsFor: 'desc' }
          ]
        },
        matches: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Format standings
    const standings = season.memberships.map((membership, index) => ({
      rank: index + 1,
      team: membership.team,
      stats: {
        matchesPlayed: membership.matchesPlayed,
        wins: membership.wins,
        losses: membership.losses,
        draws: membership.draws,
        points: membership.points,
        goalsFor: membership.goalsFor,
        goalsAgainst: membership.goalsAgainst,
        goalDifference: membership.goalDifference
      }
    }));

    res.json({
      ...season,
      standings,
      memberships: undefined
    });
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

// POST /api/seasons - Create new season
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      name,
      startDate,
      endDate,
      userId
    } = req.body;

    // Validate required fields
    if (!leagueId || !name || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: leagueId, name, startDate, endDate' 
      });
    }

    // Check if league exists and user is operator
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (userId && league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can create seasons' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Create season
    const season = await prisma.season.create({
      data: {
        leagueId,
        name,
        startDate: start,
        endDate: end
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        }
      }
    });

    res.status(201).json(season);
  } catch (error) {
    console.error('Error creating season:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// PUT /api/seasons/:id - Update season
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      startDate,
      endDate,
      isActive,
      userId
    } = req.body;

    // Check if season exists
    const existingSeason = await prisma.season.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingSeason) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Check if user is league operator
    if (userId && existingSeason.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can update seasons' });
    }

    // Update season
    const season = await prisma.season.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        }
      }
    });

    res.json(season);
  } catch (error) {
    console.error('Error updating season:', error);
    res.status(500).json({ error: 'Failed to update season' });
  }
});

// POST /api/seasons/:id/complete - Complete season and archive standings
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if season exists
    const existingSeason = await prisma.season.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingSeason) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Check if user is league operator
    if (userId && existingSeason.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can complete seasons' });
    }

    // Mark season as completed
    const season = await prisma.season.update({
      where: { id },
      data: {
        isCompleted: true,
        isActive: false
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        }
      }
    });

    // Note: Standings are already archived in the LeagueMembership records
    // with the seasonId, so no additional archiving is needed

    res.json(season);
  } catch (error) {
    console.error('Error completing season:', error);
    res.status(500).json({ error: 'Failed to complete season' });
  }
});

// GET /api/seasons/:id/standings - Get season standings
router.get('/:id/standings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const memberships = await prisma.leagueMembership.findMany({
      where: {
        seasonId: id,
        status: 'active'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' }
      ]
    });

    // Format standings
    const standings = memberships.map((membership, index) => ({
      rank: index + 1,
      team: membership.team,
      stats: {
        matchesPlayed: membership.matchesPlayed,
        wins: membership.wins,
        losses: membership.losses,
        draws: membership.draws,
        points: membership.points,
        goalsFor: membership.goalsFor,
        goalsAgainst: membership.goalsAgainst,
        goalDifference: membership.goalDifference
      }
    }));

    res.json(standings);
  } catch (error) {
    console.error('Error fetching season standings:', error);
    res.status(500).json({ error: 'Failed to fetch season standings' });
  }
});

export default router;
