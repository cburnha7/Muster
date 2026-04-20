import { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';
import {
  generateSchedule as fairGenerateSchedule,
  SchedulerInput,
  RosterInfo as FairRosterInfo,
} from './FairScheduler';

const prisma = new PrismaClient();

interface RosterInfo {
  id: string;
  name: string;
}

interface ShellEvent {
  homeRoster: RosterInfo;
  awayRoster: RosterInfo;
  scheduledAt: Date;
  round: number;
}

export interface LeagueWithRosters {
  id: string;
  leagueFormat: string;
  gameFrequency?: string | null;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string | null;
  preferredTimeWindowEnd?: string | null;
  seasonGameCount?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  playoffTeamCount?: number | null;
  eliminationFormat?: string | null;
  rosters: Array<{ id: string; name: string }>;
}

interface DistributeConfig {
  preferredGameDays: number[];
  timeWindowStart: string;
  timeWindowEnd: string;
  startDate: Date;
  endDate: Date | null;
  gameFrequency: string;
}

export interface SchedulePreviewEvent {
  homeRoster: RosterInfo;
  awayRoster: RosterInfo;
  scheduledAt: string;
  round: number;
  flag?: 'playoffs' | 'tournament';
}

export interface SchedulePreview {
  events: SchedulePreviewEvent[];
  totalGames: number;
  format: 'season' | 'season_with_playoffs' | 'tournament';
}

export interface PlayoffEvent extends SchedulePreviewEvent {
  flag: 'playoffs';
  playoffRound: number; // 1 = quarterfinal, 2 = semifinal, etc.
}

export interface TournamentEvent extends SchedulePreviewEvent {
  flag: 'tournament';
  bracketRound: number;
  bracketPosition: number;
  placeholderLabel?: string; // "Winner of Game N"
}

export class ScheduleGeneratorService {
  /**
   * Generate shell matches for a league.
   * Creates Match records with null team slots, null dates, and suggestedDays.
   * Teams are assigned as rosters confirm membership.
   * Dates/times/locations are set by commissioner or home team admin later.
   */
  static async generateShellMatches(
    leagueId: string
  ): Promise<{ matchesCreated: number }> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        sportType: true,
        skillLevel: true,
        organizerId: true,
        seasonId: true,
        seasonGameCount: true,
        preferredGameDays: true,
        gameFrequency: true,
        scheduleGenerated: true,
        leagueFormat: true,
      },
    });

    if (!league) throw new Error('League not found');
    if (league.scheduleGenerated)
      throw new Error('Schedule already generated for this league');

    if (!league.seasonGameCount || league.seasonGameCount <= 0) {
      throw new Error('seasonGameCount must be greater than 0');
    }

    // Map numeric day-of-week to day abbreviations for suggestedDays
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const suggestedDays = (league.preferredGameDays || []).map(
      d => DAY_NAMES[d] || `Day${d}`
    );

    const totalMatches = league.seasonGameCount;

    // Distribute matches across rounds
    // For now, simple distribution: each round has 1 match
    // (rosters will be assigned as they join)
    const result = await prisma.$transaction(async tx => {
      const matchIds: string[] = [];

      for (let i = 0; i < totalMatches; i++) {
        const roundNumber = i + 1;

        const match = await tx.match.create({
          data: {
            leagueId,
            seasonId: league.seasonId || undefined,
            homeTeamId: null,
            awayTeamId: null,
            scheduledAt: null,
            status: 'pending',
            suggestedDays,
            placeholderHome: `Team ${((i * 2) % 8) + 1}`,
            placeholderAway: `Team ${((i * 2 + 1) % 8) + 1}`,
            bracketRound: roundNumber,
          },
        });

        matchIds.push(match.id);
      }

      // Mark schedule as generated
      await tx.league.update({
        where: { id: leagueId },
        data: { scheduleGenerated: true },
      });

      return matchIds;
    });

    return { matchesCreated: result.length };
  }

  /**
   * Legacy method — kept for backward compat.
   * Delegates to generateShellMatches.
   */
  static async generateRoundRobin(
    leagueId: string
  ): Promise<{ eventsCreated: number }> {
    const result =
      await ScheduleGeneratorService.generateShellMatches(leagueId);
    return { eventsCreated: result.matchesCreated };
  }

  /**
   * Generate a schedule preview without persisting to the database.
   * Returns a SchedulePreview for Commissioner review.
   * Supports 'season' (round-robin) format. Playoff and tournament formats
   * are handled by separate methods.
   */
  static generateSchedulePreview(league: LeagueWithRosters): SchedulePreview {
    const rosters = league.rosters;

    if (rosters.length < 2) {
      const error: any = new Error(
        'At least 2 registered rosters are required to generate a schedule'
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      !league.preferredGameDays?.length &&
      league.gameFrequency !== 'all_at_once'
    ) {
      const error: any = new Error(
        'Schedule configuration incomplete: preferredGameDays are required'
      );
      error.statusCode = 400;
      throw error;
    }

    const format = league.leagueFormat || 'season';

    if (format !== 'tournament' && !league.seasonGameCount) {
      const error: any = new Error(
        'Schedule configuration incomplete: seasonGameCount is required'
      );
      error.statusCode = 400;
      throw error;
    }

    // Map league config to FairScheduler input
    const schedulerInput: SchedulerInput = {
      scheduleType:
        format === 'season_with_playoffs'
          ? 'season_playoffs'
          : format === 'tournament'
            ? 'tournament'
            : 'season',
      frequency:
        (league.gameFrequency as 'all_at_once' | 'weekly' | 'monthly') ||
        'weekly',
      startDate: league.startDate ? new Date(league.startDate) : new Date(),
      endDate: league.endDate ? new Date(league.endDate) : null,
      teams: rosters.map(r => ({ id: r.id, name: r.name })),
      regularSeasonGamesPerTeam: league.seasonGameCount || 0,
      allowedDaysOfWeek: league.preferredGameDays || [],
      gameTimeWindowStart: league.preferredTimeWindowStart || '09:00',
      gameTimeWindowEnd: league.preferredTimeWindowEnd || '17:00',
      playoffTeamCount: league.playoffTeamCount ?? undefined,
      eliminationType:
        league.eliminationFormat === 'double_elimination'
          ? 'double'
          : league.eliminationFormat === 'single_elimination'
            ? 'single'
            : undefined,
    };

    const result = fairGenerateSchedule(schedulerInput);

    if (!result.isValid) {
      const error: any = new Error(result.warnings.join(' '));
      error.statusCode = 400;
      throw error;
    }

    // Map regular season games to SchedulePreviewEvent format
    const seasonEvents: SchedulePreviewEvent[] = result.regularSeasonGames.map(
      g => ({
        homeRoster: g.homeTeam,
        awayRoster: g.awayTeam,
        scheduledAt: g.scheduledAt.toISOString(),
        round: g.round,
      })
    );

    // Map playoff/tournament games — include gameNumber for bracket cross-referencing
    const bracketEvents: SchedulePreviewEvent[] = result.playoffGames.map(
      g => ({
        homeRoster: g.homeTeam,
        awayRoster: g.awayTeam,
        scheduledAt: g.scheduledAt.toISOString(),
        round: g.round,
        flag: g.flag,
        gameNumber: g.gameNumber,
      })
    );

    const events = [...seasonEvents, ...bracketEvents];

    return {
      events,
      totalGames: events.length,
      format:
        format === 'season_with_playoffs'
          ? 'season_with_playoffs'
          : format === 'tournament'
            ? 'tournament'
            : 'season',
    };
  }

  /**
   * Validate that no roster is double-booked (appearing in two overlapping games on the same day).
   * Games are assumed to be 2 hours long.
   */
  private static validateNoDoubleBooking(events: ShellEvent[]): void {
    const GAME_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];

        // Check if any roster appears in both games
        const rostersA = [a.homeRoster.id, a.awayRoster.id];
        const rostersB = [b.homeRoster.id, b.awayRoster.id];
        const overlap = rostersA.some(id => rostersB.includes(id));

        if (!overlap) continue;

        // Check if time slots overlap
        const aStart = a.scheduledAt.getTime();
        const aEnd = aStart + GAME_DURATION_MS;
        const bStart = b.scheduledAt.getTime();
        const bEnd = bStart + GAME_DURATION_MS;

        if (aStart < bEnd && bStart < aEnd) {
          const sharedRoster = rostersA.find(id => rostersB.includes(id));
          throw new Error(
            `Double-booking detected: roster ${sharedRoster} is scheduled in overlapping games`
          );
        }
      }
    }
  }

  /**
   * Generate round-robin matchups for the given rosters.
   * Repeats rounds as needed to reach seasonGameCount total matches.
   */
  private static generateMatchups(
    rosters: RosterInfo[],
    seasonGameCount: number
  ): Array<{ home: RosterInfo; away: RosterInfo; round: number }> {
    const n = rosters.length;
    // For odd number of rosters, add a "bye" placeholder
    const rosterList = [...rosters];
    if (n % 2 !== 0) {
      rosterList.push({ id: 'BYE', name: 'BYE' });
    }

    const totalRosters = rosterList.length;
    const roundsPerCycle = totalRosters - 1;
    const matchups: Array<{
      home: RosterInfo;
      away: RosterInfo;
      round: number;
    }> = [];

    let roundNum = 1;
    let cycle = 0;

    while (matchups.length < seasonGameCount) {
      // Standard round-robin rotation
      for (
        let round = 0;
        round < roundsPerCycle && matchups.length < seasonGameCount;
        round++
      ) {
        const roundMatchups: Array<{ home: RosterInfo; away: RosterInfo }> = [];

        for (let i = 0; i < totalRosters / 2; i++) {
          const homeIdx =
            i === 0 ? 0 : ((round + i - 1) % (totalRosters - 1)) + 1;
          const awayIdx =
            i === 0
              ? ((round + totalRosters / 2 - 1) % (totalRosters - 1)) + 1
              : ((round + totalRosters - 1 - i - 1) % (totalRosters - 1)) + 1;

          const home = rosterList[homeIdx];
          const away = rosterList[awayIdx];

          // Skip bye matchups
          if (home.id === 'BYE' || away.id === 'BYE') continue;

          // Alternate home/away in second cycle
          if (cycle % 2 === 0) {
            roundMatchups.push({ home, away });
          } else {
            roundMatchups.push({ home: away, away: home });
          }
        }

        for (const m of roundMatchups) {
          if (matchups.length >= seasonGameCount) break;
          matchups.push({ ...m, round: roundNum });
        }
        roundNum++;
      }
      cycle++;
    }

    return matchups;
  }

  /**
   * Distribute matchups across preferred game days with times within the window.
   */
  private static distributeMatchups(
    matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number }>,
    config: DistributeConfig
  ): ShellEvent[] {
    const {
      preferredGameDays,
      timeWindowStart,
      timeWindowEnd,
      startDate,
      endDate,
      gameFrequency,
    } = config;

    const frequency = gameFrequency ?? 'weekly';

    if (frequency === 'all_at_once') {
      // All-at-once: collect all consecutive day slots, assign in order
      const slots = ScheduleGeneratorService.collectAllAtOnceSlots(
        startDate,
        endDate,
        timeWindowStart,
        timeWindowEnd
      );

      if (matchups.length > slots.length) {
        throw new Error(
          'Insufficient dates to schedule all games within the configured window'
        );
      }

      return matchups.map((matchup, i) => ({
        homeRoster: matchup.home,
        awayRoster: matchup.away,
        scheduledAt: slots[i],
        round: matchup.round,
      }));
    }

    if (frequency === 'monthly') {
      // Monthly: collect slots grouped by month, distribute evenly
      const monthlySlots = ScheduleGeneratorService.collectMonthlySlots(
        startDate,
        endDate,
        preferredGameDays,
        timeWindowStart,
        timeWindowEnd
      );

      // Filter out months with zero slots and redistribute
      const activeMonths = monthlySlots.filter(m => m.slots.length > 0);

      const totalSlots = activeMonths.reduce(
        (sum, m) => sum + m.slots.length,
        0
      );

      if (matchups.length > totalSlots) {
        throw new Error(
          'Insufficient dates to schedule all games within the configured window'
        );
      }

      const totalGames = matchups.length;
      const totalMonths = activeMonths.length;

      if (totalMonths === 0) {
        throw new Error(
          'Insufficient dates to schedule all games within the configured window'
        );
      }

      const gamesPerMonth = Math.floor(totalGames / totalMonths);
      const remainder = totalGames % totalMonths;

      // Build allocation: first `remainder` months get gamesPerMonth + 1
      const allocation: number[] = activeMonths.map((_, i) =>
        i < remainder ? gamesPerMonth + 1 : gamesPerMonth
      );

      // Redistribute if a month doesn't have enough slots
      for (let i = 0; i < allocation.length; i++) {
        const available = activeMonths[i].slots.length;
        if (allocation[i] > available) {
          let overflow = allocation[i] - available;
          allocation[i] = available;
          // Push overflow to adjacent months (forward first, then backward)
          for (let j = i + 1; j < allocation.length && overflow > 0; j++) {
            const canTake = activeMonths[j].slots.length - allocation[j];
            if (canTake > 0) {
              const take = Math.min(canTake, overflow);
              allocation[j] += take;
              overflow -= take;
            }
          }
          // If still overflow, try earlier months
          for (let j = i - 1; j >= 0 && overflow > 0; j--) {
            const canTake = activeMonths[j].slots.length - allocation[j];
            if (canTake > 0) {
              const take = Math.min(canTake, overflow);
              allocation[j] += take;
              overflow -= take;
            }
          }
        }
      }

      // Assign matchups to slots within each month
      const events: ShellEvent[] = [];
      let matchIdx = 0;

      for (let m = 0; m < activeMonths.length; m++) {
        const monthSlots = activeMonths[m].slots;
        const count = allocation[m];

        for (let s = 0; s < count && matchIdx < matchups.length; s++) {
          const matchup = matchups[matchIdx];
          events.push({
            homeRoster: matchup.home,
            awayRoster: matchup.away,
            scheduledAt: monthSlots[s],
            round: matchup.round,
          });
          matchIdx++;
        }
      }

      return events;
    }

    // Default: 'weekly' (also handles null/undefined gameFrequency)
    const slots = ScheduleGeneratorService.collectWeeklySlots(
      startDate,
      endDate,
      preferredGameDays,
      timeWindowStart,
      timeWindowEnd
    );

    if (matchups.length > slots.length) {
      throw new Error(
        'Insufficient dates to schedule all games within the configured window'
      );
    }

    return matchups.map((matchup, i) => ({
      homeRoster: matchup.home,
      awayRoster: matchup.away,
      scheduledAt: slots[i],
      round: matchup.round,
    }));
  }

  /**
   * Collect all available time slots for "all at once" (tournament) distribution.
   * Iterates consecutive days from startDate to endDate, generating 2-hour-spaced
   * slots within the time window. Ignores preferredGameDays entirely.
   */
  private static collectAllAtOnceSlots(
    startDate: Date,
    endDate: Date | null,
    timeWindowStart: string,
    timeWindowEnd: string
  ): Date[] {
    const [startH, startM] = timeWindowStart.split(':').map(Number);
    const [endH, endM] = timeWindowEnd.split(':').map(Number);
    const windowStartMinutes = startH * 60 + startM;
    const windowEndMinutes = endH * 60 + endM;

    const maxDays = 365;
    const limitDate = endDate
      ? new Date(endDate)
      : new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const slots: Date[] = [];
    const current = new Date(startDate);

    while (current <= limitDate) {
      // Generate time slots spaced 2 hours apart within the window
      let slotMinutes = windowStartMinutes;
      while (slotMinutes + 120 <= windowEndMinutes) {
        const slot = new Date(current);
        slot.setUTCHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
        slots.push(slot);
        slotMinutes += 120;
      }

      // Move to next day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return slots;
  }

  private static collectWeeklySlots(
    startDate: Date,
    endDate: Date | null,
    preferredGameDays: number[],
    timeWindowStart: string,
    timeWindowEnd: string
  ): Date[] {
    const [startH, startM] = timeWindowStart.split(':').map(Number);
    const [endH, endM] = timeWindowEnd.split(':').map(Number);
    const windowStartMinutes = startH * 60 + startM;
    const windowEndMinutes = endH * 60 + endM;

    const maxDays = 365;
    const limitDate = endDate
      ? new Date(endDate)
      : new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const slots: Date[] = [];
    const current = new Date(startDate);

    while (current <= limitDate) {
      if (preferredGameDays.includes(current.getUTCDay())) {
        // Generate time slots spaced 2 hours apart within the window
        let slotMinutes = windowStartMinutes;
        while (slotMinutes + 120 <= windowEndMinutes) {
          const slot = new Date(current);
          slot.setUTCHours(
            Math.floor(slotMinutes / 60),
            slotMinutes % 60,
            0,
            0
          );
          slots.push(slot);
          slotMinutes += 120;
        }
      }

      // Move to next day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return slots;
  }

  /**
   * Collect available time slots for "monthly" distribution, grouped by calendar month.
   * Iterates from startDate to endDate (or up to 365 days), only including days
   * whose getDay() is in preferredGameDays. Generates 2-hour-spaced slots within
   * the time window on each matching day. Returns slots grouped by month key (e.g. "2024-01").
   */
  private static collectMonthlySlots(
    startDate: Date,
    endDate: Date | null,
    preferredGameDays: number[],
    timeWindowStart: string,
    timeWindowEnd: string
  ): { month: string; slots: Date[] }[] {
    const [startH, startM] = timeWindowStart.split(':').map(Number);
    const [endH, endM] = timeWindowEnd.split(':').map(Number);
    const windowStartMinutes = startH * 60 + startM;
    const windowEndMinutes = endH * 60 + endM;

    const maxDays = 365;
    const limitDate = endDate
      ? new Date(endDate)
      : new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const monthMap = new Map<string, Date[]>();
    const current = new Date(startDate);

    while (current <= limitDate) {
      if (preferredGameDays.includes(current.getUTCDay())) {
        const monthKey = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, []);
        }

        // Generate time slots spaced 2 hours apart within the window
        let slotMinutes = windowStartMinutes;
        while (slotMinutes + 120 <= windowEndMinutes) {
          const slot = new Date(current);
          slot.setUTCHours(
            Math.floor(slotMinutes / 60),
            slotMinutes % 60,
            0,
            0
          );
          monthMap.get(monthKey)!.push(slot);
          slotMinutes += 120;
        }
      }

      // Move to next day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Convert map to array, preserving chronological order
    const result: { month: string; slots: Date[] }[] = [];
    for (const [month, slots] of monthMap) {
      result.push({ month, slots });
    }

    return result;
  }

  /**
   * Generate playoff rounds using a single-elimination bracket.
   * All roster assignments are TBD — actual rosters are determined by standings.
   * Returns playoff events distributed across preferred days within the time window.
   */
  static generatePlayoffRounds(
    rosterCount: number,
    playoffSlots: number,
    startDate: Date,
    preferredDays: number[],
    timeWindow: { start: string; end: string }
  ): PlayoffEvent[] {
    if (playoffSlots < 2) return [];

    const tbdRoster: RosterInfo = { id: 'TBD', name: 'TBD' };

    // Build single-elimination bracket: playoffSlots/2 games in round 1, halving each round
    const matchups: Array<{
      home: RosterInfo;
      away: RosterInfo;
      round: number;
      playoffRound: number;
    }> = [];
    let gamesInRound = Math.floor(playoffSlots / 2);
    let playoffRound = 1;

    while (gamesInRound >= 1) {
      for (let i = 0; i < gamesInRound; i++) {
        matchups.push({
          home: tbdRoster,
          away: tbdRoster,
          round: 100 + playoffRound,
          playoffRound,
        });
      }
      gamesInRound = Math.floor(gamesInRound / 2);
      playoffRound++;
    }

    // Distribute across preferred days within the time window
    const config: DistributeConfig = {
      preferredGameDays: preferredDays,
      timeWindowStart: timeWindow.start,
      timeWindowEnd: timeWindow.end,
      startDate,
      endDate: null,
      gameFrequency: 'weekly',
    };
    const shellEvents = this.distributeMatchups(matchups, config);

    // Map to PlayoffEvent with the correct flag and playoffRound
    return shellEvents.map((e, idx) => ({
      homeRoster: e.homeRoster,
      awayRoster: e.awayRoster,
      scheduledAt: e.scheduledAt.toISOString(),
      round: matchups[idx].round,
      flag: 'playoffs' as const,
      playoffRound: matchups[idx].playoffRound,
    }));
  }

  /**
   * Update a shell event's scheduled status when a facility is assigned.
   * Notifies all players on both rosters.
   */
  static async markEventScheduled(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        matches: {
          include: {
            homeTeam: {
              include: {
                members: {
                  where: { status: 'active' },
                  select: { userId: true },
                },
              },
            },
            awayTeam: {
              include: {
                members: {
                  where: { status: 'active' },
                  select: { userId: true },
                },
              },
            },
          },
        },
        facility: { select: { name: true, street: true, city: true } },
      },
    });

    if (!event || event.scheduledStatus !== 'unscheduled') return;

    await prisma.event.update({
      where: { id: eventId },
      data: { scheduledStatus: 'scheduled' },
    });

    // Notify all players on both rosters
    if (event.matches.length > 0 && event.facility) {
      const match = event.matches[0];
      if (!match.homeTeam || !match.awayTeam) return;
      const playerIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId),
      ];

      for (const playerId of playerIds) {
        try {
          (NotificationService as any).sendNotification(playerId, {
            title: 'Game Scheduled',
            body: `${event.title} — ${event.facility.name}, ${event.facility.city}`,
            data: { eventId: event.id, type: 'event_scheduled' },
          });
        } catch {
          // Non-critical: continue if notification fails
        }
      }
    }
  }

  /**
   * Generate a tournament bracket for registered rosters.
   * Supports single and double elimination formats.
   * First round uses actual roster names; subsequent rounds use "Winner of Game N" placeholders.
   * Non-power-of-2 roster counts are padded with byes.
   */
  static generateTournamentBracket(
    rosters: RosterInfo[],
    eliminationFormat: 'single_elimination' | 'double_elimination',
    startDate: Date,
    preferredDays: number[],
    timeWindow: { start: string; end: string },
    endDate?: Date | null
  ): TournamentEvent[] {
    if (rosters.length < 2) return [];

    // Round up to next power of 2
    const n = rosters.length;
    let bracketSize = 1;
    while (bracketSize < n) bracketSize *= 2;

    const byeRoster: RosterInfo = { id: 'BYE', name: 'BYE' };

    // Seed rosters into bracket slots, padding with byes
    const seeded: RosterInfo[] = [...rosters];
    while (seeded.length < bracketSize) {
      seeded.push(byeRoster);
    }

    if (eliminationFormat === 'single_elimination') {
      return this.generateSingleElimination(
        seeded,
        bracketSize,
        startDate,
        preferredDays,
        timeWindow,
        endDate
      );
    } else {
      return this.generateDoubleElimination(
        seeded,
        bracketSize,
        startDate,
        preferredDays,
        timeWindow,
        endDate
      );
    }
  }

  /**
   * Persist a confirmed schedule as Event + Match records.
   * Wraps all DB writes in a transaction. After persisting, sends push
   * notifications to all confirmed roster players.
   */
  static async confirmSchedule(
    leagueId: string,
    organizerId: string,
    events: Array<{
      homeRosterId: string;
      homeRosterName: string;
      awayRosterId: string;
      awayRosterName: string;
      scheduledAt: string;
      round: number;
      flag?: 'playoffs' | 'tournament';
      gameNumber?: number;
    }>
  ): Promise<{ eventsCreated: number }> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          where: { status: 'active', memberType: 'roster' },
          include: {
            team: {
              select: {
                id: true,
                members: {
                  where: { status: 'active' },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!league) throw new Error('League not found');

    // Build roster → player IDs map for populating invitedUserIds
    const rosterPlayerMap = new Map<string, string[]>();
    for (const membership of league.memberships) {
      if (membership.team) {
        rosterPlayerMap.set(
          membership.team.id,
          membership.team.members.map(m => m.userId)
        );
      }
    }

    // Separate concrete events (real roster IDs) from bracket shells (placeholder IDs)
    const placeholderPattern =
      /^(seed-|winner-|loser-|wb-winner|lb-winner|BYE)/;
    const concreteEvents = events.filter(
      ev =>
        !placeholderPattern.test(ev.homeRosterId) &&
        !placeholderPattern.test(ev.awayRosterId)
    );
    const bracketEvents = events.filter(
      ev =>
        placeholderPattern.test(ev.homeRosterId) ||
        placeholderPattern.test(ev.awayRosterId)
    );

    if (concreteEvents.length === 0 && bracketEvents.length === 0) {
      throw new Error('No games to schedule.');
    }

    // Validate concrete roster IDs
    const allRosterIds = [
      ...new Set(
        concreteEvents.flatMap(ev => [ev.homeRosterId, ev.awayRosterId])
      ),
    ];
    if (allRosterIds.length > 0) {
      const existingTeams = await prisma.team.findMany({
        where: { id: { in: allRosterIds } },
        select: { id: true },
      });
      const existingTeamIds = new Set(existingTeams.map(t => t.id));
      const missingRosterIds = allRosterIds.filter(
        id => !existingTeamIds.has(id)
      );
      if (missingRosterIds.length > 0) {
        throw new Error(`Roster IDs not found: ${missingRosterIds.join(', ')}`);
      }
    }

    // Validate seasonId references an existing season (if set)
    let validSeasonId: string | undefined;
    if (league.seasonId) {
      const season = await prisma.season.findUnique({
        where: { id: league.seasonId },
        select: { id: true },
      });
      validSeasonId = season ? season.id : undefined;
    }

    const result = await prisma.$transaction(async tx => {
      const createdEventIds: string[] = [];

      // ── Concrete games (real rosters on both sides) ──
      for (const ev of concreteEvents) {
        const scheduledAt = new Date(ev.scheduledAt);

        const homePlayerIds = rosterPlayerMap.get(ev.homeRosterId) || [];
        const awayPlayerIds = rosterPlayerMap.get(ev.awayRosterId) || [];
        const invitedUserIds = [
          ...new Set([...homePlayerIds, ...awayPlayerIds]),
        ];

        const isBracket = !!ev.flag;

        const event = await tx.event.create({
          data: {
            title: `${ev.homeRosterName} vs ${ev.awayRosterName}`,
            description: isBracket
              ? `${league.name} — Bracket Round ${ev.round > 200 ? ev.round - 200 : ev.round}`
              : `League match: ${league.name} — Round ${ev.round}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'game',
            status: 'active',
            startTime: scheduledAt,
            endTime: new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000),
            maxParticipants: 50,
            price: 0,
            organizerId,
            facilityId: null,
            scheduledStatus: 'unscheduled',
            eligibilityRestrictedToLeagues: [leagueId],
            eligibilityRestrictedToTeams: [ev.homeRosterId, ev.awayRosterId],
            invitedUserIds,
          },
        });

        await tx.match.create({
          data: {
            leagueId,
            homeTeamId: ev.homeRosterId,
            awayTeamId: ev.awayRosterId,
            scheduledAt,
            status: 'scheduled',
            eventId: event.id,
            ...(ev.gameNumber ? { gameNumber: ev.gameNumber } : {}),
            ...(isBracket
              ? {
                  bracketRound: ev.round > 200 ? ev.round - 200 : ev.round,
                  bracketFlag: ev.flag,
                }
              : {}),
            ...(validSeasonId ? { seasonId: validSeasonId } : {}),
          },
        });

        createdEventIds.push(event.id);
      }

      // ── Bracket shell games (placeholder rosters — resolved when results come in) ──
      for (const ev of bracketEvents) {
        const scheduledAt = new Date(ev.scheduledAt);
        const isHomeReal = !placeholderPattern.test(ev.homeRosterId);
        const isAwayReal = !placeholderPattern.test(ev.awayRosterId);

        // Build title from real names or placeholder labels
        const homeLabel = isHomeReal ? ev.homeRosterName : ev.homeRosterName;
        const awayLabel = isAwayReal ? ev.awayRosterName : ev.awayRosterName;

        const event = await tx.event.create({
          data: {
            title: `${homeLabel} vs ${awayLabel}`,
            description: `${league.name} — Bracket Round ${ev.round - 200}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'game',
            status: 'active',
            startTime: scheduledAt,
            endTime: new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000),
            maxParticipants: 50,
            price: 0,
            organizerId,
            facilityId: null,
            scheduledStatus: 'unscheduled',
            eligibilityRestrictedToLeagues: [leagueId],
            eligibilityRestrictedToTeams: [
              ...(isHomeReal ? [ev.homeRosterId] : []),
              ...(isAwayReal ? [ev.awayRosterId] : []),
            ],
            invitedUserIds: [],
          },
        });

        // Extract gameNumber from the round field if available
        // The frontend sends bracket events with round = 200 + bracketRound
        const bracketRound = ev.round > 200 ? ev.round - 200 : ev.round;

        await tx.match.create({
          data: {
            leagueId,
            homeTeamId: isHomeReal ? ev.homeRosterId : null,
            awayTeamId: isAwayReal ? ev.awayRosterId : null,
            scheduledAt,
            status: 'pending_bracket',
            eventId: event.id,
            bracketRound,
            gameNumber: ev.gameNumber || null,
            placeholderHome: isHomeReal ? null : ev.homeRosterName,
            placeholderAway: isAwayReal ? null : ev.awayRosterName,
            bracketFlag: ev.flag || 'tournament',
            ...(validSeasonId ? { seasonId: validSeasonId } : {}),
          },
        });

        createdEventIds.push(event.id);
      }

      await tx.league.update({
        where: { id: leagueId },
        data: { scheduleGenerated: true },
      });

      return createdEventIds;
    });

    // Collect all unique player IDs from confirmed rosters
    const playerIds = new Set<string>();
    for (const membership of league.memberships) {
      if (membership.team) {
        for (const member of membership.team.members) {
          playerIds.add(member.userId);
        }
      }
    }

    // Send notifications — failures are non-blocking
    for (const playerId of playerIds) {
      try {
        await (NotificationService as any).sendNotification(playerId, {
          title: 'Schedule Published',
          body: `${league.name} schedule has been published.`,
          data: { leagueId, type: 'schedule_published' },
        });
      } catch {
        // Non-critical: continue if notification fails
      }
    }

    return { eventsCreated: result.length };
  }

  /**
   * Generate a single-elimination bracket.
   * Total games = bracketSize - 1.
   */
  private static generateSingleElimination(
    seeded: RosterInfo[],
    bracketSize: number,
    startDate: Date,
    preferredDays: number[],
    timeWindow: { start: string; end: string },
    endDate?: Date | null
  ): TournamentEvent[] {
    const totalRounds = Math.log2(bracketSize);
    const allMatchups: Array<{
      home: RosterInfo;
      away: RosterInfo;
      round: number;
      bracketRound: number;
      bracketPosition: number;
      placeholderLabel?: string;
      gameNumber: number;
    }> = [];

    let gameNumber = 1;

    // Round 1: actual rosters (with byes)
    const gamesInRound1 = bracketSize / 2;
    for (let i = 0; i < gamesInRound1; i++) {
      const home = seeded[i * 2];
      const away = seeded[i * 2 + 1];
      allMatchups.push({
        home,
        away,
        round: 200 + 1,
        bracketRound: 1,
        bracketPosition: i + 1,
        gameNumber,
      });
      gameNumber++;
    }

    // Subsequent rounds: "Winner of Game N" placeholders
    let prevRoundStart = 1; // game number of first game in previous round
    let gamesInPrevRound = gamesInRound1;

    for (let roundNum = 2; roundNum <= totalRounds; roundNum++) {
      const gamesInRound = gamesInPrevRound / 2;
      for (let i = 0; i < gamesInRound; i++) {
        const homeGameNum = prevRoundStart + i * 2;
        const awayGameNum = prevRoundStart + i * 2 + 1;
        const homeLabel = `Winner of Game ${homeGameNum}`;
        const awayLabel = `Winner of Game ${awayGameNum}`;

        allMatchups.push({
          home: { id: `winner-${homeGameNum}`, name: homeLabel },
          away: { id: `winner-${awayGameNum}`, name: awayLabel },
          round: 200 + roundNum,
          bracketRound: roundNum,
          bracketPosition: i + 1,
          placeholderLabel: `${homeLabel} vs ${awayLabel}`,
          gameNumber,
        });
        gameNumber++;
      }
      prevRoundStart += gamesInPrevRound;
      gamesInPrevRound = gamesInRound;
    }

    // Distribute across preferred days — tournament brackets always use 'all_at_once'
    const config: DistributeConfig = {
      preferredGameDays: preferredDays,
      timeWindowStart: timeWindow.start,
      timeWindowEnd: timeWindow.end,
      startDate,
      endDate: endDate ?? null,
      gameFrequency: 'all_at_once',
    };

    const distributed = this.distributeMatchups(
      allMatchups.map(m => ({ home: m.home, away: m.away, round: m.round })),
      config
    );

    return distributed.map((e, idx) => ({
      homeRoster: e.homeRoster,
      awayRoster: e.awayRoster,
      scheduledAt: e.scheduledAt.toISOString(),
      round: allMatchups[idx].round,
      flag: 'tournament' as const,
      bracketRound: allMatchups[idx].bracketRound,
      bracketPosition: allMatchups[idx].bracketPosition,
      placeholderLabel: allMatchups[idx].placeholderLabel,
    }));
  }

  /**
   * Generate a double-elimination bracket.
   * Winners bracket + losers bracket + grand final.
   * Total games = 2*(bracketSize-1) (without reset) or 2*(bracketSize-1)+1 (with reset).
   * We generate 2*(bracketSize-1) games (grand final without reset).
   */
  private static generateDoubleElimination(
    seeded: RosterInfo[],
    bracketSize: number,
    startDate: Date,
    preferredDays: number[],
    timeWindow: { start: string; end: string },
    endDate?: Date | null
  ): TournamentEvent[] {
    const allMatchups: Array<{
      home: RosterInfo;
      away: RosterInfo;
      round: number;
      bracketRound: number;
      bracketPosition: number;
      placeholderLabel?: string;
      gameNumber: number;
    }> = [];

    let gameNumber = 1;
    const winnersRounds = Math.log2(bracketSize);
    let bracketRoundCounter = 1;

    // === Winners Bracket ===
    // Round 1: actual rosters
    const wbRound1Games = bracketSize / 2;
    const wbGamesByRound: number[][] = []; // track game numbers per WB round

    const wbRound1GameNums: number[] = [];
    for (let i = 0; i < wbRound1Games; i++) {
      const home = seeded[i * 2];
      const away = seeded[i * 2 + 1];
      allMatchups.push({
        home,
        away,
        round: 200 + bracketRoundCounter,
        bracketRound: bracketRoundCounter,
        bracketPosition: i + 1,
        gameNumber,
      });
      wbRound1GameNums.push(gameNumber);
      gameNumber++;
    }
    wbGamesByRound.push(wbRound1GameNums);
    bracketRoundCounter++;

    // Winners bracket subsequent rounds
    let wbPrevGameNums = wbRound1GameNums;
    for (let wr = 1; wr < winnersRounds; wr++) {
      const gamesInRound = wbPrevGameNums.length / 2;
      const roundGameNums: number[] = [];
      for (let i = 0; i < gamesInRound; i++) {
        const homeGameNum = wbPrevGameNums[i * 2];
        const awayGameNum = wbPrevGameNums[i * 2 + 1];
        const homeLabel = `Winner of Game ${homeGameNum}`;
        const awayLabel = `Winner of Game ${awayGameNum}`;
        allMatchups.push({
          home: { id: `winner-${homeGameNum}`, name: homeLabel },
          away: { id: `winner-${awayGameNum}`, name: awayLabel },
          round: 200 + bracketRoundCounter,
          bracketRound: bracketRoundCounter,
          bracketPosition: i + 1,
          placeholderLabel: `${homeLabel} vs ${awayLabel}`,
          gameNumber,
        });
        roundGameNums.push(gameNumber);
        gameNumber++;
      }
      wbGamesByRound.push(roundGameNums);
      wbPrevGameNums = roundGameNums;
      bracketRoundCounter++;
    }

    // === Losers Bracket ===
    // Standard double elimination losers bracket has 2*(winnersRounds-1) rounds.
    // Pattern alternates:
    //   - Odd LB rounds: LB survivors vs losers dropping from WB (cross-bracket)
    //   - Even LB rounds: LB survivors play each other (within LB)
    // First LB round is special: losers from WB round 1 play each other.

    const totalLbRounds = 2 * (winnersRounds - 1);

    // LB Round 1: losers from WB round 1 play each other
    const wbR1Losers = wbGamesByRound[0]; // game numbers from WB round 1
    let lbPrevGameNums: number[] = [];
    const lbR1Games = wbR1Losers.length / 2;
    for (let i = 0; i < lbR1Games; i++) {
      const homeLabel = `Loser of Game ${wbR1Losers[i * 2]}`;
      const awayLabel = `Loser of Game ${wbR1Losers[i * 2 + 1]}`;
      allMatchups.push({
        home: { id: `loser-${wbR1Losers[i * 2]}`, name: homeLabel },
        away: { id: `loser-${wbR1Losers[i * 2 + 1]}`, name: awayLabel },
        round: 200 + bracketRoundCounter,
        bracketRound: bracketRoundCounter,
        bracketPosition: i + 1,
        placeholderLabel: `${homeLabel} vs ${awayLabel}`,
        gameNumber,
      });
      lbPrevGameNums.push(gameNumber);
      gameNumber++;
    }
    bracketRoundCounter++;

    // Remaining LB rounds (lbRound 2 through totalLbRounds)
    // wbRoundIdx tracks which WB round's losers drop into the next cross-bracket LB round
    let wbDropRoundIdx = 1; // start from WB round 2 losers

    for (let lbRound = 2; lbRound <= totalLbRounds; lbRound++) {
      const roundGameNums: number[] = [];

      if (lbRound % 2 === 0) {
        // Even LB round: cross-bracket — LB survivors vs losers from WB
        const wbLosers = wbGamesByRound[wbDropRoundIdx];
        const gamesInRound = lbPrevGameNums.length;
        for (let i = 0; i < gamesInRound; i++) {
          const homeLabel = `Winner of Game ${lbPrevGameNums[i]}`;
          const loserGameNum =
            wbLosers && wbLosers[i] ? wbLosers[i] : lbPrevGameNums[i];
          const awayLabel =
            wbLosers && wbLosers[i]
              ? `Loser of Game ${wbLosers[i]}`
              : `Winner of Game ${lbPrevGameNums[i]}`;
          allMatchups.push({
            home: { id: `winner-${lbPrevGameNums[i]}`, name: homeLabel },
            away: { id: `loser-${loserGameNum}`, name: awayLabel },
            round: 200 + bracketRoundCounter,
            bracketRound: bracketRoundCounter,
            bracketPosition: i + 1,
            placeholderLabel: `${homeLabel} vs ${awayLabel}`,
            gameNumber,
          });
          roundGameNums.push(gameNumber);
          gameNumber++;
        }
        wbDropRoundIdx++;
      } else {
        // Odd LB round: within LB — survivors play each other, halving the count
        const gamesInRound = lbPrevGameNums.length / 2;
        for (let i = 0; i < gamesInRound; i++) {
          const homeGameNum = lbPrevGameNums[i * 2];
          const awayGameNum = lbPrevGameNums[i * 2 + 1];
          const homeLabel = `Winner of Game ${homeGameNum}`;
          const awayLabel = `Winner of Game ${awayGameNum}`;
          allMatchups.push({
            home: { id: `winner-${homeGameNum}`, name: homeLabel },
            away: { id: `winner-${awayGameNum}`, name: awayLabel },
            round: 200 + bracketRoundCounter,
            bracketRound: bracketRoundCounter,
            bracketPosition: i + 1,
            placeholderLabel: `${homeLabel} vs ${awayLabel}`,
            gameNumber,
          });
          roundGameNums.push(gameNumber);
          gameNumber++;
        }
      }

      lbPrevGameNums = roundGameNums;
      bracketRoundCounter++;
    }

    // === Grand Final ===
    const wbFinalGameNum = wbGamesByRound[wbGamesByRound.length - 1][0];
    const lbFinalGameNum = lbPrevGameNums[0];
    const homeLabel = `Winner of Game ${wbFinalGameNum}`;
    const awayLabel = `Winner of Game ${lbFinalGameNum}`;
    allMatchups.push({
      home: { id: `wb-winner`, name: homeLabel },
      away: { id: `lb-winner`, name: awayLabel },
      round: 200 + bracketRoundCounter,
      bracketRound: bracketRoundCounter,
      bracketPosition: 1,
      placeholderLabel: `${homeLabel} vs ${awayLabel}`,
      gameNumber,
    });

    // Distribute across preferred days — tournament brackets always use 'all_at_once'
    const config: DistributeConfig = {
      preferredGameDays: preferredDays,
      timeWindowStart: timeWindow.start,
      timeWindowEnd: timeWindow.end,
      startDate,
      endDate: endDate ?? null,
      gameFrequency: 'all_at_once',
    };

    const distributed = this.distributeMatchups(
      allMatchups.map(m => ({ home: m.home, away: m.away, round: m.round })),
      config
    );

    return distributed.map((e, idx) => ({
      homeRoster: e.homeRoster,
      awayRoster: e.awayRoster,
      scheduledAt: e.scheduledAt.toISOString(),
      round: allMatchups[idx].round,
      flag: 'tournament' as const,
      bracketRound: allMatchups[idx].bracketRound,
      bracketPosition: allMatchups[idx].bracketPosition,
      placeholderLabel: allMatchups[idx].placeholderLabel,
    }));
  }
}
