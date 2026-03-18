import { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';

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
  playoffTeamCount?: number | null;
  eliminationFormat?: string | null;
  rosters: Array<{ id: string; name: string }>;
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
   * Generate round-robin shell events for a league.
   * Creates Event + Match records in a transaction.
   */
  static async generateRoundRobin(leagueId: string): Promise<{ eventsCreated: number }> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          where: { status: 'active', memberType: 'roster' },
          include: {
            team: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!league) throw new Error('League not found');
    if (league.scheduleGenerated) throw new Error('Schedule already generated for this league');

    const rosters: RosterInfo[] = league.memberships
      .filter(m => m.team)
      .map(m => ({ id: m.team!.id, name: m.team!.name }));

    if (rosters.length < 2) {
      throw new Error('At least 2 active rosters required to generate a schedule');
    }

    if (!league.preferredGameDays?.length || !league.seasonGameCount) {
      throw new Error('Schedule configuration incomplete: preferredGameDays and seasonGameCount are required');
    }

    const matchups = this.generateMatchups(rosters, league.seasonGameCount);
    const shellEvents = this.distributeMatchups(
      matchups,
      league.preferredGameDays,
      league.preferredTimeWindowStart || '18:00',
      league.preferredTimeWindowEnd || '21:00',
      league.registrationCloseDate
        ? new Date(new Date(league.registrationCloseDate).getTime() + 7 * 24 * 60 * 60 * 1000)
        : league.startDate
          ? new Date(league.startDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    // Create all events and matches in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdEvents: string[] = [];

      for (const shell of shellEvents) {
        const event = await tx.event.create({
          data: {
            title: `${shell.homeRoster.name} vs ${shell.awayRoster.name}`,
            description: `League match: ${league.name} — Round ${shell.round}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'league',
            status: 'active',
            startTime: shell.scheduledAt,
            endTime: new Date(shell.scheduledAt.getTime() + 2 * 60 * 60 * 1000), // 2hr default
            maxParticipants: 50,
            price: 0,
            organizerId: league.organizerId,
            facilityId: null,
            scheduledStatus: 'unscheduled',
            eligibilityRestrictedToLeagues: [leagueId],
            eligibilityRestrictedToTeams: [shell.homeRoster.id, shell.awayRoster.id],
          }
        });

        await tx.match.create({
          data: {
            leagueId,
            homeTeamId: shell.homeRoster.id,
            awayTeamId: shell.awayRoster.id,
            scheduledAt: shell.scheduledAt,
            status: 'scheduled',
            eventId: event.id,
            seasonId: league.seasonId || undefined,
          }
        });

        createdEvents.push(event.id);
      }

      // Mark schedule as generated
      await tx.league.update({
        where: { id: leagueId },
        data: { scheduleGenerated: true }
      });

      return createdEvents;
    });

    return { eventsCreated: result.length };
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
      const error: any = new Error('At least 2 registered rosters are required to generate a schedule');
      error.statusCode = 400;
      throw error;
    }

    if (!league.preferredGameDays?.length || !league.seasonGameCount) {
      const error: any = new Error('Schedule configuration incomplete: preferredGameDays and seasonGameCount are required');
      error.statusCode = 400;
      throw error;
    }

    const rosterInfos: RosterInfo[] = rosters.map(r => ({ id: r.id, name: r.name }));

    const matchups = this.generateMatchups(rosterInfos, league.seasonGameCount);

    const startDate = league.startDate
      ? new Date(league.startDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const shellEvents = this.distributeMatchups(
      matchups,
      league.preferredGameDays,
      league.preferredTimeWindowStart || '18:00',
      league.preferredTimeWindowEnd || '21:00',
      startDate
    );

    // Verify no double-booking: no roster in two overlapping games on the same day
    this.validateNoDoubleBooking(shellEvents);

    const events: SchedulePreviewEvent[] = shellEvents.map(e => ({
      homeRoster: e.homeRoster,
      awayRoster: e.awayRoster,
      scheduledAt: e.scheduledAt.toISOString(),
      round: e.round,
    }));

    return {
      events,
      totalGames: events.length,
      format: 'season',
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
  private static generateMatchups(rosters: RosterInfo[], seasonGameCount: number): Array<{ home: RosterInfo; away: RosterInfo; round: number }> {
    const n = rosters.length;
    // For odd number of rosters, add a "bye" placeholder
    const rosterList = [...rosters];
    if (n % 2 !== 0) {
      rosterList.push({ id: 'BYE', name: 'BYE' });
    }

    const totalRosters = rosterList.length;
    const roundsPerCycle = totalRosters - 1;
    const matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number }> = [];

    let roundNum = 1;
    let cycle = 0;

    while (matchups.length < seasonGameCount) {
      // Standard round-robin rotation
      for (let round = 0; round < roundsPerCycle && matchups.length < seasonGameCount; round++) {
        const roundMatchups: Array<{ home: RosterInfo; away: RosterInfo }> = [];

        for (let i = 0; i < totalRosters / 2; i++) {
          const homeIdx = i === 0 ? 0 : ((round + i - 1) % (totalRosters - 1)) + 1;
          const awayIdx = i === 0
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
    preferredGameDays: number[],
    timeWindowStart: string,
    timeWindowEnd: string,
    startDate: Date
  ): ShellEvent[] {
    const events: ShellEvent[] = [];
    const sortedDays = [...preferredGameDays].sort((a, b) => a - b);

    const [startH, startM] = timeWindowStart.split(':').map(Number);
    const [endH, endM] = timeWindowEnd.split(':').map(Number);
    const windowMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    // Space games 2 hours apart within the window
    const gamesPerSlot = Math.max(1, Math.floor(windowMinutes / 120));

    let currentDate = new Date(startDate);
    let matchIdx = 0;

    while (matchIdx < matchups.length) {
      // Find next preferred game day
      const dayOfWeek = currentDate.getDay();
      const nextDay = sortedDays.find(d => d >= dayOfWeek) ?? sortedDays[0];
      let daysToAdd = nextDay >= dayOfWeek ? nextDay - dayOfWeek : 7 - dayOfWeek + nextDay;
      if (daysToAdd === 0 && matchIdx > 0 && events.length > 0) {
        // Already used this day, move to next occurrence
        const nextNextDay = sortedDays.find(d => d > dayOfWeek) ?? sortedDays[0];
        daysToAdd = nextNextDay > dayOfWeek ? nextNextDay - dayOfWeek : 7 - dayOfWeek + nextNextDay;
        if (daysToAdd === 0) daysToAdd = 7;
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + daysToAdd);

      // Schedule up to gamesPerSlot matches on this day
      for (let slot = 0; slot < gamesPerSlot && matchIdx < matchups.length; slot++) {
        const matchup = matchups[matchIdx];
        const gameTime = new Date(currentDate);
        gameTime.setHours(startH + slot * 2, startM, 0, 0);

        events.push({
          homeRoster: matchup.home,
          awayRoster: matchup.away,
          scheduledAt: gameTime,
          round: matchup.round,
        });
        matchIdx++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
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
    const matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number; playoffRound: number }> = [];
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
    const shellEvents = this.distributeMatchups(
      matchups,
      preferredDays,
      timeWindow.start,
      timeWindow.end,
      startDate
    );

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
              include: { members: { where: { status: 'active' }, select: { userId: true } } }
            },
            awayTeam: {
              include: { members: { where: { status: 'active' }, select: { userId: true } } }
            }
          }
        },
        facility: { select: { name: true, street: true, city: true } }
      }
    });

    if (!event || event.scheduledStatus !== 'unscheduled') return;

    await prisma.event.update({
      where: { id: eventId },
      data: { scheduledStatus: 'scheduled' }
    });

    // Notify all players on both rosters
    if (event.matches.length > 0 && event.facility) {
      const match = event.matches[0];
      const playerIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId),
      ];

      for (const playerId of playerIds) {
        try {
          NotificationService.sendNotification(playerId, {
            title: 'Game Scheduled',
            body: `${event.title} — ${event.facility.name}, ${event.facility.city}`,
            data: { eventId: event.id, type: 'event_scheduled' }
          });
        } catch {
          // Non-critical: continue if notification fails
        }
      }
    }
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
    const matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number; playoffRound: number }> = [];
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
    const shellEvents = this.distributeMatchups(
      matchups,
      preferredDays,
      timeWindow.start,
      timeWindow.end,
      startDate
    );

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

    const result = await prisma.$transaction(async (tx) => {
      const createdEventIds: string[] = [];

      for (const ev of events) {
        const scheduledAt = new Date(ev.scheduledAt);

        const event = await tx.event.create({
          data: {
            title: `${ev.homeRosterName} vs ${ev.awayRosterName}`,
            description: `League match: ${league.name} — Round ${ev.round}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'league',
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
            seasonId: league.seasonId || undefined,
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
        await NotificationService.sendNotification(playerId, {
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
    timeWindow: { start: string; end: string }
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
      return this.generateSingleElimination(seeded, bracketSize, startDate, preferredDays, timeWindow);
    } else {
      return this.generateDoubleElimination(seeded, bracketSize, startDate, preferredDays, timeWindow);
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

    const result = await prisma.$transaction(async (tx) => {
      const createdEventIds: string[] = [];

      for (const ev of events) {
        const scheduledAt = new Date(ev.scheduledAt);

        const event = await tx.event.create({
          data: {
            title: `${ev.homeRosterName} vs ${ev.awayRosterName}`,
            description: `League match: ${league.name} — Round ${ev.round}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'league',
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
            seasonId: league.seasonId || undefined,
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
        await NotificationService.sendNotification(playerId, {
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
    timeWindow: { start: string; end: string }
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

    // Distribute across preferred days
    const distributed = this.distributeMatchups(
      allMatchups.map(m => ({ home: m.home, away: m.away, round: m.round })),
      preferredDays,
      timeWindow.start,
      timeWindow.end,
      startDate
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
      timeWindow: { start: string; end: string }
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
            const loserGameNum = wbLosers && wbLosers[i] ? wbLosers[i] : lbPrevGameNums[i];
            const awayLabel = wbLosers && wbLosers[i]
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

      // Distribute across preferred days
      const distributed = this.distributeMatchups(
        allMatchups.map(m => ({ home: m.home, away: m.away, round: m.round })),
        preferredDays,
        timeWindow.start,
        timeWindow.end,
        startDate
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
