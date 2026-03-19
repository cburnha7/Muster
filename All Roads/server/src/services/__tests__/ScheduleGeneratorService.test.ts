/**
 * Unit tests for ScheduleGeneratorService
 */

// Individual mock functions for Prisma — prefixed with "mock" for jest.mock hoisting
const mockLeagueFindUnique = jest.fn();
const mockLeagueUpdate = jest.fn();
const mockEventCreate = jest.fn();
const mockMatchCreate = jest.fn();
const mockTransaction = jest.fn();
const mockEventFindUnique = jest.fn();
const mockEventUpdate = jest.fn();

// Mock @prisma/client — the service creates its own PrismaClient at module level.
// We need to provide a virtual mock since the package lives in server/node_modules.
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => ({
      league: {
        findUnique: (...args: any[]) => mockLeagueFindUnique(...args),
        update: (...args: any[]) => mockLeagueUpdate(...args),
      },
      event: {
        create: (...args: any[]) => mockEventCreate(...args),
        findUnique: (...args: any[]) => mockEventFindUnique(...args),
        update: (...args: any[]) => mockEventUpdate(...args),
      },
      match: {
        create: (...args: any[]) => mockMatchCreate(...args),
      },
      $transaction: (...args: any[]) => mockTransaction(...args),
    })),
  };
}, { virtual: true });

const mockSendNotification = jest.fn();
jest.mock('../NotificationService', () => ({
  NotificationService: {
    sendNotification: (...args: any[]) => mockSendNotification(...args),
  },
}));

import {
  ScheduleGeneratorService,
  LeagueWithRosters,
} from '../ScheduleGeneratorService';

function makeLeague(overrides: Partial<LeagueWithRosters> = {}): LeagueWithRosters {
  return {
    id: 'league-1',
    leagueFormat: 'season',
    preferredGameDays: [1, 3, 5], // Mon, Wed, Fri
    preferredTimeWindowStart: '18:00',
    preferredTimeWindowEnd: '21:00',
    seasonGameCount: 6,
    startDate: new Date('2025-03-01'),
    playoffTeamCount: null,
    eliminationFormat: null,
    rosters: [
      { id: 'r1', name: 'Alpha' },
      { id: 'r2', name: 'Bravo' },
      { id: 'r3', name: 'Charlie' },
    ],
    ...overrides,
  };
}

