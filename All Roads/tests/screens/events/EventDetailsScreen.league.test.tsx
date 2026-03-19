import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventDetailsScreen } from '../../../src/screens/events/EventDetailsScreen';
import eventsReducer from '../../../src/store/slices/eventsSlice';
import authReducer from '../../../src/store/slices/authSlice';
import { Event, EventStatus, EventType, SkillLevel, SportType } from '../../../src/types';
import type { Match } from '../../../src/types/league';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { eventId: 'event-1' },
    }),
    useFocusEffect: (callback: () => void) => {
      callback();
    },
  };
});

// Mock services
jest.mock('../../../src/services/api/EventService', () => ({
  eventService: {
    getEvent: jest.fn(),
    getEventParticipants: jest.fn(),
    bookEvent: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

jest.mock('../../../src/services/mock', () => ({
  MockData: {
    events: [],
  },
}));

describe('EventDetailsScreen - League Context', () => {
  const createMockStore = (eventWithMatch?: Event) => {
    return configureStore({
      reducer: {
        events: eventsReducer,
        auth: authReducer,
      },
      preloadedState: {
        events: {
          events: eventWithMatch ? [eventWithMatch] : [],
          selectedEvent: eventWithMatch || null,
          loading: false,
          error: null,
        },
        auth: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            preferredSports: [SportType.BASKETBALL],
            notificationPreferences: {
              eventReminders: true,
              eventUpdates: true,
              newEventAlerts: true,
              marketingEmails: false,
              pushNotifications: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'test-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      },
    });
  };

  const mockMatch: Match = {
    id: 'match-1',
    leagueId: 'league-1',
    league: {
      id: 'league-1',
      name: 'Summer Basketball League',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      isActive: true,
      pointsConfig: { win: 3, draw: 1, loss: 0 },
      isCertified: true,
      organizerId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    homeTeam: {
      id: 'team-1',
      name: 'Warriors',
      sportType: SportType.BASKETBALL,
      skillLevel: SkillLevel.INTERMEDIATE,
      captainId: 'user-1',
      memberCount: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    awayTeam: {
      id: 'team-2',
      name: 'Lakers',
      sportType: SportType.BASKETBALL,
      skillLevel: SkillLevel.INTERMEDIATE,
      captainId: 'user-2',
      memberCount: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    scheduledAt: new Date('2024-06-15T18:00:00'),
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventWithMatch: Event = {
    id: 'event-1',
    title: 'League Match: Warriors vs Lakers',
    description: 'Exciting league match',
    sportType: SportType.BASKETBALL,
    facilityId: 'facility-1',
    organizerId: 'user-1',
    startTime: new Date('2024-06-15T18:00:00'),
    endTime: new Date('2024-06-15T20:00:00'),
    maxParticipants: 20,
    currentParticipants: 15,
    price: 0,
    currency: 'USD',
    skillLevel: SkillLevel.INTERMEDIATE,
    equipment: ['Basketball'],
    status: EventStatus.ACTIVE,
    eventType: EventType.GAME,
    participants: [],
    matches: [mockMatch],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });
  });

  it('should display league match badge when event has a linked match', () => {
    const store = createMockStore(mockEventWithMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('LEAGUE MATCH')).toBeTruthy();
  });

  it('should display league name', () => {
    const store = createMockStore(mockEventWithMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('Summer Basketball League')).toBeTruthy();
  });

  it('should display team names', () => {
    const store = createMockStore(mockEventWithMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('Warriors')).toBeTruthy();
    expect(screen.getByText('Lakers')).toBeTruthy();
    expect(screen.getByText('vs')).toBeTruthy();
  });

  it('should display match status', () => {
    const store = createMockStore(mockEventWithMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('scheduled')).toBeTruthy();
  });

  it('should navigate to league details when pressed', () => {
    const store = createMockStore(mockEventWithMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    const leagueSection = screen.getByText('Summer Basketball League').parent?.parent;
    if (leagueSection) {
      fireEvent.press(leagueSection);
      expect(mockNavigate).toHaveBeenCalledWith('LeagueDetails', { leagueId: 'league-1' });
    }
  });

  it('should display match scores when available', () => {
    const matchWithScores: Match = {
      ...mockMatch,
      homeScore: 85,
      awayScore: 78,
      status: 'completed',
    };

    const eventWithScores: Event = {
      ...mockEventWithMatch,
      matches: [matchWithScores],
    };

    const store = createMockStore(eventWithScores);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.getByText('78')).toBeTruthy();
  });

  it('should not display league section when event has no matches', () => {
    const eventWithoutMatch: Event = {
      ...mockEventWithMatch,
      matches: undefined,
    };

    const store = createMockStore(eventWithoutMatch);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.queryByText('LEAGUE MATCH')).toBeNull();
  });

  it('should handle match without league details gracefully', () => {
    const matchWithoutLeague: Match = {
      ...mockMatch,
      league: undefined,
    };

    const eventWithMatchNoLeague: Event = {
      ...mockEventWithMatch,
      matches: [matchWithoutLeague],
    };

    const store = createMockStore(eventWithMatchNoLeague);

    render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );

    expect(screen.getByText('LEAGUE MATCH')).toBeTruthy();
    expect(screen.getByText('League Match')).toBeTruthy(); // Fallback name
  });
});
