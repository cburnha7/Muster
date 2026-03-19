/**
 * Unit + Property-Based Tests — mapMatchesToScheduleEvents
 *
 * Validates: Requirements 2.1, 2.2
 *
 * Uses fast-check to generate random Match[] arrays and verify all fields
 * map correctly from backend "team" terminology to frontend "roster" terminology.
 */
import * as fc from 'fast-check';
import { mapMatchesToScheduleEvents } from '../utils/mapMatchesToScheduleEvents';
import type { Match } from '../../../types';

// ---------------------------------------------------------------------------
// fast-check Arbitrary: generates a random Match object
// ---------------------------------------------------------------------------

const matchStatusArb = fc.constantFrom(
  'scheduled' as const,
  'in_progress' as const,
  'completed' as const,
  'cancelled' as const,
);

const arbitraryMatch: fc.Arbitrary<Match> = fc.record({
  id: fc.uuid(),
  leagueId: fc.uuid(),
  homeTeamId: fc.uuid(),
  awayTeamId: fc.uuid(),
  homeTeam: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  }) as fc.Arbitrary<any>,
  awayTeam: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  }) as fc.Arbitrary<any>,
  scheduledAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
    (d) => d.toISOString(),
  ),
  status: matchStatusArb,
  round: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
  createdAt: fc.constant(new Date().toISOString()),
  updatedAt: fc.constant(new Date().toISOString()),
}) as fc.Arbitrary<Match>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapMatchesToScheduleEvents', () => {
  /**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any random Match[] array, the mapper must produce a ScheduleEvent[]
   * of the same length with all fields correctly mapped.
   */
  it('maps every Match to a ScheduleEvent with correct roster fields', () => {
    fc.assert(
      fc.property(fc.array(arbitraryMatch, { minLength: 0, maxLength: 25 }), (matches) => {
        const events = mapMatchesToScheduleEvents(matches);

        // Same number of events as matches
        expect(events).toHaveLength(matches.length);

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const event = events[i];

          // ID uses the real backend match ID
          expect(event.id).toBe(match.id);

          // Team → Roster mapping
          expect(event.homeRosterId).toBe(match.homeTeamId);
          expect(event.homeRosterName).toBe(match.homeTeam?.name);
          expect(event.awayRosterId).toBe(match.awayTeamId);
          expect(event.awayRosterName).toBe(match.awayTeam?.name);

          // scheduledAt preserved as ISO string
          expect(event.scheduledAt).toBe(
            typeof match.scheduledAt === 'string'
              ? match.scheduledAt
              : match.scheduledAt.toISOString(),
          );

          // round derived from match or defaults to 1
          expect(event.round).toBe(match.round ?? 1);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns an empty array for empty input', () => {
    expect(mapMatchesToScheduleEvents([])).toEqual([]);
  });

  it('defaults round to 1 when match.round is undefined', () => {
    fc.assert(
      fc.property(arbitraryMatch, (baseMatch) => {
        const match: Match = { ...baseMatch, round: undefined };
        const [event] = mapMatchesToScheduleEvents([match]);
        expect(event.round).toBe(1);
      }),
      { numRuns: 50 },
    );
  });
});
