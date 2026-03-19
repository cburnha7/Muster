/**
 * Player Rating Service
 *
 * Calculates bracket and overall ratings per sport, updates percentiles nightly.
 *
 * Bracket Rating: From age-restricted events matching the player's birth-year bracket.
 * Overall Rating: From all open (non-age-restricted) qualifying events in that sport.
 *
 * Age brackets: 18-24, 25-34, 35-44, 45-54, 55+
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Qualifying event types for rating
const QUALIFYING_EVENT_TYPES = ['game', 'pickup', 'tournament'];

// Age bracket boundaries
const AGE_BRACKETS = [
  { label: '18-24', min: 18, max: 24 },
  { label: '25-34', min: 25, max: 34 },
  { label: '35-44', min: 35, max: 44 },
  { label: '45-54', min: 45, max: 54 },
  { label: '55+', min: 55, max: 999 },
];

export function getAgeBracket(dateOfBirth: Date): string {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  for (const bracket of AGE_BRACKETS) {
    if (age >= bracket.min && age <= bracket.max) return bracket.label;
  }
  return '55+';
}

/**
 * Calculate the average game score for a set of participations.
 * Falls back to 1.0 if no participations.
 */
function calculateRating(participations: { gameScore: number }[]): number {
  if (participations.length === 0) return 1.0;
  const sum = participations.reduce((acc, p) => acc + p.gameScore, 0);
  return sum / participations.length;
}

/**
 * Calculate percentile rank (0-100) for a value within a sorted array of values.
 * Higher percentile = better. Returns the percentage of values that are <= this value.
 */
function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length <= 1) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const belowCount = sorted.filter(v => v < value).length;
  const equalCount = sorted.filter(v => v === value).length;
  return ((belowCount + equalCount * 0.5) / sorted.length) * 100;
}

/**
 * Update age brackets for all users based on their dateOfBirth.
 */
export async function updateAllAgeBrackets(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { id: true, dateOfBirth: true, ageBracket: true },
  });

  let updated = 0;
  for (const user of users) {
    const bracket = getAgeBracket(user.dateOfBirth);
    if (bracket !== user.ageBracket) {
      await prisma.user.update({
        where: { id: user.id },
        data: { ageBracket: bracket },
      });
      updated++;
    }
  }
  return updated;
}

/**
 * Recalculate bracket and overall ratings for all players, then update percentiles.
 * Called nightly after debrief windows close.
 */
