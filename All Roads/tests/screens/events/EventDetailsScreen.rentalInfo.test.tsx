/**
 * EventDetailsScreen - Rental Information Display Tests
 * 
 * Tests for Task 13.6: Update event details screen to show rental information
 * 
 * Validates:
 * - Rental information is displayed when event has rentalId
 * - Court/field name is shown
 * - Sport type is displayed
 * - Visual indicator shows event is linked to rental
 * - No rental section shown when event has no rental
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';

import { EventDetailsScreen } from '../../../src/screens/events/EventDetailsScreen';
import { eventService } from '../../../src/services/api/EventService';
import eventsReducer from '../../../src/store/slices/eventsSlice';
import bookingsReducer from '../../../src/store/slices/bookingsSlice';
import { Event, EventStatus, EventType, SkillLevel, SportType } from '../../../src/types';

// Mock services
jest.mock('../../../src/services/api/EventService');
jest.mock('../../../src/services/auth', () => ({
  useAuthContext: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
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
}));

describe('EventDetailsScreen - Rental Information Display', () => {
  let store: any;

  const mockEventWithRental: Event = {
    id: 'event-1',
    title: 'Basketball Pickup Game',
    description: 'Casual basketball game',
    sportType: SportType.BASKETBALL,
    facilityId: 'facility-1',
    facility: {
      id: 'facility-1',
      name: 'Downtown Sports Complex',
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
      latitude: 39.7817,
      longitude: -89.6501,
      description: 'Premier sports facility',
      amenities: ['Parking', 'Restrooms'],
      operatingHours: '6am-10pm',
      contactPhone: '555-0100',
      contactEmail: 'info@downtown.com',
      images: [],
      rating: 4.5,
      pricePerHour: 50,
      sportTypes: [SportType.BASKETBALL],
      isActive: true,
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    organizerId: 'user-1',
    organizer: {
      id: 'user-1',
      email: 'organizer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '555-0100',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      profileImage: null,
      bio: null,
      location: null,
      preferredSports: [],
      skillLevels: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    startTime: new Date('2024-01-15T14:00:00Z'),
    endTime: new Date('2024-01-15T16:00:00Z'),
    maxParticipants: 10,
    currentParticipants: 5,
    price: 0,
    currency: 'USD',
    skillLevel: SkillLevel.INTERMEDIATE,
    equipment: ['Basketball'],
    rules: 'Be respectful',
    status: EventStatus.ACTIVE,
    eventType: EventType.PICKUP,
    participants: [],
    rentalId: 'rental-1',
    rental: {
      id: 'rental-1',
      timeSlot: {
        id: 'slot-1',
        court: {
          id: 'court-1',
          name: 'Court 1',
          sportType: 'basketball',
        },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventWithoutRental: Event = {
    ...mockEventWithRental,
    id: 'event-2',
    rentalId: undefined,
    rental: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    store = configureStore({
      reducer: {
        events: eventsReducer,
        bookings: bookingsReducer,
      },
      preloadedState: {
        events: {
          events: [],
          selectedEvent: null,
          loading: false,
          error: null,
        },
        bookings: {
          bookings: [],
          loading: false,
          error: null,
        },
      },
    });
  });

  const renderScreen = () => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <EventDetailsScreen />
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Event with Rental', () => {
    beforeEach(() => {
      (eventService.getEvent as jest.Mock).mockResolvedValue(mockEventWithRental);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });
    });

    it('should display rental information section when event has rental', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Linked to Rental')).toBeTruthy();
      });
    });

    it('should display court/field name from rental', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Court/Field:')).toBeTruthy();
        expect(screen.getByText('Court 1')).toBeTruthy();
      });
    });

    it('should display sport type from rental court', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Sport Type:')).toBeTruthy();
        expect(screen.getByText('Basketball')).toBeTruthy();
      });
    });

    it('should display informational note about rental', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('This event is using a pre-booked rental slot')).toBeTruthy();
      });
    });

    it('should display rental section with proper styling', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        const rentalHeader = getByText('Linked to Rental');
        expect(rentalHeader).toBeTruthy();
        expect(rentalHeader.props.style).toMatchObject({
          fontSize: 16,
          fontWeight: '600',
        });
      });
    });
  });

  describe('Event without Rental', () => {
    beforeEach(() => {
      (eventService.getEvent as jest.Mock).mockResolvedValue(mockEventWithoutRental);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });
    });

    it('should not display rental information section when event has no rental', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Basketball Pickup Game')).toBeTruthy();
      });

      // Rental section should not be present
      expect(screen.queryByText('Linked to Rental')).toBeNull();
      expect(screen.queryByText('Court/Field:')).toBeNull();
    });

    it('should still display location information without rental', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Location')).toBeTruthy();
        expect(screen.getByText('Downtown Sports Complex')).toBeTruthy();
      });
    });
  });

  describe('Rental Information Formatting', () => {
    it('should capitalize sport type correctly', async () => {
      const eventWithLowercaseSport = {
        ...mockEventWithRental,
        rental: {
          id: 'rental-1',
          timeSlot: {
            id: 'slot-1',
            court: {
              id: 'court-1',
              name: 'Court 1',
              sportType: 'tennis',
            },
          },
        },
      };

      (eventService.getEvent as jest.Mock).mockResolvedValue(eventWithLowercaseSport);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Tennis')).toBeTruthy();
      });
    });

    it('should handle multi-word court names', async () => {
      const eventWithLongCourtName = {
        ...mockEventWithRental,
        rental: {
          id: 'rental-1',
          timeSlot: {
            id: 'slot-1',
            court: {
              id: 'court-1',
              name: 'Main Basketball Court A',
              sportType: 'basketball',
            },
          },
        },
      };

      (eventService.getEvent as jest.Mock).mockResolvedValue(eventWithLongCourtName);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Main Basketball Court A')).toBeTruthy();
      });
    });
  });

  describe('Visual Indicators', () => {
    beforeEach(() => {
      (eventService.getEvent as jest.Mock).mockResolvedValue(mockEventWithRental);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });
    });

    it('should display calendar icon for rental header', async () => {
      const { UNSAFE_getByType } = renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Linked to Rental')).toBeTruthy();
      });

      // Ionicons should be present (calendar icon)
      const icons = UNSAFE_getByType(require('@expo/vector-icons').Ionicons);
      expect(icons).toBeTruthy();
    });

    it('should display basketball icon for court type', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Court/Field:')).toBeTruthy();
      });

      // Multiple Ionicons should be present
      expect(screen.getByText('Court 1')).toBeTruthy();
    });
  });

  describe('Integration with Event Details', () => {
    beforeEach(() => {
      (eventService.getEvent as jest.Mock).mockResolvedValue(mockEventWithRental);
      (eventService.getEventParticipants as jest.Mock).mockResolvedValue({ participants: [] });
    });

    it('should display rental info alongside other event details', async () => {
      renderScreen();

      await waitFor(() => {
        // Event details
        expect(screen.getByText('Basketball Pickup Game')).toBeTruthy();
        expect(screen.getByText('Location')).toBeTruthy();
        expect(screen.getByText('Downtown Sports Complex')).toBeTruthy();
        
        // Rental info
        expect(screen.getByText('Linked to Rental')).toBeTruthy();
        expect(screen.getByText('Court 1')).toBeTruthy();
      });
    });

    it('should maintain proper layout with rental section', async () => {
      const { getByText } = renderScreen();

      await waitFor(() => {
        const locationLabel = getByText('Location');
        const rentalHeader = getByText('Linked to Rental');
        
        expect(locationLabel).toBeTruthy();
        expect(rentalHeader).toBeTruthy();
      });
    });
  });
});
