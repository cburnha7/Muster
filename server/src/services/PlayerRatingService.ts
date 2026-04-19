/**
 * PlayerRatingService
 *
 * Implements the three-tier rating system:
 *   1. Open Rating    — all qualified games, percentile vs all platform players
 *   2. Age Group Rating — same formula, percentile vs same age bracket
 *   3. League Rating  — per-league context, archived when league ends
 *
 * All ratings are sport-specific and independent.
 * Starting rating: 50. Rolling average of last 10 game scores.
 */

import { PrismaClient } from '@prisma/client';
import {
  RATING_CONFIG,
  getMinimumPlayers,
  getAgeBracketLabel,
  getPlayerBrackets,
} from '../config/rating-config';

const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParticipantSnapshot {
  userId: string;
  preGameRating: number;
  saluteCount: number;
}

interface GameScoreResult {
  userId: string;
  preGameRating: number;
  preGameRank: number;
  postGameRank: number;
  gameScore: number;
}

export interface LeagueRatingRecord {
  leagueId: string;
  leagueName: string;
  sportType: string;
  rating: number;
  percentile: number | null;
  gamesPlayed: number;
  archivedAt: string | null; // ISO string when league ended; null = active
}

// ── Qualification check ───────────────────────────────────────────────────────

/**
 * Returns true if the event meets minimum player count requirements.
 * Practice events always return false.
 */
export async function isEventQualified(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventType: true,
      sportType: true,
      currentParticipants: true,
      eligibilityMinAge: true,
      eligibilityMaxAge: true,
      bookings: {
        where: { status: 'confirmed' },
        select: {
          userId: true,
          user: { select: { dateOfBirth: true } },
        },
      },
    },
  });

  if (!event) return false;
  if (event.eventType === 'practice') return false;

  const confirmedCount = event.bookings.length;
  const sport = event.sportType.toLowerCase();

  // For soccer, derive average age to pick the right format
  let averageAge: number | undefined;
  if (sport === 'soccer' && event.bookings.length > 0) {
    const now = new Date();
    const ages = event.bookings.map(b => {
      const dob = b.user?.dateOfBirth;
      if (!dob) return 25;
      return now.getFullYear() - new Date(dob).getFullYear();
    });
    averageAge = ages.reduce((a, b) => a + b, 0) / ages.length;
  }

  const minimum = getMinimumPlayers(sport, averageAge);
  return confirmedCount >= minimum;
}

// ── Pre-game snapshot ─────────────────────────────────────────────────────────

/**
 * Takes a snapshot of all participants' current ratings before the game starts.
 * Called when a game event begins (or at debrief time if not already snapshotted).
 * Returns the ranked list (highest rating first).
 */
export async function takePreGameSnapshot(
  eventId: string,
  sportType: string
): Promise<ParticipantSnapshot[]> {
  const bookings = await prisma.booking.findMany({
    where: { eventId, status: 'confirmed' },
    select: { userId: true },
  });

  const snapshots: ParticipantSnapshot[] = [];

  for (const b of bookings) {
    const sportRating = await prisma.playerSportRating.findUnique({
      where: { userId_sportType: { userId: b.userId, sportType } },
      select: { openRating: true },
    });
    snapshots.push({
      userId: b.userId,
      preGameRating: sportRating?.openRating ?? RATING_CONFIG.DEFAULT_RATING,
      saluteCount: 0,
    });
  }

  // Sort highest rating first
  snapshots.sort((a, b) => b.preGameRating - a.preGameRating);
  return snapshots;
}

// ── Opponent weight (diminishing returns) ─────────────────────────────────────

/**
 * Returns the diminishing-returns weight for a pair of players.
 * Increments the game count for this pair.
 */
async function getOpponentWeight(
  playerA: string,
  playerB: string
): Promise<number> {
  // Canonical key: lower UUID first
  const [a, b] = [playerA, playerB].sort();

  const record = await prisma.playerOpponentHistory.upsert({
    where: { playerAId_playerBId: { playerAId: a, playerBId: b } },
    create: { playerAId: a, playerBId: b, gamesPlayed: 1 },
    update: { gamesPlayed: { increment: 1 } },
  });

  // Weight based on games played BEFORE this increment
  const prevGames = record.gamesPlayed - 1;
  const weights = RATING_CONFIG.OPPONENT_WEIGHTS;
  const idx = Math.min(prevGames, weights.length - 1);
  return weights[idx];
}

