import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { MyRentalsScreen } from '../../../src/screens/facilities/MyRentalsScreen';
import { NavigationContainer } from '@react-navigation/native';

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
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('MyRentalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders loading state initially', () => {
    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    expect(screen.getByText('Loading your rentals...')).toBeTruthy();
  });

  it('renders empty state when no rentals', async () => {
    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('My Rentals')).toBeTruthy();
      expect(screen.getByText('No Upcoming Rentals')).toBeTruthy();
      expect(screen.getByText('No Past Rentals')).toBeTruthy();
    });
  });

  it('fetches rentals on mount', async () => {
    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/my-rentals')
      );
    });
  });

  it('displays upcoming rentals section', async () => {
    const mockRentals = [
      {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 50,
        paymentStatus: 'paid',
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date(),
        timeSlot: {
          id: 'slot-1',
          date: new Date(Date.now() + 86400000), // Tomorrow
          startTime: '10:00',
          endTime: '11:00',
          price: 50,
          court: {
            id: 'court-1',
            name: 'Court 1',
            sportType: 'Basketball',
            facility: {
              id: 'facility-1',
              name: 'Test Facility',
              street: '123 Main St',
              city: 'Test City',
              state: 'TS',
            },
          },
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentals,
    });

    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeTruthy();
      expect(screen.getByText('Court 1')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
    });
  });

  it('displays past rentals section', async () => {
    const mockRentals = [
      {
        id: 'rental-1',
        status: 'completed',
        totalPrice: 50,
        paymentStatus: 'paid',
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date(),
        timeSlot: {
          id: 'slot-1',
          date: new Date(Date.now() - 86400000), // Yesterday
          startTime: '10:00',
          endTime: '11:00',
          price: 50,
          court: {
            id: 'court-1',
            name: 'Court 1',
            sportType: 'Basketball',
            facility: {
              id: 'facility-1',
              name: 'Test Facility',
              street: '123 Main St',
              city: 'Test City',
              state: 'TS',
            },
          },
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentals,
    });

    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeTruthy();
      expect(screen.getByText('COMPLETED')).toBeTruthy();
    });
  });

  it('separates upcoming and past rentals correctly', async () => {
    const mockRentals = [
      {
        id: 'rental-1',
        status: 'confirmed',
        totalPrice: 50,
        paymentStatus: 'paid',
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date(),
        timeSlot: {
          id: 'slot-1',
          date: new Date(Date.now() + 86400000), // Tomorrow
          startTime: '10:00',
          endTime: '11:00',
          price: 50,
          court: {
            id: 'court-1',
            name: 'Court 1',
            sportType: 'Basketball',
            facility: {
              id: 'facility-1',
              name: 'Future Facility',
              street: '123 Main St',
              city: 'Test City',
              state: 'TS',
            },
          },
        },
      },
      {
        id: 'rental-2',
        status: 'completed',
        totalPrice: 40,
        paymentStatus: 'paid',
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date(),
        timeSlot: {
          id: 'slot-2',
          date: new Date(Date.now() - 86400000), // Yesterday
          startTime: '14:00',
          endTime: '15:00',
          price: 40,
          court: {
            id: 'court-2',
            name: 'Court 2',
            sportType: 'Tennis',
            facility: {
              id: 'facility-2',
              name: 'Past Facility',
              street: '456 Oak Ave',
              city: 'Test City',
              state: 'TS',
            },
          },
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRentals,
    });

    render(
      <NavigationContainer>
        <MyRentalsScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('Future Facility')).toBeTruthy();
      expect(screen.getByText('Past Facility')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
      expect(screen.getByText('COMPLETED')).toBeTruthy();
    });
  });
});
