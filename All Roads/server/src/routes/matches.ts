import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/matches - Get all matches with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      seasonId,
      teamId,
      status,
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
    
    if (seasonId) {
      where.seasonId = seasonId;
    }
    
    if (teamId) {
      where.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ];
    }
    
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.match.count({ where });

    // Get matches with relations
    const matches = await prisma.match.findMany({
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
        season: {
          select: {
            id: true,
            name: true
          }
        },
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
        },
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    res.json({
      data: matches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// GET /api/matches/:id - Get match by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
            organizerId: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// POST /api/matches - Create new match
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      seasonId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      eventId,
      notes,
      userId
    } = req.body;

    // Validate required fields
    if (!leagueId || !homeTeamId || !awayTeamId || !scheduledAt) {
      return res.status(400).json({ 
        error: 'Missing required fields: leagueId, homeTeamId, awayTeamId, scheduledAt' 
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
      return res.status(403).json({ error: 'Only the league operator can create matches' });
    }

    // Validate teams are different
    if (homeTeamId === awayTeamId) {
      return res.status(400).json({ error: 'Home and away teams must be different' });
    }

    // Validate both teams are league members
    const homeMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        teamId: homeTeamId,
        status: 'active'
      }
    });

    const awayMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        teamId: awayTeamId,
        status: 'active'
      }
    });

    if (!homeMembership) {
      return res.status(400).json({ error: 'Home team is not a member of this league' });
    }

    if (!awayMembership) {
      return res.status(400).json({ error: 'Away team is not a member of this league' });
    }

    // If event linked, validate it exists
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    // Create match
    const match = await prisma.match.create({
      data: {
        leagueId,
        seasonId,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(scheduledAt),
        eventId,
        notes
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
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
    });

    res.status(201).json(match);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// PUT /api/matches/:id - Update match
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      scheduledAt,
      status,
      notes,
      userId
    } = req.body;

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can update matches' });
    }

    // Update match
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
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
    });

    res.json(match);
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// DELETE /api/matches/:id - Delete match
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can delete matches' });
    }

    // Delete match
    await prisma.match.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;

// POST /api/matches/:id/result - Record match result
router.post('/:id/result', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, userId } = req.body;

    // Validate required fields
    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields: homeScore, awayScore' });
    }

    // Validate scores are non-negative
    if (homeScore < 0 || awayScore < 0) {
      return res.status(400).json({ error: 'Scores must be non-negative' });
    }

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can record match results' });
    }

    // Calculate outcome
    let outcome: string;
    if (homeScore > awayScore) {
      outcome = 'home_win';
    } else if (homeScore < awayScore) {
      outcome = 'away_win';
    } else {
      outcome = 'draw';
    }

    // Get points config from league
    const pointsConfig = existingMatch.league.pointsConfig as any;
    const winPoints = pointsConfig.win || 3;
    const drawPoints = pointsConfig.draw || 1;
    const lossPoints = pointsConfig.loss || 0;

    // Update match
    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore,
        awayScore,
        outcome,
        status: 'completed',
        playedAt: new Date()
      }
    });

    // Update home team membership stats
    const homeMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: existingMatch.leagueId,
        teamId: existingMatch.homeTeamId,
        status: 'active'
      }
    });

    if (homeMembership) {
      await prisma.leagueMembership.update({
        where: { id: homeMembership.id },
        data: {
          matchesPlayed: { increment: 1 },
          wins: outcome === 'home_win' ? { increment: 1 } : homeMembership.wins,
          losses: outcome === 'away_win' ? { increment: 1 } : homeMembership.losses,
          draws: outcome === 'draw' ? { increment: 1 } : homeMembership.draws,
          points: {
            increment: outcome === 'home_win' ? winPoints : outcome === 'draw' ? drawPoints : lossPoints
          },
          goalsFor: { increment: homeScore },
          goalsAgainst: { increment: awayScore },
          goalDifference: { increment: homeScore - awayScore }
        }
      });
    }

    // Update away team membership stats
    const awayMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: existingMatch.leagueId,
        teamId: existingMatch.awayTeamId,
        status: 'active'
      }
    });

    if (awayMembership) {
      await prisma.leagueMembership.update({
        where: { id: awayMembership.id },
        data: {
          matchesPlayed: { increment: 1 },
          wins: outcome === 'away_win' ? { increment: 1 } : awayMembership.wins,
          losses: outcome === 'home_win' ? { increment: 1 } : awayMembership.losses,
          draws: outcome === 'draw' ? { increment: 1 } : awayMembership.draws,
          points: {
            increment: outcome === 'away_win' ? winPoints : outcome === 'draw' ? drawPoints : lossPoints
          },
          goalsFor: { increment: awayScore },
          goalsAgainst: { increment: homeScore },
          goalDifference: { increment: awayScore - homeScore }
        }
      });
    }

    // TODO: Send notifications to participating teams

    // Return updated match with full details
    const updatedMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
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
    });

    res.json(updatedMatch);
  } catch (error) {
    console.error('Error recording match result:', error);
    res.status(500).json({ error: 'Failed to record match result' });
  }
});