// ── Game score calculation ────────────────────────────────────────────────────

/**
 * Calculates game scores for all participants after salutes are submitted.
 *
 * @param snapshots  Pre-game snapshots (userId, preGameRating, saluteCount)
 * @param leagueId   If set, uses league-average competitiveness factor
 */
export async function calculateGameScores(
  snapshots: ParticipantSnapshot[],
  leagueId?: string
): Promise<GameScoreResult[]> {
  if (snapshots.length === 0) return [];

  // ── Competitiveness factor ──────────────────────────────────────────────
  let avgRating: number;
  if (leagueId) {
    // League context: average rating of all players in this league
    const leagueRatings = await prisma.playerSportRating.findMany({
      where: {
        user: {
          gameParticipations: {
            some: { leagueId },
          },
        },
      },
      select: { openRating: true },
    });
    avgRating =
      leagueRatings.length > 0
        ? leagueRatings.reduce((s, r) => s + r.openRating, 0) /
          leagueRatings.length
        : snapshots.reduce((s, p) => s + p.preGameRating, 0) / snapshots.length;
  } else {
    avgRating =
      snapshots.reduce((s, p) => s + p.preGameRating, 0) / snapshots.length;
  }
  const competitivenessFactor = avgRating / RATING_CONFIG.PLATFORM_MAX;

  // ── Post-game rank (by salutes received, highest first) ─────────────────
  const sorted = [...snapshots].sort((a, b) => b.saluteCount - a.saluteCount);
  const postGameRankMap = new Map<string, number>();
  sorted.forEach((p, i) => postGameRankMap.set(p.userId, i + 1));

  // ── Pre-game rank (already sorted by preGameRating desc) ────────────────
  const preGameRankMap = new Map<string, number>();
  snapshots.forEach((p, i) => preGameRankMap.set(p.userId, i + 1));

  const results: GameScoreResult[] = [];

  for (const player of snapshots) {
    const preRank = preGameRankMap.get(player.userId)!;
    const postRank = postGameRankMap.get(player.userId)!;

    // Position change adjustment
    const positionChange = preRank - postRank; // positive = moved up
    const positionAdj = positionChange * RATING_CONFIG.POSITION_CHANGE_POINTS;

    // Outperformance bonus: for each higher-rated opponent beaten on salutes
    let outperformanceBonus = 0;
    for (const opponent of snapshots) {
      if (opponent.userId === player.userId) continue;
      if (opponent.preGameRating <= player.preGameRating) continue; // only higher-rated opponents

      const ratingGap = opponent.preGameRating - player.preGameRating;
      const saluteRatio =
        opponent.saluteCount > 0
          ? Math.max(1, player.saluteCount / opponent.saluteCount)
          : player.saluteCount > 0
            ? 1
            : 0;

      if (saluteRatio <= 0) continue;

      const opponentWeight = await getOpponentWeight(
        player.userId,
        opponent.userId
      );
      const bonus =
        ratingGap *
        RATING_CONFIG.OUTPERFORMANCE_MULTIPLIER *
        saluteRatio *
        opponentWeight;
      outperformanceBonus += bonus;
    }

    // Final game score
    const rawScore =
      player.preGameRating +
      positionAdj +
      outperformanceBonus * competitivenessFactor;

    const gameScore = Math.max(
      RATING_CONFIG.SCORE_MIN,
      Math.min(RATING_CONFIG.SCORE_MAX, rawScore)
    );

    results.push({
      userId: player.userId,
      preGameRating: player.preGameRating,
      preGameRank: preRank,
      postGameRank: postRank,
      gameScore,
    });
  }

  return results;
}

// ── Rolling average ───────────────────────────────────────────────────────────

function rollingAverage(
  history: number[],
  newScore: number
): { avg: number; history: number[] } {
  const updated = [...history, newScore];
  if (updated.length > RATING_CONFIG.ROLLING_WINDOW) {
    updated.splice(0, updated.length - RATING_CONFIG.ROLLING_WINDOW);
  }
  const avg = updated.reduce((s, v) => s + v, 0) / updated.length;
  return { avg, history: updated };
}

// ── Percentile calculation ────────────────────────────────────────────────────