describe('ScheduleGeneratorService.generateSchedulePreview', () => {
  it('throws with statusCode 400 when fewer than 2 rosters', () => {
    const league = makeLeague({
      rosters: [{ id: 'r1', name: 'Solo' }],
    });

    expect(() => ScheduleGeneratorService.generateSchedulePreview(league)).toThrow(
      'At least 2 registered rosters are required'
    );

    try {
      ScheduleGeneratorService.generateSchedulePreview(league);
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
    }
  });

  it('throws with statusCode 400 when zero rosters', () => {
    const league = makeLeague({ rosters: [] });

    expect(() => ScheduleGeneratorService.generateSchedulePreview(league)).toThrow(
      'At least 2 registered rosters are required'
    );
  });

  it('throws when preferredGameDays is missing', () => {
    const league = makeLeague({ preferredGameDays: [] });

    expect(() => ScheduleGeneratorService.generateSchedulePreview(league)).toThrow(
      'Schedule configuration incomplete'
    );
  });

  it('throws when seasonGameCount is missing', () => {
    const league = makeLeague({ seasonGameCount: null });

    expect(() => ScheduleGeneratorService.generateSchedulePreview(league)).toThrow(
      'Schedule configuration incomplete'
    );
  });

  it('returns a SchedulePreview with correct format and totalGames', () => {
    const league = makeLeague({ seasonGameCount: 6 });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    expect(preview.format).toBe('season');
    expect(preview.totalGames).toBe(6);
    expect(preview.events).toHaveLength(6);
  });

  it('generates events with valid ISO date strings', () => {
    const league = makeLeague();
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    for (const event of preview.events) {
      expect(() => new Date(event.scheduledAt)).not.toThrow();
      expect(new Date(event.scheduledAt).toISOString()).toBe(event.scheduledAt);
    }
  });

  it('assigns home and away rosters from the provided roster list', () => {
    const league = makeLeague();
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);
    const rosterIds = new Set(league.rosters.map(r => r.id));

    for (const event of preview.events) {
      expect(rosterIds.has(event.homeRoster.id)).toBe(true);
      expect(rosterIds.has(event.awayRoster.id)).toBe(true);
      expect(event.homeRoster.id).not.toBe(event.awayRoster.id);
    }
  });

  it('schedules games only on preferred game days', () => {
    const league = makeLeague({ preferredGameDays: [2, 4] }); // Tue, Thu
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    for (const event of preview.events) {
      const dayOfWeek = new Date(event.scheduledAt).getDay();
      expect([2, 4]).toContain(dayOfWeek);
    }
  });

  it('schedules games within the preferred time window', () => {
    const league = makeLeague({
      preferredTimeWindowStart: '17:00',
      preferredTimeWindowEnd: '21:00',
    });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    for (const event of preview.events) {
      const date = new Date(event.scheduledAt);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      expect(timeInMinutes).toBeGreaterThanOrEqual(17 * 60);
      expect(timeInMinutes).toBeLessThan(21 * 60);
    }
  });

  it('produces events with no flag (season-only)', () => {
    const league = makeLeague();
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    for (const event of preview.events) {
      expect(event.flag).toBeUndefined();
    }
  });

  it('works with exactly 2 rosters', () => {
    const league = makeLeague({
      rosters: [
        { id: 'r1', name: 'Alpha' },
        { id: 'r2', name: 'Bravo' },
      ],
      seasonGameCount: 4,
    });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    expect(preview.totalGames).toBe(4);
    expect(preview.events).toHaveLength(4);
  });

  it('uses default start date when startDate is null', () => {
    const league = makeLeague({ startDate: null });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    expect(preview.totalGames).toBe(6);
    // All events should be in the future
    const now = Date.now();
    for (const event of preview.events) {
      expect(new Date(event.scheduledAt).getTime()).toBeGreaterThan(now);
    }
  });

  it('uses default time window when not specified', () => {
    const league = makeLeague({
      preferredTimeWindowStart: null,
      preferredTimeWindowEnd: null,
    });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    // Default is 18:00-21:00
    for (const event of preview.events) {
      const hours = new Date(event.scheduledAt).getHours();
      expect(hours).toBeGreaterThanOrEqual(18);
      expect(hours).toBeLessThan(21);
    }
  });

  it('does not double-book any roster', () => {
    const league = makeLeague({
      rosters: [
        { id: 'r1', name: 'Alpha' },
        { id: 'r2', name: 'Bravo' },
        { id: 'r3', name: 'Charlie' },
        { id: 'r4', name: 'Delta' },
      ],
      seasonGameCount: 12,
      preferredGameDays: [6], // Saturday only — forces multiple games per day
    });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    const GAME_DURATION_MS = 2 * 60 * 60 * 1000;

    for (let i = 0; i < preview.events.length; i++) {
      for (let j = i + 1; j < preview.events.length; j++) {
        const a = preview.events[i]!;
        const b = preview.events[j]!;

        const rostersA = [a.homeRoster.id, a.awayRoster.id];
        const rostersB = [b.homeRoster.id, b.awayRoster.id];
        const shared = rostersA.some(id => rostersB.includes(id));

        if (shared) {
          const aStart = new Date(a.scheduledAt).getTime();
          const aEnd = aStart + GAME_DURATION_MS;
          const bStart = new Date(b.scheduledAt).getTime();
          const bEnd = bStart + GAME_DURATION_MS;

          const overlaps = aStart < bEnd && bStart < aEnd;
          expect(overlaps).toBe(false);
        }
      }
    }
  });

  it('every roster pair plays at least once for sufficient game count', () => {
    const league = makeLeague({
      rosters: [
        { id: 'r1', name: 'Alpha' },
        { id: 'r2', name: 'Bravo' },
        { id: 'r3', name: 'Charlie' },
      ],
      seasonGameCount: 6, // 3 unique pairs, so 6 games = 2 full cycles
    });
    const preview = ScheduleGeneratorService.generateSchedulePreview(league);

    const pairings = new Set<string>();
    for (const event of preview.events) {
      const pair = [event.homeRoster.id, event.awayRoster.id].sort().join('-');
      pairings.add(pair);
    }

    // N*(N-1)/2 = 3 unique pairings
    expect(pairings.size).toBe(3);
  });
});

