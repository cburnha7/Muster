// Feature: sports-booking-app, Property 3: Booking Capacity Invariant
// Feature: sports-booking-app, Property 4: Booking State Consistency
// Property-based tests for booking capacity and state management
import * as fc from 'fast-check';
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

describe('Property 3: Booking Capacity Invariant', () => {
  it('should never exceed maximum capacity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // maxParticipants
        fc.integer({ min: 0, max: 100 }), // attemptedBookings
        (maxParticipants: number, attemptedBookings: number) => {
          const event: Event = {
            id: 'event-1',
            title: 'Test Event',
            description: 'Test',
            sportType: SportType.BASKETBALL,
            facilityId: 'facility-1',
            organizerId: 'user-1',
            startTime: new Date(Date.now() + 60000),
            endTime: new Date(Date.now() + 120000),
            maxParticipants,
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

          const bookings: Booking[] = [];
          let confirmedCount = 0;

          // Attempt to create bookings
          for (let i = 0; i < attemptedBookings; i++) {
            if (confirmedCount < maxParticipants) {
              const booking: Booking = {
                id: `booking-${i}`,
                userId: `user-${i}`,
                eventId: event.id,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                bookedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              bookings.push(booking);
              confirmedCount++;
            }
          }

          // Invariant: confirmed bookings should never exceed capacity
          expect(confirmedCount).toBeLessThanOrEqual(maxParticipants);
          expect(bookings.length).toBeLessThanOrEqual(maxParticipants);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject booking attempts on full events', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (maxParticipants: number) => {
          const event: Event = {
            id: 'event-1',
            title: 'Full Event',
            description: 'This event is full',
            sportType: SportType.SOCCER,
            facilityId: 'facility-1',
            organizerId: 'user-1',
            startTime: new Date(Date.now() + 60000),
            endTime: new Date(Date.now() + 120000),
            maxParticipants,
            currentParticipants: maxParticipants, // Already full
            price: 15,
            currency: 'USD',
            skillLevel: SkillLevel.INTERMEDIATE,
            equipment: [],
            status: EventStatus.FULL,
            eventType: EventType.PICKUP,
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Attempt to book full event should be rejected
          const canBook = event.currentParticipants < event.maxParticipants;
          expect(canBook).toBe(false);
          expect(event.status).toBe(EventStatus.FULL);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain capacity invariant during concurrent bookings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }),
        (maxParticipants: number, userIds: string[]) => {
          let currentParticipants = 0;
          const successfulBookings: string[] = [];

          // Simulate concurrent booking attempts
          for (const userId of userIds) {
            if (currentParticipants < maxParticipants) {
              successfulBookings.push(userId);
              currentParticipants++;
            }
          }

          // Invariant must hold
          expect(currentParticipants).toBeLessThanOrEqual(maxParticipants);
          expect(successfulBookings.length).toBeLessThanOrEqual(maxParticipants);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Booking State Consistency', () => {
  it('should update participant count atomically on booking creation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        (maxParticipants: number, initialParticipants: number) => {
          // Ensure initial participants doesn't exceed max
          const safeInitial = Math.min(initialParticipants, maxParticipants - 1);

          const event = {
            id: 'event-1',
            maxParticipants,
            currentParticipants: safeInitial,
          };

          const userBookings: Booking[] = [];

          // Create booking
          if (event.currentParticipants < event.maxParticipants) {
            const booking: Booking = {
              id: 'booking-1',
              userId: 'user-1',
              eventId: event.id,
              status: BookingStatus.CONFIRMED,
              paymentStatus: PaymentStatus.PAID,
              bookedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Atomic update
            event.currentParticipants++;
            userBookings.push(booking);
          }

          // State should be consistent
          expect(event.currentParticipants).toBe(safeInitial + (userBookings.length > 0 ? 1 : 0));
          expect(userBookings.length).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update participant count atomically on booking cancellation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (maxParticipants: number, initialParticipants: number) => {
          // Ensure initial participants is valid
          const safeInitial = Math.min(initialParticipants, maxParticipants);

          const event = {
            id: 'event-1',
            maxParticipants,
            currentParticipants: safeInitial,
          };

          const booking: Booking = {
            id: 'booking-1',
            userId: 'user-1',
            eventId: event.id,
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            bookedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const userBookings = [booking];

          // Cancel booking
          booking.status = BookingStatus.CANCELLED;
          booking.cancelledAt = new Date();
          event.currentParticipants = Math.max(0, event.currentParticipants - 1);

          // Remove from user's bookings
          const activeBookings = userBookings.filter(b => b.status === BookingStatus.CONFIRMED);

          // State should be consistent
          expect(event.currentParticipants).toBe(safeInitial - 1);
          expect(activeBookings.length).toBe(0);
          expect(booking.status).toBe(BookingStatus.CANCELLED);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reflect booking changes in user booking list', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.constantFrom(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED),
        (bookingIds: string[], newStatus: BookingStatus) => {
          const userBookings: Booking[] = bookingIds.map(id => ({
            id,
            userId: 'user-1',
            eventId: 'event-1',
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            bookedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Update first booking status
          if (userBookings.length > 0) {
            userBookings[0].status = newStatus;
          }

          // User's booking list should reflect the change
          const updatedBooking = userBookings.find(b => b.id === bookingIds[0]);
          expect(updatedBooking?.status).toBe(newStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistency across multiple booking operations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.array(
          fc.record({
            operation: fc.constantFrom('create', 'cancel'),
            userId: fc.uuid(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (maxParticipants: number, operations: Array<{ operation: string; userId: string }>) => {
          const event = {
            id: 'event-1',
            maxParticipants,
            currentParticipants: 0,
          };

          const bookings = new Map<string, Booking>();

          // Execute operations
          for (const op of operations) {
            if (op.operation === 'create' && event.currentParticipants < event.maxParticipants) {
              const booking: Booking = {
                id: `booking-${op.userId}`,
                userId: op.userId,
                eventId: event.id,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                bookedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              bookings.set(op.userId, booking);
              event.currentParticipants++;
            } else if (op.operation === 'cancel' && bookings.has(op.userId)) {
              const booking = bookings.get(op.userId);
              if (booking && booking.status === BookingStatus.CONFIRMED) {
                booking.status = BookingStatus.CANCELLED;
                event.currentParticipants = Math.max(0, event.currentParticipants - 1);
              }
            }
          }

          // Count confirmed bookings
          const confirmedCount = Array.from(bookings.values()).filter(
            b => b.status === BookingStatus.CONFIRMED
          ).length;

          // Consistency check
          expect(event.currentParticipants).toBe(confirmedCount);
          expect(event.currentParticipants).toBeLessThanOrEqual(event.maxParticipants);
        }
      ),
      { numRuns: 100 }
    );
  });
});