function percentileOf(value: number, allValues: number[]): number {
  if (allValues.length <= 1) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  const equal = sorted.filter(v => v === value).length;
  return Math.round(((below + equal * 0.5) / sorted.length) * 100);
}

// ── Main: process a completed game ───────────────────────────────────────────

/**
 * Called after all debriefs for an event are submitted (or after the window closes).
 * Processes the game, updates ratings for all participants.
 */
export async function processCompletedGame(eventId: string): Promise<void> {
  const qualified = await isEventQualified(eventId);
  if (!qualified) return;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      sportType: true,
      eventType: true,
      ageRestricted: true,
      bookings: {
        where: { status: 'confirmed' },
        select: { userId: true },
      },
    },
  });
  if (!event) return;

  const sportType = event.sportType;
  const leagueId = (event as any).leagueId as string | undefined;

  // Build snapshots with salute counts
  const snapshots = await takePreGameSnapshot(eventId, sportType);

  // Populate salute counts from DB
  const salutes = await prisma.salute.findMany({
    where: { eventId },
    select: { toUserId: true },
  });
  const saluteMap = new Map<string, number>();
  for (const s of salutes) {
    saluteMap.set(s.toUserId, (saluteMap.get(s.toUserId) ?? 0) + 1);
  }
  for (const snap of snapshots) {
    snap.saluteCount = saluteMap.get(snap.userId) ?? 0;
  }

  const scores = await calculateGameScores(snapshots, leagueId);

  // Persist GameParticipation records and update PlayerSportRating
  for (const result of scores) {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { dateOfBirth: true },
    });
    if (!user) continue;

    const brackets = getPlayerBrackets(user.dateOfBirth);
    const ageBracket = getAgeBracketLabel(user.dateOfBirth);

    // Upsert GameParticipation
    await prisma.gameParticipation.upsert({
      where: { userId_eventId: { userId: result.userId, eventId } },
      create: {
        userId: result.userId,
        eventId,
        gameScore: result.gameScore,
        votesReceived: saluteMap.get(result.userId) ?? 0,
        saluteCount: saluteMap.get(result.userId) ?? 0,
        participantCount: snapshots.length,
        playedAt: new Date(),
        eventType: event.eventType,
        leagueId: leagueId ?? null,
        sportType,
        preGameRating: result.preGameRating,
        preGameRank: result.preGameRank,
        postGameRank: result.postGameRank,
        gameRating:
          snapshots.reduce((s, p) => s + p.preGameRating, 0) / snapshots.length,
      },
      update: {
        gameScore: result.gameScore,
        votesReceived: saluteMap.get(result.userId) ?? 0,
        saluteCount: saluteMap.get(result.userId) ?? 0,
        preGameRating: result.preGameRating,
        preGameRank: result.preGameRank,
        postGameRank: result.postGameRank,
      },
    });

    // Get or create PlayerSportRating
    const existing = await prisma.playerSportRating.upsert({
      where: { userId_sportType: { userId: result.userId, sportType } },
      create: {
        userId: result.userId,
        sportType,
        openRating: RATING_CONFIG.DEFAULT_RATING,
        ageGroupRating: RATING_CONFIG.DEFAULT_RATING,
        ageBracket,
        openScoreHistory: JSON.stringify([]),
        ageGroupScoreHistory: JSON.stringify([]),
        leagueRatingHistory: JSON.stringify([]),
      },
      update: {},
    });

    // Update open rating
    const openHistory: number[] = JSON.parse(
      (existing.openScoreHistory as string) || '[]'
    );
    const { avg: newOpenRating, history: newOpenHistory } = rollingAverage(
      openHistory,
      result.gameScore
    );

    // Update age group rating
    const ageHistory: number[] = JSON.parse(
      (existing.ageGroupScoreHistory as string) || '[]'
    );
    const { avg: newAgeRating, history: newAgeHistory } = rollingAverage(
      ageHistory,
      result.gameScore
    );

    // Update league rating if applicable
    let leagueHistory: LeagueRatingRecord[] = JSON.parse(
      (existing.leagueRatingHistory as string) || '[]'
    );
    if (leagueId) {
      const leagueRecord = leagueHistory.find(r => r.leagueId === leagueId);
      if (leagueRecord) {
        leagueRecord.gamesPlayed += 1;
        // League rating is a simple rolling average within the league context
        leagueRecord.rating =
          (leagueRecord.rating * (leagueRecord.gamesPlayed - 1) +
            result.gameScore) /
          leagueRecord.gamesPlayed;
      } else {
        const league = await prisma.league.findUnique({
          where: { id: leagueId },
          select: { name: true, sportType: true },
        });
        leagueHistory.push({
          leagueId,
          leagueName: league?.name ?? 'League',
          sportType: league?.sportType ?? sportType,
          rating: result.gameScore,
          percentile: null,
          gamesPlayed: 1,
          archivedAt: null,
        });
      }
    }

    await prisma.playerSportRating.update({
      where: { userId_sportType: { userId: result.userId, sportType } },
      data: {
        openRating: newOpenRating,
        openGamesPlayed: { increment: 1 },
        openScoreHistory: JSON.stringify(newOpenHistory),
        ageGroupRating: newAgeRating,
        ageGroupGamesPlayed: { increment: 1 },
        ageGroupScoreHistory: JSON.stringify(newAgeHistory),
        ageBracket,
        leagueRatingHistory: JSON.stringify(leagueHistory),
        // Keep legacy fields in sync
        overallRating: newOpenRating,
        bracketRating: newAgeRating,
        rating: newOpenRating,
        gamesPlayed: { increment: 1 },
        lastUpdated: new Date(),
      },
    });
  }

  // Recalculate percentiles for this sport
  await recalculatePercentilesForSport(sportType);
  if (leagueId) {
    await recalculateLeaguePercentiles(leagueId, sportType);
  }
}