describe('ScheduleGeneratorService.generatePlayoffRounds', () => {
  const defaultArgs = {
    rosterCount: 8,
    playoffSlots: 8,
    startDate: new Date('2025-06-01'),
    preferredDays: [1, 3, 5], // Mon, Wed, Fri
    timeWindow: { start: '18:00', end: '21:00' },
  };

  it('returns empty array when playoffSlots < 2', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      4, 1, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    expect(result).toEqual([]);
  });

  it('generates correct number of games for single-elimination bracket (8 slots = 7 games)', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    // 8 slots: 4 + 2 + 1 = 7 games
    expect(result).toHaveLength(7);
  });

  it('generates correct number of games for 4 playoff slots (3 games)', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      4, 4, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    // 4 slots: 2 + 1 = 3 games
    expect(result).toHaveLength(3);
  });

  it('generates correct number of games for 2 playoff slots (1 game — the final)', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      4, 2, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    expect(result).toHaveLength(1);
  });

  it('flags all events with flag: "playoffs"', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.flag).toBe('playoffs');
    }
  });

  it('sets all roster names and IDs to TBD', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.homeRoster).toEqual({ id: 'TBD', name: 'TBD' });
      expect(event.awayRoster).toEqual({ id: 'TBD', name: 'TBD' });
    }
  });

  it('all playoff dates are strictly after startDate', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    const startTime = defaultArgs.startDate.getTime();
    for (const event of result) {
      expect(new Date(event.scheduledAt).getTime()).toBeGreaterThan(startTime);
    }
  });

  it('schedules games only on preferred days', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, [2, 4], defaultArgs.timeWindow // Tue, Thu
    );
    for (const event of result) {
      const dayOfWeek = new Date(event.scheduledAt).getDay();
      expect([2, 4]).toContain(dayOfWeek);
    }
  });

  it('schedules games within the time window', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, { start: '17:00', end: '21:00' }
    );
    for (const event of result) {
      const date = new Date(event.scheduledAt);
      const timeInMinutes = date.getHours() * 60 + date.getMinutes();
      expect(timeInMinutes).toBeGreaterThanOrEqual(17 * 60);
      expect(timeInMinutes).toBeLessThan(21 * 60);
    }
  });

  it('assigns playoffRound numbers starting from 1', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    const rounds = result.map(e => e.playoffRound);
    // 8 slots: round 1 (4 games), round 2 (2 games), round 3 (1 game)
    expect(rounds.filter(r => r === 1)).toHaveLength(4);
    expect(rounds.filter(r => r === 2)).toHaveLength(2);
    expect(rounds.filter(r => r === 3)).toHaveLength(1);
  });

  it('uses round offset of 100 + playoffRound for the round field', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      4, 4, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.round).toBe(100 + event.playoffRound);
    }
  });

  it('produces valid ISO date strings for scheduledAt', () => {
    const result = ScheduleGeneratorService.generatePlayoffRounds(
      8, 8, defaultArgs.startDate, defaultArgs.preferredDays, defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(() => new Date(event.scheduledAt)).not.toThrow();
      expect(new Date(event.scheduledAt).toISOString()).toBe(event.scheduledAt);
    }
  });
});

