import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CreateEventScreen } from '../../../src/screens/events/CreateEventScreen';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer from '../../../src/store/slices/eventsSlice';
import teamsReducer from '../../../src/store/slices/teamsSlice';
import { Alert } from 'react-native';

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
      params: {
        rentalId: 'test-rental-id',
      },
    }),
  };
});

// Mock services
jest.mock('../../../src/services/api/EventService', () => ({
  eventService: {
    createEvent: jest.fn(),
  },
}));

jest.mock('../../../src/services/api/FacilityService', () => ({
  facilityService: {
    getFacilities: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'facility-1',
          name: 'Test Facility',
        },
      ],
    }),
  },
}));

// Mock fetch for rental details
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockRentalData = {
  id: 'test-rental-id',
  timeSlot: {
    id: 'slot-1',
    date: new Date('2024-12-25T00:00:00Z'),
    startTime: '14:00',
    endTime: '16:00',
    court: {
      id: 'court-1',
      name: 'Court 1',
      sportType: 'basketball',
      facility: {
        id: 'facility-1',
        name: 'Test Facility',
      },
    },
  },
};

describe('CreateEventScreen - Rental Pre-fill', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    store = configureStore({
      reducer: {
        events: eventsReducer,
        teams: teamsReducer,
      },
      preloadedState: {
        teams: {
          teams: [],
          userTeams: [],
          loading: false,
          error: null,
        },
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentalData,
    });
  });

  it('should fetch rental details when rentalId is provided', async () => {
    render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/test-rental-id')
      );
    });
  });

  it('should pre-fill form with rental details', async () => {
    const { getByDisplayValue } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      // Check if title is pre-filled
      expect(getByDisplayValue('basketball at Test Facility')).toBeTruthy();
    });

    await waitFor(() => {
      // Check if description is pre-filled
      expect(getByDisplayValue('Event at Court 1')).toBeTruthy();
    });

    await waitFor(() => {
      // Check if start time is pre-filled
      expect(getByDisplayValue('14:00')).toBeTruthy();
    });

    await waitFor(() => {
      // Check if duration is pre-filled (120 minutes = 2 hours)
      expect(getByDisplayValue('120')).toBeTruthy();
    });
  });

  it('should show rental banner when creating from rental', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Creating Event from Rental')).toBeTruthy();
      expect(getByText('Court 1 at Test Facility')).toBeTruthy();
      expect(getByText('Location and time are locked to match your rental slot')).toBeTruthy();
    });
  });

  it('should handle rental fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load rental details. Please try again.',
        expect.any(Array)
      );
    });
  });
});
