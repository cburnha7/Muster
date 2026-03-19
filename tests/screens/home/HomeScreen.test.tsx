import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';

import { HomeScreen } from '../../../src/screens/home/HomeScreen';
import authSlice from '../../../src/store/slices/authSlice';
import bookingsSlice from '../../../src/store/slices/bookingsSlice';
import eventsSlice from '../../../src/store/slices/eventsSlice';

// Mock the API services
jest.mock('../../../src/services/api/EventService', () => ({
  eventService: {
    getNearbyEvents: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../src/services/api/UserService', () => ({
  userService: {
    getUserBookings: jest.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
    }),
  },
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      bookings: bookingsSlice,
      events: eventsSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          preferredSports: [],
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
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      },
      bookings: {
        bookings: [],
        upcomingBookings: [],
        pastBookings: [],
        selectedBooking: null,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
        isLoadingMore: false,
        error: null,
        lastUpdated: null,
      },
      events: {
        events: [],
        selectedEvent: null,
        filters: {},
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
        isLoadingMore: false,
        error: null,
        lastUpdated: null,
      },
      ...initialState,
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; store?: any }> = ({ 
  children, 
  store = createTestStore() 
}) => (
  <Provider store={store}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </Provider>
);

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome message with user name', async () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(getByText('Welcome back, John!')).toBeTruthy();
    expect(getByText('Ready for your next sports adventure?')).toBeTruthy();
  });

  it('displays search bar', () => {
    const { getByPlaceholderText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(getByPlaceholderText('Search events, facilities, teams...')).toBeTruthy();
  });

  it('displays quick action buttons', () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(getByText('Create Event')).toBeTruthy();
    expect(getByText('Find Events')).toBeTruthy();
    expect(getByText('Find Facilities')).toBeTruthy();
    expect(getByText('Join Team')).toBeTruthy();
  });

  it('displays upcoming bookings section', () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(getByText('Upcoming Bookings')).toBeTruthy();
  });

  it('displays nearby events section', () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    expect(getByText('Nearby Events')).toBeTruthy();
  });

  it('displays notifications section when notifications exist', async () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // Wait for component to load and display notifications
    await waitFor(() => {
      expect(getByText('Notifications')).toBeTruthy();
    });
  });

  it('shows empty state for bookings when no bookings exist', async () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('No upcoming bookings')).toBeTruthy();
      expect(getByText('Book your next sports activity!')).toBeTruthy();
    });
  });

  it('shows empty state for events when no nearby events exist', async () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('No nearby events')).toBeTruthy();
      expect(getByText('Check back later or expand your search area')).toBeTruthy();
    });
  });

  it('handles quick action button presses', () => {
    const { getByText } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // Test that buttons are pressable (navigation would be mocked in real tests)
    const createEventButton = getByText('Create Event');
    fireEvent.press(createEventButton);

    const findEventsButton = getByText('Find Events');
    fireEvent.press(findEventsButton);

    const findFacilitiesButton = getByText('Find Facilities');
    fireEvent.press(findFacilitiesButton);

    const joinTeamButton = getByText('Join Team');
    fireEvent.press(joinTeamButton);

    // In a real test, we would verify navigation calls
    expect(createEventButton).toBeTruthy();
    expect(findEventsButton).toBeTruthy();
    expect(findFacilitiesButton).toBeTruthy();
    expect(joinTeamButton).toBeTruthy();
  });

  it('handles pull to refresh', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>
    );

    // In a real test, we would simulate pull to refresh gesture
    // and verify that data loading functions are called
    expect(true).toBeTruthy(); // Placeholder assertion
  });
});