// ── Percentile recalculation ──────────────────────────────────────────────────

export async function recalculatePercentilesForSport(
  sportType: string
): Promise<void> {
  const allRatings = await prisma.playerSportRating.findMany({
    where: { sportType },
    select: {
      id: true,
      userId: true,
      openRating: true,
      ageGroupRating: true,
      ageBracket: true,
    },
  });

  const openValues = allRatings.map(r => r.openRating);

  // Group by age bracket for age group percentiles
  const bracketGroups = new Map<string, number[]>();
  for (const r of allRatings) {
    const bracket = r.ageBracket ?? 'Adult';
    if (!bracketGroups.has(bracket)) bracketGroups.set(bracket, []);
    bracketGroups.get(bracket)!.push(r.ageGroupRating);
    // Senior players also appear in Adult
    if (bracket === 'Senior') {
      if (!bracketGroups.has('Adult')) bracketGroups.set('Adult', []);
      bracketGroups.get('Adult')!.push(r.ageGroupRating);
    }
  }

  for (const r of allRatings) {
    const openPct = percentileOf(r.openRating, openValues);
    const bracket = r.ageBracket ?? 'Adult';
    const bracketValues = bracketGroups.get(bracket) ?? openValues;
    const agePct = percentileOf(r.ageGroupRating, bracketValues);

    await prisma.playerSportRating.update({
      where: { id: r.id },
      data: {
        openPercentile: openPct,
        ageGroupPercentile: agePct,
        // Legacy sync
        overallPercentile: openPct,
        bracketPercentile: agePct,
        percentile: openPct,
      },
    });
  }
}

export async function recalculateLeaguePercentiles(
  leagueId: string,
  sportType: string
): Promise<void> {
  // Find all players who have participated in this league
  const participations = await prisma.gameParticipation.findMany({
    where: { leagueId, sportType },
    select: { userId: true },
    distinct: ['userId'],
  });

  const userIds = participations.map(p => p.userId);
  if (userIds.length === 0) return;

  const ratings = await prisma.playerSportRating.findMany({
    where: { userId: { in: userIds }, sportType },
    select: { id: true, userId: true, leagueRatingHistory: true },
  });

  // Extract league ratings for this league
  const leagueRatingValues: { id: string; rating: number }[] = [];
  for (const r of ratings) {
    const history: LeagueRatingRecord[] = JSON.parse(
      (r.leagueRatingHistory as string) || '[]'
    );
    const record = history.find(h => h.leagueId === leagueId);
    if (record) leagueRatingValues.push({ id: r.id, rating: record.rating });
  }

  const allValues = leagueRatingValues.map(v => v.rating);

  for (const entry of leagueRatingValues) {
    const pct = percentileOf(entry.rating, allValues);
    const r = ratings.find(x => x.id === entry.id)!;
    const history: LeagueRatingRecord[] = JSON.parse(
      (r.leagueRatingHistory as string) || '[]'
    );
    const record = history.find(h => h.leagueId === leagueId);
    if (record) record.percentile = pct;

    await prisma.playerSportRating.update({
      where: { id: r.id },
      data: { leagueRatingHistory: JSON.stringify(history) },
    });
  }
}

