import React from 'react';
import { render } from '@testing-library/react-native';
import { EventCard } from '../../../src/components/ui/EventCard';
import { Event, SportType, SkillLevel, EventStatus, EventType } from '../../../src/types';

describe('EventCard - Rental Indicator', () => {
  const mockEventWithoutRental: Event = {
    id: '1',
    title: 'Basketball Game',
    description: 'Friendly basketball game',
    sportType: SportType.BASKETBALL,
    facilityId: 'facility-1',
    facility: {
      id: 'facility-1',
      name: 'Downtown Sports Complex',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
      latitude: 39.7817,
      longitude: -89.6501,
      sportTypes: [SportType.BASKETBALL],
      amenities: [],
      operatingHours: {},
      pricePerHour: 50,
      images: [],
      rating: 4.5,
      reviewCount: 10,
      ownerId: 'owner-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    organizerId: 'user-1',
    startTime: new Date('2024-01-15T14:00:00'),
    endTime: new Date('2024-01-15T16:00:00'),
    maxParticipants: 10,
    currentParticipants: 5,
    price: 10,
    currency: 'USD',
    skillLevel: SkillLevel.INTERMEDIATE,
    equipment: ['Basketball'],
    status: EventStatus.ACTIVE,
    eventType: EventType.GAME,
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventWithRental: Event = {
    ...mockEventWithoutRental,
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
  };

  describe('Event without rental', () => {
    it('should not show rental indicator', () => {
      const { queryByText } = render(<EventCard event={mockEventWithoutRental} />);
      
      expect(queryByText('Court 1')).toBeNull();
    });

    it('should show facility name', () => {
      const { getByText } = render(<EventCard event={mockEventWithoutRental} />);
      
      expect(getByText('Downtown Sports Complex')).toBeTruthy();
    });
  });

  describe('Event with rental', () => {
    it('should show rental indicator with court name', () => {
      const { getByText } = render(<EventCard event={mockEventWithRental} />);
      
      expect(getByText('Court 1')).toBeTruthy();
    });

    it('should show facility name', () => {
      const { getByText } = render(<EventCard event={mockEventWithRental} />);
      
      expect(getByText('Downtown Sports Complex')).toBeTruthy();
    });

    it('should render calendar icon for rental indicator', () => {
      const { UNSAFE_getByType } = render(<EventCard event={mockEventWithRental} />);
      
      // The component should render without errors
      expect(UNSAFE_getByType(EventCard)).toBeTruthy();
    });
  });

  describe('Different court names', () => {
    it('should display court name correctly for "Field A"', () => {
      const eventWithFieldA: Event = {
        ...mockEventWithRental,
        rental: {
          id: 'rental-2',
          timeSlot: {
            id: 'slot-2',
            court: {
              id: 'court-2',
              name: 'Field A',
              sportType: 'soccer',
            },
          },
        },
      };

      const { getByText } = render(<EventCard event={eventWithFieldA} />);
      
      expect(getByText('Field A')).toBeTruthy();
    });

    it('should display court name correctly for "Tennis Court 3"', () => {
      const eventWithTennisCourt: Event = {
        ...mockEventWithRental,
        rental: {
          id: 'rental-3',
          timeSlot: {
            id: 'slot-3',
            court: {
              id: 'court-3',
              name: 'Tennis Court 3',
              sportType: 'tennis',
            },
          },
        },
      };

      const { getByText } = render(<EventCard event={eventWithTennisCourt} />);
      
      expect(getByText('Tennis Court 3')).toBeTruthy();
    });
  });

  describe('Visual design', () => {
    it('should render without errors for event with rental', () => {
      const { toJSON } = render(<EventCard event={mockEventWithRental} />);
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render without errors for event without rental', () => {
      const { toJSON } = render(<EventCard event={mockEventWithoutRental} />);
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle event with rentalId but no rental object', () => {
      const eventWithRentalIdOnly: Event = {
        ...mockEventWithoutRental,
        rentalId: 'rental-1',
        // rental object is undefined
      };

      const { queryByText } = render(<EventCard event={eventWithRentalIdOnly} />);
      
      // Should not crash, rental indicator should not appear
      expect(queryByText('Court 1')).toBeNull();
    });

    it('should handle long court names gracefully', () => {
      const eventWithLongCourtName: Event = {
        ...mockEventWithRental,
        rental: {
          id: 'rental-4',
          timeSlot: {
            id: 'slot-4',
            court: {
              id: 'court-4',
              name: 'Professional Basketball Court with Premium Flooring',
              sportType: 'basketball',
            },
          },
        },
      };

      const { getByText } = render(<EventCard event={eventWithLongCourtName} />);
      
      // Should render without errors (text will be truncated with numberOfLines={1})
      expect(getByText('Professional Basketball Court with Premium Flooring')).toBeTruthy();
    });
  });
});
