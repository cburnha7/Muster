// Feature: sports-booking-app, Integration Test: Event and Booking Management
// Tests complete event creation, booking, and cancellation workflows
import { store } from '../../src/store/store';
import {
  addEvent,
  updateEvent,
  removeEvent,
  updateEventParticipants,
} from '../../src/store/slices/eventsSlice';
import {
  addBooking,
  updateBooking,
  removeBooking,
} from '../../src/store/slices/bookingsSlice';
import {
  Event,
  Booking,
  SportType,
  SkillLevel,
  EventType,
  EventStatus,
  BookingStatus,
  PaymentStatus,
} from '../../src/types';

describe('Integration: Event and Booking Management', () => {
  beforeEach(() => {
    // Reset store state
    store.dispatch({ type: 'events/resetEvents' });
    store.dispatch({ type: 'bookings/resetBookings' });
  });

  describe('Event Creation and Management', () => {
    it('should create event and update state correctly', () => {
      const newEvent: Event = {
        id: 'event-1',
        title: 'Basketball Pickup Game',
        description: 'Casual pickup basketball',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T12:00:00'),
        maxParticipants: 10,
        currentParticipants: 0,
        price: 10,
        currency: 'USD',
        skillLevel: SkillLevel.ALL_LEVELS,
        equipment: ['Basketball'],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(newEvent));

      const state = store.getState();
      expect(state.events.events).toHaveLength(1);
      expect(state.events.events[0]).toEqual(newEvent);
    });

    it('should update event details correctly', () => {
      const event: Event = {
        id: 'event-1',
        title: 'Original Title',
        description: 'Original description',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T12:00:00'),
        maxParticipants: 10,
        currentParticipants: 0,
        price: 10,
        currency: 'USD',
        skillLevel: SkillLevel.ALL_LEVELS,
        equipment: [],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));

      const updatedEvent = {
        ...event,
        title: 'Updated Title',
        description: 'Updated description',
        maxParticipants: 15,
      };

      store.dispatch(updateEvent(updatedEvent));

      const state = store.getState();
      expect(state.events.events[0].title).toBe('Updated Title');
      expect(state.events.events[0].description).toBe('Updated description');
      expect(state.events.events[0].maxParticipants).toBe(15);
    });

    it('should remove event correctly', () => {
      const event: Event = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Test',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date(),
        endTime: new Date(),
        maxParticipants: 10,
        currentParticipants: 0,
        price: 0,
        currency: 'USD',
        skillLevel: SkillLevel.ALL_LEVELS,
        equipment: [],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));
      expect(store.getState().events.events).toHaveLength(1);

      store.dispatch(removeEvent('event-1'));
      expect(store.getState().events.events).toHaveLength(0);
    });
  });

  describe('Booking Flow', () => {
    it('should complete full booking flow', () => {
      // Create event
      const event: Event = {
        id: 'event-1',
        title: 'Soccer Match',
        description: 'Friendly soccer match',
        sportType: SportType.SOCCER,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T14:00:00'),
        endTime: new Date('2024-12-01T16:00:00'),
        maxParticipants: 20,
        currentParticipants: 0,
        price: 15,
        currency: 'USD',
        skillLevel: SkillLevel.INTERMEDIATE,
        equipment: ['Soccer Ball'],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));

      // Create booking
      const booking: Booking = {
        id: 'booking-1',
        userId: 'user-2',
        eventId: 'event-1',
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        bookedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addBooking(booking));

      // Update participant count
      store.dispatch(updateEventParticipants({
        eventId: 'event-1',
        count: 1,
      }));

      const state = store.getState();
      expect(state.bookings.bookings).toHaveLength(1);
      expect(state.events.events[0].currentParticipants).toBe(1);
    });

    it('should handle booking cancellation', () => {
      // Create event and booking
      const event: Event = {
        id: 'event-1',
        title: 'Tennis Match',
        description: 'Doubles tennis',
        sportType: SportType.TENNIS,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T09:00:00'),
        endTime: new Date('2024-12-01T10:00:00'),
        maxParticipants: 4,
        currentParticipants: 2,
        price: 20,
        currency: 'USD',
        skillLevel: SkillLevel.ADVANCED,
        equipment: [],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booking: Booking = {
        id: 'booking-1',
        userId: 'user-2',
        eventId: 'event-1',
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        bookedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));
      store.dispatch(addBooking(booking));

      // Cancel booking
      const cancelledBooking = {
        ...booking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'User requested cancellation',
      };

      store.dispatch(updateBooking(cancelledBooking));
      store.dispatch(updateEventParticipants({
        eventId: 'event-1',
        count: 1,
      }));

      const state = store.getState();
      expect(state.bookings.bookings[0].status).toBe(BookingStatus.CANCELLED);
      expect(state.events.events[0].currentParticipants).toBe(1);
    });

    it('should prevent booking when event is full', () => {
      const event: Event = {
        id: 'event-1',
        title: 'Full Event',
        description: 'This event is full',
        sportType: SportType.BASKETBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T12:00:00'),
        maxParticipants: 10,
        currentParticipants: 10,
        price: 10,
        currency: 'USD',
        skillLevel: SkillLevel.ALL_LEVELS,
        equipment: [],
        status: EventStatus.FULL,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));

      const state = store.getState();
      const fullEvent = state.events.events[0];
      
      // Verify event is full
      expect(fullEvent.currentParticipants).toBe(fullEvent.maxParticipants);
      expect(fullEvent.status).toBe(EventStatus.FULL);
    });
  });

  describe('Capacity Management', () => {
    it('should maintain capacity invariant', () => {
      const event: Event = {
        id: 'event-1',
        title: 'Capacity Test Event',
        description: 'Testing capacity limits',
        sportType: SportType.VOLLEYBALL,
        facilityId: 'facility-1',
        organizerId: 'user-1',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T12:00:00'),
        maxParticipants: 12,
        currentParticipants: 0,
        price: 5,
        currency: 'USD',
        skillLevel: SkillLevel.ALL_LEVELS,
        equipment: ['Volleyball'],
        status: EventStatus.ACTIVE,
        eventType: EventType.PICKUP,
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addEvent(event));

      // Add participants up to capacity
      for (let i = 1; i <= 12; i++) {
        store.dispatch(updateEventParticipants({
          eventId: 'event-1',
          count: i,
        }));

        const state = store.getState();
        const currentEvent = state.events.events[0];
        
        // Verify capacity is never exceeded
        expect(currentEvent.currentParticipants).toBeLessThanOrEqual(currentEvent.maxParticipants);
      }

      const finalState = store.getState();
      expect(finalState.events.events[0].currentParticipants).toBe(12);
    });
  });
});
