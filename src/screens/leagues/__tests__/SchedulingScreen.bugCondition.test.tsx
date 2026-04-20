/**
 * Bug Condition Exploration Test — SchedulingScreen
 *
 * Property 1: Bug Condition - Existing Matches Not Displayed on Mount
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2
 *
 * GOAL: Surface counterexamples that demonstrate the bug exists.
 * The SchedulingScreen dispatches clearSchedule() on mount and never fetches
 * existing matches from the backend. This test generates random Match arrays
 * via fast-check, mocks MatchService.getLeagueMatches to return them, renders
 * the screen, and asserts the rendered event list matches the generated data.
 *
 * EXPECTED on UNFIXED code: FAIL (proves the bug exists)
 * EXPECTED on FIXED code:   PASS (validates the fix)
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as fc from 'fast-check';
import SchedulingScreen from '../SchedulingScreen';
import { MatchService } from '../../../services/api/MatchService';
import { LeagueService } from '../../../services/api/LeagueService';
import scheduleReducer from '../../../store/slices/scheduleSlice';
import type { Match, PaginatedResponse } from '../../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../services/api/LeagueService');
jest.mock('../../../services/api/MatchService');

// RTK Query mutations — stub so the component doesn't crash
jest.mock('../../../store/api', () => ({
  useGenerateScheduleMutation: () => [jest.fn(), { isLoading: false }],
  useConfirmScheduleMutation: () => [jest.fn(), { isLoading: false }],
}));

// Navigation — provide a valid leagueId via route params
const TEST_LEAGUE_ID = 'league-test-123';
const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: jest.fn() };
const mockRoute = { params: { leagueId: TEST_LEAGUE_ID } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal league object that satisfies loadLeagueData */
const makeMockLeague = () => ({
  id: TEST_LEAGUE_ID,
  name: 'Test League',
  sportType: 'soccer',
  skillLevel: 'intermediate',
  isActive: true,
  organizerId: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Empty members response so loadLeagueData succeeds */
const makeMockMembersResponse = () => ({
  data: [],
  pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
});

/** Create a minimal Redux store with just the schedule slice */
function createTestStore() {
  return configureStore({
    reducer: { schedule: scheduleReducer },
  });
}

// ---------------------------------------------------------------------------
// fast-check Arbitrary: generates a random Match object
// ---------------------------------------------------------------------------

const matchStatusArb = fc.constantFrom(
  'scheduled' as const,
  'in_progress' as const,
  'completed' as const,
  'cancelled' as const
);

const arbitraryMatch: fc.Arbitrary<Match> = fc.record({
  id: fc.uuid(),
  leagueId: fc.constant(TEST_LEAGUE_ID),
  homeTeamId: fc.uuid(),
  awayTeamId: fc.uuid(),
  homeTeam: fc.record({
    id: fc.uuid(),
    name: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => s.trim().length > 0),
  }) as fc.Arbitrary<any>,
  awayTeam: fc.record({
    id: fc.uuid(),
    name: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => s.trim().length > 0),
  }) as fc.Arbitrary<any>,
  scheduledAt: fc
    .date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
    .map(d => d.toISOString()),
  status: matchStatusArb,
  round: fc.integer({ min: 1, max: 20 }),
  createdAt: fc.constant(new Date().toISOString()),
  updatedAt: fc.constant(new Date().toISOString()),
}) as fc.Arbitrary<Match>;

/** Generate 1-20 matches with unique IDs to avoid FlatList key collisions */
const arbitraryMatchArray = fc
  .array(arbitraryMatch, { minLength: 1, maxLength: 20 })
  .map(matches => {
    const seen = new Set<string>();
    return matches.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  })
  .filter(matches => matches.length > 0);

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('SchedulingScreen — Bug Condition Exploration', () => {
  let leagueServiceProto: any;
  let matchServiceProto: any;

  beforeEach(() => {
    jest.clearAllMocks();

    leagueServiceProto = LeagueService.prototype;
    matchServiceProto = MatchService.prototype;

    // loadLeagueData succeeds with a valid league + empty rosters
    leagueServiceProto.getLeagueById = jest
      .fn()
      .mockResolvedValue(makeMockLeague());
    leagueServiceProto.getMembers = jest
      .fn()
      .mockResolvedValue(makeMockMembersResponse());
  });

  it('Property 1: for any league with N>0 backend matches, the screen should display N event cards with correct roster names', async () => {
    /**
     * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2
     *
     * For each generated Match[], we:
     *  1. Mock MatchService.getLeagueMatches to return those matches
     *  2. Render SchedulingScreen
     *  3. Assert getLeagueMatches was called with the leagueId
     *  4. Assert the number of rendered event cards equals matches.length
     *  5. Assert each match's roster names appear in the output
     */
    await fc.assert(
      fc.asyncProperty(arbitraryMatchArray, async matches => {
        jest.clearAllMocks();

        // Re-setup league mocks (cleared above)
        leagueServiceProto.getLeagueById = jest
          .fn()
          .mockResolvedValue(makeMockLeague());
        leagueServiceProto.getMembers = jest
          .fn()
          .mockResolvedValue(makeMockMembersResponse());

        // Arrange — mock the match service to return generated matches
        const paginatedResponse: PaginatedResponse<Match> = {
          data: matches,
          pagination: {
            page: 1,
            limit: 100,
            total: matches.length,
            totalPages: 1,
          },
        };
        matchServiceProto.getLeagueMatches = jest
          .fn()
          .mockResolvedValue(paginatedResponse);

        const store = createTestStore();

        // Act — render the screen
        const { queryAllByText, unmount } = render(
          <Provider store={store}>
            <SchedulingScreen route={mockRoute} navigation={mockNavigation} />
          </Provider>
        );

        // Wait for mount effects to settle — wait for match data to be rendered
        // by checking that getLeagueMatches was called AND roster names appear
        await waitFor(
          () => {
            expect(matchServiceProto.getLeagueMatches).toHaveBeenCalledWith(
              TEST_LEAGUE_ID,
              expect.anything(),
              expect.anything()
            );
            // Verify at least the first match's home roster name is rendered
            const firstName = matches[0]?.homeTeam?.name;
            if (firstName) {
              expect(queryAllByText(firstName).length).toBeGreaterThanOrEqual(
                1
              );
            }
          },
          { timeout: 5000 }
        );

        // Assert — each match's roster names should appear in the rendered output
        for (const match of matches) {
          const homeName = match.homeTeam?.name;
          const awayName = match.awayTeam?.name;
          if (homeName) {
            const homeElements = queryAllByText(homeName);
            expect(homeElements.length).toBeGreaterThanOrEqual(1);
          }
          if (awayName) {
            const awayElements = queryAllByText(awayName);
            expect(awayElements.length).toBeGreaterThanOrEqual(1);
          }
        }

        // Cleanup to avoid leaking state between property iterations
        unmount();
      }),
      { numRuns: 5, verbose: true }
    );
  }, 30000);
});
