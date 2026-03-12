import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateEventScreen } from '../../../src/screens/events/CreateEventScreen';
import eventsReducer from '../../../src/store/slices/eventsSlice';
import teamsReducer from '../../../src/store/slices/teamsSlice';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: any = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
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
          address: '123 Test St',
          sportTypes: ['basketball'],
        },
      ],
    }),
  },
}));

// Mock fetch for rental details
global.fetch = jest.fn();

const mockRentalData = {
  id: 'rental-1',
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

describe('CreateEventScreen - Locked Fields from Rental', () => {
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
  });

  it('should display rental banner when creating from rental', async () => {
    mockRouteParams = { rentalId: 'rental-1' };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentalData,
    });

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for rental details to load
    await waitFor(() => {
      expect(getByText('Creating Event from Rental')).toBeTruthy();
    });

    // Verify rental info is displayed
    expect(getByText('Court 1 at Test Facility')).toBeTruthy();
    expect(getByText('Location and time are locked to match your rental slot')).toBeTruthy();
  });

  it('should display info box explaining locked fields', async () => {
    mockRouteParams = { rentalId: 'rental-1' };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentalData,
    });

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for rental details to load
    await waitFor(() => {
      expect(getByText('Creating Event from Rental')).toBeTruthy();
    });

    // Verify info box is displayed
    expect(getByText(/Location, date, and time are locked to match your rental slot and cannot be changed/)).toBeTruthy();
  });

  it('should pre-fill form fields with rental details', async () => {
    mockRouteParams = { rentalId: 'rental-1' };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentalData,
    });

    const { getByDisplayValue } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for rental details to load and form to be pre-filled
    await waitFor(() => {
      expect(getByDisplayValue('basketball at Test Facility')).toBeTruthy();
    });

    expect(getByDisplayValue('Event at Court 1')).toBeTruthy();
    expect(getByDisplayValue('14:00')).toBeTruthy();
    expect(getByDisplayValue('120')).toBeTruthy(); // 2 hours duration
  });

  it('should not display rental banner when creating without rental', async () => {
    mockRouteParams = {};

    const { queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <CreateEventScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for facilities to load
    await waitFor(() => {
      expect(queryByText('Create Event')).toBeTruthy();
    });

    // Verify rental banner is not displayed
    expect(queryByText('Creating Event from Rental')).toBeNull();
    expect(queryByText(/Location and time are locked/)).toBeNull();
  });
});