describe('ScheduleGeneratorService.generateTournamentBracket', () => {
  const defaultArgs = {
    startDate: new Date('2025-06-01'),
    preferredDays: [1, 3, 5], // Mon, Wed, Fri
    timeWindow: { start: '18:00', end: '21:00' },
  };

  function makeRosters(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `r${i + 1}`,
      name: `Roster ${i + 1}`,
    }));
  }

  // --- Basic behavior ---

  it('returns empty array when fewer than 2 rosters', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      [{ id: 'r1', name: 'Solo' }],
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    expect(result).toEqual([]);
  });

  it('returns empty array for empty roster list', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      [],
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    expect(result).toEqual([]);
  });

  // --- Flag ---

  it('flags all events with flag: "tournament"', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.flag).toBe('tournament');
    }
  });

  // --- Single elimination game counts (Property 22) ---

  it('single elimination with 2 rosters produces 1 game (N-1)', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(2),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    expect(result).toHaveLength(1); // 2-1 = 1
  });

  it('single elimination with 4 rosters produces 3 games (N-1)', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    expect(result).toHaveLength(3); // 4-1 = 3
  });

  it('single elimination with 8 rosters produces 7 games (N-1)', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(8),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    expect(result).toHaveLength(7); // 8-1 = 7
  });

  // --- Non-power-of-2 with byes (Property 20) ---

  it('single elimination with 3 rosters rounds up to 4 and produces 3 games', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(3),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    // bracketSize = 4, so 4-1 = 3 games
    expect(result).toHaveLength(3);
  });

  it('single elimination with 5 rosters rounds up to 8 and produces 7 games', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(5),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    // bracketSize = 8, so 8-1 = 7 games
    expect(result).toHaveLength(7);
  });

  // --- First round uses registered rosters (Property 20) ---

  it('first round contains all registered rosters', () => {
    const rosters = makeRosters(4);
    const result = ScheduleGeneratorService.generateTournamentBracket(
      rosters,
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    const round1 = result.filter(e => e.bracketRound === 1);
    const rosterNames = new Set<string>();
    for (const event of round1) {
      rosterNames.add(event.homeRoster.name);
      rosterNames.add(event.awayRoster.name);
    }

    for (const roster of rosters) {
      expect(rosterNames.has(roster.name)).toBe(true);
    }
  });

  it('first round includes BYE rosters for non-power-of-2 counts', () => {
    const rosters = makeRosters(3); // rounds up to 4
    const result = ScheduleGeneratorService.generateTournamentBracket(
      rosters,
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    const round1 = result.filter(e => e.bracketRound === 1);
    const allNames = round1.flatMap(e => [e.homeRoster.name, e.awayRoster.name]);

    // All 3 real rosters should appear
    for (const roster of rosters) {
      expect(allNames).toContain(roster.name);
    }
    // One BYE should appear
    expect(allNames.filter(n => n === 'BYE')).toHaveLength(1);
  });

  // --- Placeholder naming for round 2+ (Property 21) ---

  it('round 2+ events use "Winner of Game N" placeholder format', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    const laterRounds = result.filter(e => e.bracketRound > 1);
    expect(laterRounds.length).toBeGreaterThan(0);

    for (const event of laterRounds) {
      expect(event.homeRoster.name).toMatch(/^Winner of Game \d+$/);
      expect(event.awayRoster.name).toMatch(/^Winner of Game \d+$/);
    }
  });

  // --- Round offset (200 + bracketRound) ---

  it('uses round offset of 200 + bracketRound', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.round).toBe(200 + event.bracketRound);
    }
  });

  // --- bracketPosition is 1-indexed ---

  it('bracketPosition is 1-indexed within each round', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(8),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    const byRound = new Map<number, number[]>();
    for (const event of result) {
      if (!byRound.has(event.bracketRound)) byRound.set(event.bracketRound, []);
      byRound.get(event.bracketRound)!.push(event.bracketPosition);
    }

    for (const [, positions] of byRound) {
      const sorted = [...positions].sort((a, b) => a - b);
      expect(sorted[0]).toBe(1);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]).toBe(sorted[i - 1] + 1);
      }
    }
  });

  // --- Scheduling constraints ---

  it('schedules games only on preferred days', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      [2, 4], // Tue, Thu
      defaultArgs.timeWindow
    );
    for (const event of result) {
      const dayOfWeek = new Date(event.scheduledAt).getDay();
      expect([2, 4]).toContain(dayOfWeek);
    }
  });

  it('schedules games within the time window', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      { start: '17:00', end: '21:00' }
    );
    for (const event of result) {
      const date = new Date(event.scheduledAt);
      const timeInMinutes = date.getHours() * 60 + date.getMinutes();
      expect(timeInMinutes).toBeGreaterThanOrEqual(17 * 60);
      expect(timeInMinutes).toBeLessThan(21 * 60);
    }
  });

  it('produces valid ISO date strings', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'single_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(new Date(event.scheduledAt).toISOString()).toBe(event.scheduledAt);
    }
  });

  // --- Double elimination (Property 22) ---

  it('double elimination with 2 rosters produces 2*(N-1) games', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(2),
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    // N=2: 2*(2-1) = 2, 2*(2-1)+1 = 3
    const totalGames = result.length;
    expect(totalGames).toBeGreaterThanOrEqual(2 * (2 - 1));
    expect(totalGames).toBeLessThanOrEqual(2 * (2 - 1) + 1);
  });

  it('double elimination with 4 rosters produces between 2*(N-1) and 2*(N-1)+1 games', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    // N=4: 2*(4-1) = 6, 2*(4-1)+1 = 7
    const totalGames = result.length;
    expect(totalGames).toBeGreaterThanOrEqual(6);
    expect(totalGames).toBeLessThanOrEqual(7);
  });

  it('double elimination with 8 rosters produces between 2*(N-1) and 2*(N-1)+1 games', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(8),
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    // N=8: 2*(8-1) = 14, 2*(8-1)+1 = 15
    const totalGames = result.length;
    expect(totalGames).toBeGreaterThanOrEqual(14);
    expect(totalGames).toBeLessThanOrEqual(15);
  });

  it('double elimination flags all events with flag: "tournament"', () => {
    const result = ScheduleGeneratorService.generateTournamentBracket(
      makeRosters(4),
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );
    for (const event of result) {
      expect(event.flag).toBe('tournament');
    }
  });

  it('double elimination first round contains all registered rosters', () => {
    const rosters = makeRosters(4);
    const result = ScheduleGeneratorService.generateTournamentBracket(
      rosters,
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    const round1 = result.filter(e => e.bracketRound === 1);
    const rosterNames = new Set<string>();
    for (const event of round1) {
      rosterNames.add(event.homeRoster.name);
      rosterNames.add(event.awayRoster.name);
    }

    for (const roster of rosters) {
      expect(rosterNames.has(roster.name)).toBe(true);
    }
  });

  it('double elimination with non-power-of-2 rosters uses byes', () => {
    const rosters = makeRosters(3); // rounds up to 4
    const result = ScheduleGeneratorService.generateTournamentBracket(
      rosters,
      'double_elimination',
      defaultArgs.startDate,
      defaultArgs.preferredDays,
      defaultArgs.timeWindow
    );

    // N=4 (rounded): 2*(4-1) = 6, 2*(4-1)+1 = 7
    const totalGames = result.length;
    expect(totalGames).toBeGreaterThanOrEqual(6);
    expect(totalGames).toBeLessThanOrEqual(7);
  });
});


