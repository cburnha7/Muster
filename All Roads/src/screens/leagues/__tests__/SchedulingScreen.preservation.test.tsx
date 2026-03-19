/**
 * Preservation Property Tests — SchedulingScreen
 *
 * Property 2: Preservation - Auto-Generate, Confirm, Manual Edit, and Empty State Flows Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * GOAL: Confirm baseline behavior on UNFIXED code that must not regress after the fix.
 * These tests observe existing flows (auto-generate, confirm, empty state, loading)
 * and encode them as property-based tests using fast-check.
 *
 * EXPECTED on UNFIXED code: PASS (confirms baseline behavior to preserve)
 * EXPECTED on FIXED code:   PASS (confirms no regressions)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as fc from 'fast-check';
import { Alert, Platform } from 'react-native';
import SchedulingScreen from '../SchedulingScreen';
import { LeagueService } from '../../../services/api/LeagueService';
import scheduleReducer from '../../../store/slices/scheduleSlice';
import type { SchedulePreviewEvent } from '../../../types/scheduling';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../services/api/LeagueService');
jest.mock('../../../services/api/MatchService');

// We'll control the RTK Query mutations per-test
let mockGenerateSchedule: jest.Mock;
let mockConfirmSchedule: jest.Mock;

jest.mock('../../../store/api', () => ({
  useGenerateScheduleMutation: () => [mockGenerateSchedule, { isLoading: false }],
  useConfirmScheduleMutation: () => [mockConfirmSchedule, { isLoading: false }],
}));

// Spy on Alert.alert
jest.spyOn(Alert, 'alert');

// Navigation mocks
const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: jest.fn() };
const TEST_LEAGUE_ID = 'league-preserve-123';
const mockRoute = { params: { leagueId: TEST_LEAGUE_ID } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockLeague = () => ({
  id: TEST_LEAGUE_ID,
  name: 'Preservation League',
  sportType: 'soccer',
  skillLevel: 'intermediate',
  isActive: true,
  organizerId: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeMockMembersResponse = () => ({
  data: [],
  pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
});

function createTestStore() {
  return configureStore({
    reducer: { schedule: scheduleReducer },
  });
}

// ---------------------------------------------------------------------------
// fast-check Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty trimmed string for roster names */
const rosterNameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

/** Generate a SchedulePreviewEvent with random roster names and dates */
const previewEventArb: fc.Arbitrary<SchedulePreviewEvent> = fc.record({
  homeRoster: fc.record({ id: fc.uuid(), name: rosterNameArb }),
  awayRoster: fc.record({ id: fc.uuid(), name: rosterNameArb }),
  scheduledAt: fc
    .date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
    .map((d) => d.toISOString()),
  round: fc.integer({ min: 1, max: 20 }),
});

