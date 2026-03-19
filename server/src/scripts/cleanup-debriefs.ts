/**
 * Nightly cleanup script:
 * 1. Marks debrief as submitted for bookings where the event ended > 24 hours ago
 *    and the user never submitted.
 * 2. For league-linked events that had at least one debrief submission,
 *    recalculates player ratings and updates league rankings.
 *
 * Run via cron or scheduler:
 *   npx ts-node src/scripts/cleanup-debriefs.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RecalcLog {
  eventId: string;
  leagueId: string;
  playersRecalculated: number;
  timestamp: Date;
}

async function main() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const runTimestamp = new Date();

  // ---------------------------------------------------------------
  // 1. Find expired debrief bookings BEFORE marking them closed
  //    so we can identify which events need league recalculation.
  // ---------------------------------------------------------------
  const expiredBookings = await prisma.booking.findMany({
    where: {
      debriefSubmitted: false,
      status: 'confirmed',
      event: {
        endTime: { lt: cutoff },
        status: { not: 'cancelled' },
      },
    },
    select: {
      id: true,
      eventId: true,
    },
  });

  // Collect unique event IDs from the expired batch
  const expiredEventIds = [...new Set(
    expiredBookings.map(b => b.eventId).filter(Boolean) as string[]
  )];

  // ---------------------------------------------------------------
  // 2. Mark all expired debriefs as submitted
  // ---------------------------------------------------------------
  const cleanupResult = await prisma.booking.updateMany({
    where: {
      debriefSubmitted: false,
      status: 'confirmed',
      event: {
        endTime: { lt: cutoff },
        status: { not: 'cancelled' },
      },
    },
    data: { debriefSubmitted: true },
  });

  console.log(`Cleaned up ${cleanupResult.count} expired debrief(s)`);

  if (expiredEventIds.length === 0) {
    console.log('No expired events to process for league recalculation.');
    return;
  }

  // ---------------------------------------------------------------
  // 3. For each expired event, check if it's linked to a league
  //    (via Match) and had at least one debrief submission.
  // ---------------------------------------------------------------
  const matches = await prisma.match.findMany({
    where: {
      eventId: { in: expiredEventIds },
      status: 'completed',
    },
    select: {
      eventId: true,
      leagueId: true,
      seasonId: true,
    },
  });

  if (matches.length === 0) {
    console.log('No league-linked events found among expired debriefs.');
    return;
  }

  const logs: RecalcLog[] = [];

  for (const match of matches) {
    const eventId = match.eventId!;
    const leagueId = match.leagueId;

    // Check if at least one participant submitted a debrief for this event
    // (debriefSubmitted is now true for everyone, but salutes only exist
    //  if someone actually went through the debrief flow)
    const saluteCount = await prisma.salute.count({
      where: { eventId },
    });

    if (saluteCount === 0) {
      console.log(
        `[SKIP] Event ${eventId} / League ${leagueId} — no debrief submissions, ratings unchanged.`
      );
      continue;
    }

    // ---------------------------------------------------------------
    // 4. Recalculate ratings for every participant in this event
    // ---------------------------------------------------------------
    const participants = await prisma.booking.findMany({
      where: { eventId, status: 'confirmed' },
      select: { userId: true },
    });

    const playerIds = participants.map(p => p.userId);
    let playersRecalculated = 0;

    for (const playerId of playerIds) {
      // --- a) Update user-level salute rating ---
      const totalSalutes = await prisma.salute.count({
        where: { toUserId: playerId },
      });
      const totalGames = await prisma.booking.count({
        where: {
          userId: playerId,
          status: 'confirmed',
          event: { endTime: { lt: new Date() } },
        },
      });
      const saluteRatio = totalGames > 0 ? totalSalutes / totalGames : 0;
      const newUserRating = Math.min(5.0, 1.0 + saluteRatio * 2);

      await prisma.user.update({
        where: { id: playerId },
        data: {
          currentRating: newUserRating,
          pickupRating: newUserRating,
          ratingLastUpdated: new Date(),
        },
      });

      // --- b) Update GameParticipation for this event ---
      // Incorporate salutes received in this event into the game score
      const eventSalutesReceived = await prisma.salute.count({
        where: { eventId, toUserId: playerId },
      });

      const participation = await prisma.gameParticipation.findUnique({
        where: { userId_eventId: { userId: playerId, eventId } },
      });

      if (participation) {
        // Recalculate gameScore: factor in salutes as votes
        const updatedVotes = participation.votesReceived + eventSalutesReceived;
        const gameRating = participation.gameRating || 1.0;
        const participantCount = participation.participantCount || 1;
        const voteShare = participantCount > 1
          ? updatedVotes / (participantCount - 1)
          : 0;
        const updatedGameScore = voteShare * gameRating;

        await prisma.gameParticipation.update({
          where: { id: participation.id },
          data: {
            votesReceived: updatedVotes,
            gameScore: updatedGameScore,
          },
        });
      }

      // --- c) Update league-level rating on user ---
      // Aggregate across all league games for this player
      const leagueMatches = await prisma.match.findMany({
        where: { leagueId, status: 'completed' },
        select: { eventId: true },
      });
      const leagueEventIds = leagueMatches
        .filter(m => m.eventId)
        .map(m => m.eventId as string);

      if (leagueEventIds.length > 0) {
        const leagueParticipations = await prisma.gameParticipation.findMany({
          where: { userId: playerId, eventId: { in: leagueEventIds } },
        });

        if (leagueParticipations.length > 0) {
          const totalGameScore = leagueParticipations.reduce((s, p) => s + p.gameScore, 0);
          const totalVotes = leagueParticipations.reduce((s, p) => s + p.votesReceived, 0);
          const matchCount = leagueParticipations.length;
          const avgRating = totalGameScore / matchCount;
          const performanceScore = avgRating * 0.6 + (totalVotes / matchCount) * 0.4;

          // Cap league rating at 5.0, floor at 1.0
          const leagueRating = Math.min(5.0, Math.max(1.0, performanceScore));
          await prisma.user.update({
            where: { id: playerId },
            data: { leagueRating },
          });
        }
      }

      playersRecalculated++;
    }

    // ---------------------------------------------------------------
    // 5. Update league membership (roster-level) standings
    // ---------------------------------------------------------------
    // Find which rosters had players in this event
    const rosterIds = new Set<string>();
    for (const playerId of playerIds) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: playerId, status: 'active' },
        select: { teamId: true },
      });
      if (teamMember) {
        rosterIds.add(teamMember.teamId);
      }
    }

    // Recalculate each roster's league membership stats from completed matches
    for (const rosterId of rosterIds) {
      const membership = await prisma.leagueMembership.findFirst({
        where: {
          leagueId,
          teamId: rosterId,
          status: 'active',
          ...(match.seasonId ? { seasonId: match.seasonId } : {}),
        },
      });

      if (!membership) continue;

      // Recount from completed matches
      const rosterMatches = await prisma.match.findMany({
        where: {
          leagueId,
          status: 'completed',
          OR: [
            { homeTeamId: rosterId },
            { awayTeamId: rosterId },
          ],
          ...(match.seasonId ? { seasonId: match.seasonId } : {}),
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          outcome: true,
        },
      });

      let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0;
      for (const m of rosterMatches) {
        const isHome = m.homeTeamId === rosterId;
        goalsFor += (isHome ? m.homeScore : m.awayScore) || 0;
        goalsAgainst += (isHome ? m.awayScore : m.homeScore) || 0;

        if (m.outcome === 'draw') {
          draws++;
        } else if (
          (isHome && m.outcome === 'home_win') ||
          (!isHome && m.outcome === 'away_win')
        ) {
          wins++;
        } else {
          losses++;
        }
      }

      // Use the league's points config
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { pointsConfig: true },
      });
      const pointsCfg = (league?.pointsConfig as any) || { win: 3, draw: 1, loss: 0 };
      const points = wins * pointsCfg.win + draws * pointsCfg.draw + losses * pointsCfg.loss;

      await prisma.leagueMembership.update({
        where: { id: membership.id },
        data: {
          matchesPlayed: rosterMatches.length,
          wins,
          losses,
          draws,
          points,
          goalsFor,
          goalsAgainst,
          goalDifference: goalsFor - goalsAgainst,
        },
      });
    }

    logs.push({
      eventId,
      leagueId,
      playersRecalculated,
      timestamp: runTimestamp,
    });

    console.log(
      `[RECALC] Event ${eventId} / League ${leagueId} — ${playersRecalculated} player(s) recalculated at ${runTimestamp.toISOString()}`
    );
  }

  // ---------------------------------------------------------------
  // 6. Recalculate per-sport ratings and percentiles
  // ---------------------------------------------------------------
  console.log('Recalculating per-sport ratings and percentiles...');

  // Build per-sport ratings from GameParticipation + Event.sportType
  const allParticipations = await prisma.gameParticipation.findMany({
    where: { gameScore: { gt: 0 } },
    select: {
      userId: true,
      gameScore: true,
      event: { select: { sportType: true } },
    },
  });

  // Group by userId + sportType
  const sportMap = new Map<string, { total: number; count: number }>();
  for (const p of allParticipations) {
    const key = `${p.userId}::${p.event.sportType}`;
    const entry = sportMap.get(key) || { total: 0, count: 0 };
    entry.total += p.gameScore;
    entry.count += 1;
    sportMap.set(key, entry);
  }

  // Upsert per-sport ratings
  for (const [key, { total, count }] of sportMap) {
    const [userId, sportType] = key.split('::');
    const rating = count > 0 ? total / count : 1.0;

    await prisma.playerSportRating.upsert({
      where: { userId_sportType: { userId, sportType } },
      create: { userId, sportType, rating, gamesPlayed: count, lastUpdated: new Date() },
      update: { rating, gamesPlayed: count, lastUpdated: new Date() },
    });
  }

  // Recalculate percentiles per sport
  const allSportRatings = await prisma.playerSportRating.findMany({
    where: { gamesPlayed: { gt: 0 } },
    select: { id: true, sportType: true, rating: true },
  });

  // Group by sport
  const bySport = new Map<string, Array<{ id: string; rating: number }>>();
  for (const r of allSportRatings) {
    const list = bySport.get(r.sportType) || [];
    list.push({ id: r.id, rating: r.rating });
    bySport.set(r.sportType, list);
  }

  let percentileUpdates = 0;
  for (const [sport, entries] of bySport) {
    // Sort ascending by rating
    entries.sort((a, b) => a.rating - b.rating);
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      // Percentile = % of players this user is better than
      const percentile = ((i + 1) / total) * 100;
      await prisma.playerSportRating.update({
        where: { id: entries[i].id },
        data: { percentile },
      });
      percentileUpdates++;
    }
  }

  console.log(`Updated ${sportMap.size} sport rating(s), ${percentileUpdates} percentile(s) across ${bySport.size} sport(s).`);

  // ---------------------------------------------------------------
  // 7. Summary
  // ---------------------------------------------------------------
  console.log('\n=== Recalculation Summary ===');
  console.log(`Total events processed: ${logs.length}`);
  for (const log of logs) {
    console.log(
      `  Event: ${log.eventId} | League: ${log.leagueId} | Players: ${log.playersRecalculated} | Time: ${log.timestamp.toISOString()}`
    );
  }
  console.log('=============================\n');
}

main()
  .catch((err) => {
    console.error('Debrief cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