describe('ScheduleGeneratorService.confirmSchedule', () => {
  const leagueId = 'league-1';
  const organizerId = 'organizer-1';

  const mockLeague = {
    id: leagueId,
    name: 'Sunday League',
    sportType: 'soccer',
    skillLevel: 'intermediate',
    organizerId,
    seasonId: 'season-1',
    memberships: [
      {
        team: {
          id: 'r1',
          members: [{ userId: 'player-1' }, { userId: 'player-2' }],
        },
      },
      {
        team: {
          id: 'r2',
          members: [{ userId: 'player-3' }, { userId: 'player-4' }],
        },
      },
    ],
  };

  const sampleEvents = [
    {
      homeRosterId: 'r1',
      homeRosterName: 'Alpha',
      awayRosterId: 'r2',
      awayRosterName: 'Bravo',
      scheduledAt: '2025-06-10T18:00:00.000Z',
      round: 1,
    },
    {
      homeRosterId: 'r2',
      homeRosterName: 'Bravo',
      awayRosterId: 'r1',
      awayRosterName: 'Alpha',
      scheduledAt: '2025-06-17T18:00:00.000Z',
      round: 2,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLeagueFindUnique.mockResolvedValue(mockLeague);

    // $transaction executes the callback with a tx proxy that uses the same mocks
    mockTransaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      const tx = {
        event: { create: mockEventCreate },
        match: { create: mockMatchCreate },
        league: { update: mockLeagueUpdate },
      };
      return cb(tx);
    });

    let eventCounter = 0;
    mockEventCreate.mockImplementation(async () => {
      eventCounter++;
      return { id: `event-${eventCounter}` };
    });
    mockMatchCreate.mockResolvedValue({});
    mockLeagueUpdate.mockResolvedValue({});
    mockSendNotification.mockResolvedValue(undefined);
  });

  it('creates Event records with scheduledStatus "unscheduled"', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    expect(mockEventCreate).toHaveBeenCalledTimes(2);

    for (const call of mockEventCreate.mock.calls) {
      const data = call[0].data;
      expect(data.scheduledStatus).toBe('unscheduled');
      expect(data.eventType).toBe('game');
      expect(data.status).toBe('active');
    }
  });

  it('creates a Match record for each event linked to the league', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    expect(mockMatchCreate).toHaveBeenCalledTimes(2);

    const firstMatchData = mockMatchCreate.mock.calls[0][0].data;
    expect(firstMatchData.leagueId).toBe(leagueId);
    expect(firstMatchData.homeTeamId).toBe('r1');
    expect(firstMatchData.awayTeamId).toBe('r2');
    expect(firstMatchData.status).toBe('scheduled');
    expect(firstMatchData.eventId).toBe('event-1');
  });

  it('sets league.scheduleGenerated to true', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    expect(mockLeagueUpdate).toHaveBeenCalledWith({
      where: { id: leagueId },
      data: { scheduleGenerated: true },
    });
  });

  it('returns the count of created events', async () => {
    const result = await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    expect(result).toEqual({ eventsCreated: 2 });
  });

  it('sends notification to every player in confirmed rosters', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    expect(mockSendNotification).toHaveBeenCalledTimes(4);

    const notifiedPlayerIds = mockSendNotification.mock.calls.map((c: any[]) => c[0]);
    expect(notifiedPlayerIds).toContain('player-1');
    expect(notifiedPlayerIds).toContain('player-2');
    expect(notifiedPlayerIds).toContain('player-3');
    expect(notifiedPlayerIds).toContain('player-4');
  });

  it('sends notification with correct title and body', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    const payload = mockSendNotification.mock.calls[0][1];
    expect(payload.title).toBe('Schedule Published');
    expect(payload.body).toBe('Sunday League schedule has been published.');
  });

  it('deduplicates players across rosters', async () => {
    const leagueWithSharedPlayer = {
      ...mockLeague,
      memberships: [
        {
          team: {
            id: 'r1',
            members: [{ userId: 'player-1' }, { userId: 'shared-player' }],
          },
        },
        {
          team: {
            id: 'r2',
            members: [{ userId: 'player-2' }, { userId: 'shared-player' }],
          },
        },
      ],
    };
    mockLeagueFindUnique.mockResolvedValue(leagueWithSharedPlayer);

    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    // 3 unique players, not 4
    expect(mockSendNotification).toHaveBeenCalledTimes(3);
  });

  it('throws when league is not found', async () => {
    mockLeagueFindUnique.mockResolvedValue(null);

    await expect(
      ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents)
    ).rejects.toThrow('League not found');
  });

  it('continues when a notification fails', async () => {
    mockSendNotification
      .mockRejectedValueOnce(new Error('Push token invalid'))
      .mockResolvedValue(undefined);

    const result = await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    // Should still succeed
    expect(result).toEqual({ eventsCreated: 2 });
    // Should have attempted all 4 notifications
    expect(mockSendNotification).toHaveBeenCalledTimes(4);
  });

  it('sets correct event title from roster names', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    const firstEventData = mockEventCreate.mock.calls[0][0].data;
    expect(firstEventData.title).toBe('Alpha vs Bravo');

    const secondEventData = mockEventCreate.mock.calls[1][0].data;
    expect(secondEventData.title).toBe('Bravo vs Alpha');
  });

  it('sets 2-hour default duration on events', async () => {
    await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, sampleEvents);

    const data = mockEventCreate.mock.calls[0][0].data;
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();
    expect(end - start).toBe(2 * 60 * 60 * 1000);
  });

  it('handles empty events array', async () => {
    const result = await ScheduleGeneratorService.confirmSchedule(leagueId, organizerId, []);

    expect(result).toEqual({ eventsCreated: 0 });
    expect(mockEventCreate).not.toHaveBeenCalled();
    expect(mockMatchCreate).not.toHaveBeenCalled();
    // scheduleGenerated should still be set
    expect(mockLeagueUpdate).toHaveBeenCalled();
  });
});