// ── League archival ───────────────────────────────────────────────────────────

/**
 * Archives the league rating record for all players when a league ends.
 * Sets archivedAt timestamp so it appears in Past Seasons history.
 */
export async function archiveLeagueRatings(leagueId: string): Promise<void> {
  await recalculateLeaguePercentiles(
    leagueId,
    (
      await prisma.league.findUnique({
        where: { id: leagueId },
        select: { sportType: true },
      })
    )?.sportType ?? ''
  );

  const ratings = await prisma.playerSportRating.findMany({
    where: {
      leagueRatingHistory: { path: [], array_contains: leagueId },
    },
    select: { id: true, leagueRatingHistory: true },
  });

  const archivedAt = new Date().toISOString();

  for (const r of ratings) {
    const history: LeagueRatingRecord[] = JSON.parse(
      (r.leagueRatingHistory as string) || '[]'
    );
    const record = history.find(h => h.leagueId === leagueId);
    if (record && !record.archivedAt) {
      record.archivedAt = archivedAt;
      await prisma.playerSportRating.update({
        where: { id: r.id },
        data: { leagueRatingHistory: JSON.stringify(history) },
      });
    }
  }
}

// ── Rating decay ──────────────────────────────────────────────────────────────

/**
 * Applies decay to players who haven't played a qualified game in 60+ days.
 * Run nightly. Decay: -0.5 per month, floor at 30.
 */
export async function applyRatingDecay(): Promise<number> {
  const now = new Date();
  const decayThreshold = new Date(
    now.getTime() - RATING_CONFIG.DECAY_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  );

  // Find all sport ratings where last game was > 60 days ago
  const staleRatings = await prisma.playerSportRating.findMany({
    where: {
      lastUpdated: { lt: decayThreshold },
      openRating: { gt: RATING_CONFIG.DECAY_FLOOR },
    },
    select: {
      id: true,
      openRating: true,
      ageGroupRating: true,
      lastUpdated: true,
      openLastDecayAt: true,
    },
  });

  let decayed = 0;

  for (const r of staleRatings) {
    // Calculate months since last decay (or last game if never decayed)
    const lastDecay = r.openLastDecayAt ?? r.lastUpdated;
    const monthsElapsed =
      (now.getTime() - lastDecay.getTime()) / (30 * 24 * 60 * 60 * 1000);

    if (monthsElapsed < 1) continue;

    const decayAmount =
      Math.floor(monthsElapsed) * RATING_CONFIG.DECAY_RATE_PER_MONTH;

    const newOpen = Math.max(
      RATING_CONFIG.DECAY_FLOOR,
      r.openRating - decayAmount
    );
    const newAge = Math.max(
      RATING_CONFIG.DECAY_FLOOR,
      r.ageGroupRating - decayAmount
    );

    await prisma.playerSportRating.update({
      where: { id: r.id },
      data: {
        openRating: newOpen,
        ageGroupRating: newAge,
        openLastDecayAt: now,
        // Legacy sync
        overallRating: newOpen,
        bracketRating: newAge,
        rating: newOpen,
      },
    });
    decayed++;
  }

  return decayed;
}

// ── Nightly job ───────────────────────────────────────────────────────────────

/**
 * Full nightly recalculation: decay + percentile refresh for all sports.
 */
export async function runNightlyRatingJob(): Promise<{
  decayed: number;
  sportsRecalculated: string[];
}> {
  const decayed = await applyRatingDecay();

  const sports = await prisma.playerSportRating.findMany({
    select: { sportType: true },
    distinct: ['sportType'],
  });

  const sportsRecalculated: string[] = [];
  for (const { sportType } of sports) {
    await recalculatePercentilesForSport(sportType);
    sportsRecalculated.push(sportType);
  }

  return { decayed, sportsRecalculated };
}