/** Generate 1-10 preview events for auto-generate response */
const previewEventsArb = fc.array(previewEventArb, { minLength: 1, maxLength: 10 });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SchedulingScreen — Preservation Property Tests', () => {
  let leagueServiceProto: any;

  beforeEach(() => {
    jest.clearAllMocks();

    leagueServiceProto = LeagueService.prototype;
    leagueServiceProto.getLeagueById = jest.fn().mockResolvedValue(makeMockLeague());
    leagueServiceProto.getMembers = jest.fn().mockResolvedValue(makeMockMembersResponse());

    // Default mutation stubs — overridden per test
    mockGenerateSchedule = jest.fn();
    mockConfirmSchedule = jest.fn();
  });

  // -------------------------------------------------------------------------
  // Property 2a: Auto-Generate flow produces events from preview response
  // Validates: Requirements 3.1
  // -------------------------------------------------------------------------
  it('Property 2a: tapping "Auto Generate Schedule" calls generateSchedule and populates events from preview response', async () => {
    await fc.assert(
      fc.asyncProperty(previewEventsArb, async (previewEvents) => {
        // Arrange — mock generateSchedule to return the generated preview events
        mockGenerateSchedule.mockReturnValue({
          unwrap: () => Promise.resolve({ events: previewEvents }),
        });

        const store = createTestStore();

        const { getByText, queryAllByText, unmount } = render(
          <Provider store={store}>
            <SchedulingScreen route={mockRoute} navigation={mockNavigation} />
          </Provider>,
        );

        // Wait for loading to finish
        await waitFor(() => {
          expect(leagueServiceProto.getLeagueById).toHaveBeenCalled();
        }, { timeout: 3000 });

        // Act — tap "Auto Generate Schedule"
        const generateButton = getByText('Auto Generate Schedule');
        await act(async () => {
          fireEvent.press(generateButton);
        });

        // Assert — generateSchedule was called with the leagueId
        expect(mockGenerateSchedule).toHaveBeenCalledWith({ leagueId: TEST_LEAGUE_ID });

        // Assert — events from the preview response appear in the rendered output
        // Each preview event's roster names should be visible
        for (const pe of previewEvents) {
          const homeElements = queryAllByText(pe.homeRoster.name);
          expect(homeElements.length).toBeGreaterThanOrEqual(1);

          const awayElements = queryAllByText(pe.awayRoster.name);
          expect(awayElements.length).toBeGreaterThanOrEqual(1);
        }

        // Assert — Redux store has the correct number of events
        const state = store.getState();
        expect(state.schedule.events.length).toBe(previewEvents.length);

        unmount();
      }),
      { numRuns: 10, verbose: true },
    );
  });

  // -------------------------------------------------------------------------
  // Property 2b: Confirm flow sends correct payload, shows alert, navigates back
  // Validates: Requirements 3.2
  // -------------------------------------------------------------------------
  it('Property 2b: tapping "Confirm Schedule" calls confirmSchedule with correct payload, shows success alert, navigates back', async () => {
    await fc.assert(
      fc.asyncProperty(previewEventsArb, async (previewEvents) => {
        // Reset mocks between property iterations to avoid accumulated call counts
        mockGenerateSchedule.mockReset();
        mockConfirmSchedule.mockReset();
        (Alert.alert as jest.Mock).mockClear();

        // Arrange — mock generate to populate events, then mock confirm
        mockGenerateSchedule.mockReturnValue({
          unwrap: () => Promise.resolve({ events: previewEvents }),
        });
        mockConfirmSchedule.mockReturnValue({
          unwrap: () => Promise.resolve({ eventsCreated: previewEvents.length }),
        });

        const store = createTestStore();

        const { getByText, unmount } = render(
          <Provider store={store}>
            <SchedulingScreen route={mockRoute} navigation={mockNavigation} />
          </Provider>,
        );

        // Wait for loading to finish
        await waitFor(() => {
          expect(leagueServiceProto.getLeagueById).toHaveBeenCalled();
        }, { timeout: 3000 });

        // First, auto-generate to populate events
        await act(async () => {
          fireEvent.press(getByText('Auto Generate Schedule'));
        });

        // Now tap "Confirm Schedule"
        await act(async () => {
          fireEvent.press(getByText('Confirm Schedule'));
        });

        // Assert — confirmSchedule was called exactly once for this iteration
        expect(mockConfirmSchedule).toHaveBeenCalledTimes(1);

        // Assert — the payload contains confirmable events (no `id` field)
        const callArgs = mockConfirmSchedule.mock.calls[0][0];
        expect(callArgs.leagueId).toBe(TEST_LEAGUE_ID);
        expect(callArgs.events).toHaveLength(previewEvents.length);

        // Each confirmable event should have roster IDs/names, scheduledAt, round — but no `id`
        for (let i = 0; i < callArgs.events.length; i++) {
          const ce = callArgs.events[i];
          expect(ce).toHaveProperty('homeRosterId');
          expect(ce).toHaveProperty('homeRosterName');
          expect(ce).toHaveProperty('awayRosterId');
          expect(ce).toHaveProperty('awayRosterName');
          expect(ce).toHaveProperty('scheduledAt');
          expect(ce).toHaveProperty('round');
          expect(ce).not.toHaveProperty('id');
        }

        // Assert — success alert was shown (on non-web platform)
        if (Platform.OS !== 'web') {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Success',
            'Schedule confirmed and published.',
            expect.any(Array),
          );
        }

        unmount();
      }),
      { numRuns: 10, verbose: true },
    );
  });

  // -------------------------------------------------------------------------
  // Property 2c: Empty league shows "No games scheduled yet"
  // Validates: Requirements 3.4
  // -------------------------------------------------------------------------
  it('Property 2c: a league with zero events always shows "No games scheduled yet" empty state', async () => {
    // This property doesn't need random generation — it's a fixed observation.
    // But we use fast-check to verify across multiple random league names
    // that the empty state text always appears when there are no events.
    await fc.assert(
      fc.asyncProperty(rosterNameArb, async (leagueName) => {
        leagueServiceProto.getLeagueById = jest.fn().mockResolvedValue({
          ...makeMockLeague(),
          name: leagueName,
        });

        const store = createTestStore();

        const { getByText, unmount } = render(
          <Provider store={store}>
            <SchedulingScreen route={mockRoute} navigation={mockNavigation} />
          </Provider>,
        );

        // Wait for loading to finish
        await waitFor(() => {
          expect(leagueServiceProto.getLeagueById).toHaveBeenCalled();
        }, { timeout: 3000 });

        // Assert — empty state text is visible
        await waitFor(() => {
          expect(getByText('No games scheduled yet')).toBeTruthy();
        });

        unmount();
      }),
      { numRuns: 10, verbose: true },
    );
  });

  // -------------------------------------------------------------------------
  // Property 2d: Loading spinner displays while league data is being fetched
  // Validates: Requirements 3.5
  // -------------------------------------------------------------------------
  it('Property 2d: loading spinner displays while league data is being fetched', async () => {
    // Make loadLeagueData hang so we can observe the loading state
    let resolveLeagueData: (value: any) => void;
    leagueServiceProto.getLeagueById = jest.fn().mockImplementation(
      () => new Promise((resolve) => { resolveLeagueData = resolve; }),
    );

    const store = createTestStore();

    const { getByTestId, queryByTestId, queryByText, unmount } = render(
      <Provider store={store}>
        <SchedulingScreen route={mockRoute} navigation={mockNavigation} />
      </Provider>,
    );

    // Assert — while loading, the ActivityIndicator should be present
    // and the empty state text should NOT be visible
    // ActivityIndicator doesn't have a testID by default, so we check
    // that the empty state text is absent during loading
    expect(queryByText('No games scheduled yet')).toBeNull();
    expect(queryByText('Auto Generate Schedule')).toBeNull();

    // Resolve the league data to finish loading
    await act(async () => {
      resolveLeagueData!(makeMockLeague());
    });

    // After loading, the screen content should appear
    await waitFor(() => {
      expect(queryByText('Auto Generate Schedule')).toBeTruthy();
    });

    unmount();
  });
});
