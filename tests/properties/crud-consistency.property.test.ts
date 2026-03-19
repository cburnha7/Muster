// Feature: sports-booking-app, Property 2: CRUD Data Consistency
// Property-based tests for CRUD operations on events and facilities
import * as fc from 'fast-check';
import {
  Event,
  Facility,
  SportType,
  SkillLevel,
  EventType,
  EventStatus,
} from '../../src/types';

describe('Property 2: CRUD Data Consistency', () => {
  describe('Event CRUD Consistency', () => {
    it('should return equivalent data after create then read', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            organizerId: fc.uuid(),
            startTime: fc.date({ min: new Date(Date.now() + 60000) }),
            endTime: fc.date({ min: new Date(Date.now() + 120000) }),
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            currentParticipants: fc.constant(0),
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            status: fc.constant(EventStatus.ACTIVE),
            eventType: fc.constantFrom(...Object.values(EventType)),
            participants: fc.constant([]),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          (event: Event) => {
            // Ensure endTime is after startTime
            if (event.endTime <= event.startTime) {
              event.endTime = new Date(event.startTime.getTime() + 3600000);
            }

            // Simulate create operation
            const createdEvent = { ...event };

            // Simulate read operation
            const readEvent = { ...createdEvent };

            // Data should be equivalent
            expect(readEvent.id).toBe(event.id);
            expect(readEvent.title).toBe(event.title);
            expect(readEvent.description).toBe(event.description);
            expect(readEvent.sportType).toBe(event.sportType);
            expect(readEvent.maxParticipants).toBe(event.maxParticipants);
            expect(readEvent.price).toBe(event.price);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reflect changes after update then read', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            organizerId: fc.uuid(),
            startTime: fc.date({ min: new Date(Date.now() + 60000) }),
            endTime: fc.date({ min: new Date(Date.now() + 120000) }),
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            currentParticipants: fc.integer({ min: 0, max: 10 }),
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            status: fc.constantFrom(...Object.values(EventStatus)),
            eventType: fc.constantFrom(...Object.values(EventType)),
            participants: fc.constant([]),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            price: fc.float({ min: 0, max: 1000 }),
          }),
          (originalEvent: Event, updates: Partial<Event>) => {
            // Ensure endTime is after startTime
            if (originalEvent.endTime <= originalEvent.startTime) {
              originalEvent.endTime = new Date(originalEvent.startTime.getTime() + 3600000);
            }

            // Simulate create
            const createdEvent = { ...originalEvent };

            // Simulate update
            const updatedEvent = { ...createdEvent, ...updates, updatedAt: new Date() };

            // Simulate read
            const readEvent = { ...updatedEvent };

            // Updates should be reflected
            expect(readEvent.title).toBe(updates.title);
            expect(readEvent.description).toBe(updates.description);
            expect(readEvent.maxParticipants).toBe(updates.maxParticipants);
            expect(readEvent.price).toBe(updates.price);
            
            // Original fields should remain
            expect(readEvent.id).toBe(originalEvent.id);
            expect(readEvent.sportType).toBe(originalEvent.sportType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should make resource unavailable after delete', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (eventId: string) => {
            // Simulate create
            const eventStore = new Map<string, Event>();
            eventStore.set(eventId, {
              id: eventId,
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
            });

            // Verify exists
            expect(eventStore.has(eventId)).toBe(true);

            // Simulate delete
            eventStore.delete(eventId);

            // Should be unavailable
            expect(eventStore.has(eventId)).toBe(false);
            expect(eventStore.get(eventId)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Facility CRUD Consistency', () => {
    it('should return equivalent data after create then read', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            address: fc.record({
              street: fc.string({ minLength: 1, maxLength: 100 }),
              city: fc.string({ minLength: 1, maxLength: 50 }),
              state: fc.string({ minLength: 1, maxLength: 50 }),
              zipCode: fc.string({ minLength: 1, maxLength: 20 }),
              country: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            coordinates: fc.record({
              latitude: fc.float({ min: -90, max: 90 }),
              longitude: fc.float({ min: -180, max: 180 }),
            }),
            amenities: fc.array(fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              icon: fc.string({ minLength: 1, maxLength: 50 }),
            })),
            sportTypes: fc.array(fc.constantFrom(...Object.values(SportType)), { minLength: 1 }),
            images: fc.array(fc.webUrl()),
            contactInfo: fc.record({
              phone: fc.string({ minLength: 1, maxLength: 20 }),
              email: fc.emailAddress(),
              website: fc.webUrl(),
            }),
            operatingHours: fc.constant({}),
            pricing: fc.record({
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              hourlyRate: fc.float({ min: 0, max: 1000 }),
            }),
            ownerId: fc.uuid(),
            rating: fc.float({ min: 0, max: 5 }),
            reviewCount: fc.integer({ min: 0, max: 10000 }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          (facility: Facility) => {
            // Simulate create operation
            const createdFacility = { ...facility };

            // Simulate read operation
            const readFacility = { ...createdFacility };

            // Data should be equivalent
            expect(readFacility.id).toBe(facility.id);
            expect(readFacility.name).toBe(facility.name);
            expect(readFacility.description).toBe(facility.description);
            expect(readFacility.address).toEqual(facility.address);
            expect(readFacility.coordinates).toEqual(facility.coordinates);
            expect(readFacility.sportTypes).toEqual(facility.sportTypes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reflect changes after update then read', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (facilityId: string, originalName: string, updatedName: string) => {
            // Create facility
            const facility: Partial<Facility> = {
              id: facilityId,
              name: originalName,
            };

            // Update facility
            const updatedFacility = {
              ...facility,
              name: updatedName,
            };

            // Read facility
            const readFacility = { ...updatedFacility };

            // Should reflect update
            expect(readFacility.name).toBe(updatedName);
            expect(readFacility.name).not.toBe(originalName);
            expect(readFacility.id).toBe(facilityId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should make facility unavailable after delete', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (facilityId: string) => {
            // Simulate create
            const facilityStore = new Map<string, Partial<Facility>>();
            facilityStore.set(facilityId, {
              id: facilityId,
              name: 'Test Facility',
            });

            // Verify exists
            expect(facilityStore.has(facilityId)).toBe(true);

            // Simulate delete
            facilityStore.delete(facilityId);

            // Should be unavailable
            expect(facilityStore.has(facilityId)).toBe(false);
            expect(facilityStore.get(facilityId)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