export async function recalculateAllRatings(): Promise<{
  usersProcessed: number;
  ratingsUpdated: number;
  percentilesUpdated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let usersProcessed = 0;
  let ratingsUpdated = 0;

  // Step 1: Update all age brackets
  await updateAllAgeBrackets();

  // Step 2: Find all users who have game participations
  const usersWithGames = await prisma.user.findMany({
    where: {
      gameParticipations: { some: {} },
    },
    select: {
      id: true,
      dateOfBirth: true,
      ageBracket: true,
    },
  });

  for (const user of usersWithGames) {
    try {
      const bracket = user.ageBracket || getAgeBracket(user.dateOfBirth);

      // Get all qualifying participations for this user
      const participations = await prisma.gameParticipation.findMany({
        where: {
          userId: user.id,
          eventType: { in: QUALIFYING_EVENT_TYPES },
        },
        include: {
          event: {
            select: {
              sportType: true,
              ageRestricted: true,
              eligibilityMinAge: true,
              eligibilityMaxAge: true,
              currentParticipants: true,
              maxParticipants: true,
            },
          },
        },
      });

      // Group by sport
      const bySport = new Map<string, {
        bracketParticipations: { gameScore: number }[];
        overallParticipations: { gameScore: number }[];
      }>();

      for (const p of participations) {
        if (!p.event) continue;
        const sport = p.event.sportType;
        if (!bySport.has(sport)) {
          bySport.set(sport, { bracketParticipations: [], overallParticipations: [] });
        }
        const entry = bySport.get(sport)!;

        // Must have reached minimum player count (at least 2)
        if (p.participantCount < 2) continue;

        if (p.event.ageRestricted) {
          // Bracket event — only counts if player's bracket matches the event's age range
          entry.bracketParticipations.push({ gameScore: p.gameScore });
        } else {
          // Open event — counts toward overall
          entry.overallParticipations.push({ gameScore: p.gameScore });
        }
      }

      // Upsert ratings per sport
      for (const [sport, data] of bySport) {
        const bracketRating = calculateRating(data.bracketParticipations);
        const overallRating = calculateRating(data.overallParticipations);
        const totalGames = data.bracketParticipations.length + data.overallParticipations.length;

        await prisma.playerSportRating.upsert({
          where: { userId_sportType: { userId: user.id, sportType: sport } },
          create: {
            userId: user.id,
            sportType: sport,
            bracketRating,
            overallRating,
            bracketEventCount: data.bracketParticipations.length,
            overallEventCount: data.overallParticipations.length,
            ageBracket: bracket,
            rating: overallRating,
            gamesPlayed: totalGames,
            lastUpdated: new Date(),
          },
          update: {
            bracketRating,
            overallRating,
            bracketEventCount: data.bracketParticipations.length,
            overallEventCount: data.overallParticipations.length,
            ageBracket: bracket,
            rating: overallRating,
            gamesPlayed: totalGames,
            lastUpdated: new Date(),
          },
        });
        ratingsUpdated++;
      }
      usersProcessed++;
    } catch (err) {
      errors.push(`User ${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 3: Recalculate percentiles
  const percentilesUpdated = await recalculatePercentiles();

  return { usersProcessed, ratingsUpdated, percentilesUpdated, errors };
}

/**
 * Recalculate bracket and overall percentiles for all PlayerSportRating records.
 */
async function recalculatePercentiles(): Promise<number> {
  let updated = 0;

  // Get all distinct sports
  const sports = await prisma.playerSportRating.findMany({
    distinct: ['sportType'],
    select: { sportType: true },
  });

  for (const { sportType } of sports) {
    // Overall percentile: all players with overallEventCount > 0 in this sport
    const overallRatings = await prisma.playerSportRating.findMany({
      where: { sportType, overallEventCount: { gt: 0 } },
      select: { id: true, overallRating: true },
    });

    const overallValues = overallRatings.map(r => r.overallRating);
    for (const record of overallRatings) {
      const percentile = calculatePercentile(record.overallRating, overallValues);
      await prisma.playerSportRating.update({
        where: { id: record.id },
        data: {
          overallPercentile: Math.round(percentile * 10) / 10,
          // Keep legacy percentile in sync with overall
          percentile: Math.round(percentile * 10) / 10,
        },
      });
      updated++;
    }

    // Bracket percentile: grouped by ageBracket within this sport
    const brackets = await prisma.playerSportRating.findMany({
      where: { sportType, bracketEventCount: { gt: 0 }, ageBracket: { not: null } },
      distinct: ['ageBracket'],
      select: { ageBracket: true },
    });

    for (const { ageBracket } of brackets) {
      if (!ageBracket) continue;

      const bracketRatings = await prisma.playerSportRating.findMany({
        where: { sportType, ageBracket, bracketEventCount: { gt: 0 } },
        select: { id: true, bracketRating: true },
      });

      const bracketValues = bracketRatings.map(r => r.bracketRating);
      for (const record of bracketRatings) {
        const percentile = calculatePercentile(record.bracketRating, bracketValues);
        await prisma.playerSportRating.update({
          where: { id: record.id },
          data: { bracketPercentile: Math.round(percentile * 10) / 10 },
        });
      }
    }
  }

  return updated;
}

/**
 * Get ratings for a specific user (used by the API endpoint).
 */
export async function getUserRatings(userId: string) {
  return prisma.playerSportRating.findMany({
    where: {
      userId,
      OR: [
        { bracketEventCount: { gt: 0 } },
        { overallEventCount: { gt: 0 } },
      ],
    },
    select: {
      sportType: true,
      bracketRating: true,
      overallRating: true,
      bracketPercentile: true,
      overallPercentile: true,
      ageBracket: true,
      bracketEventCount: true,
      overallEventCount: true,
      lastUpdated: true,
      // Legacy
      rating: true,
      percentile: true,
      gamesPlayed: true,
    },
    orderBy: { overallRating: 'desc' },
  });
}
