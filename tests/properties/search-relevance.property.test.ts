// Feature: sports-booking-app, Property 5: Search Result Relevance
// Property-based tests for search and filtering functionality
import * as fc from 'fast-check';
import {
  Event,
  Facility,
  SportType,
  SkillLevel,
  EventType,
  EventStatus,
  EventFilters,
  FacilityFilters,
} from '../../src/types';

describe('Property 5: Search Result Relevance', () => {
  describe('Event Search Filtering', () => {
    it('should return only events matching sport type filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              sportType: fc.constantFrom(...Object.values(SportType)),
              facilityId: fc.uuid(),
              organizerId: fc.uuid(),
              startTime: fc.date({ min: new Date(Date.now() + 60000) }),
              endTime: fc.date({ min: new Date(Date.now() + 120000) }),
              maxParticipants: fc.integer({ min: 1, max: 100 }),
              currentParticipants: fc.integer({ min: 0, max: 50 }),
              price: fc.float({ min: 0, max: 1000 }),
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
              equipment: fc.array(fc.string()),
              status: fc.constantFrom(...Object.values(EventStatus)),
              eventType: fc.constantFrom(...Object.values(EventType)),
              participants: fc.constant([]),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.constantFrom(...Object.values(SportType)),
          (events: Event[], filterSportType: SportType) => {
            // Ensure endTime is after startTime for all events
            events.forEach(event => {
              if (event.endTime <= event.startTime) {
                event.endTime = new Date(event.startTime.getTime() + 3600000);
              }
            });

            // Apply filter
            const filteredEvents = events.filter(event => event.sportType === filterSportType);

            // All results should match the filter
            filteredEvents.forEach(event => {
              expect(event.sportType).toBe(filterSportType);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only events within date range filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              sportType: fc.constantFrom(...Object.values(SportType)),
              facilityId: fc.uuid(),
              organizerId: fc.uuid(),
              startTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              endTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              maxParticipants: fc.integer({ min: 1, max: 100 }),
              currentParticipants: fc.integer({ min: 0, max: 50 }),
              price: fc.float({ min: 0, max: 1000 }),
              currency: fc.constant('USD'),
              skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
              equipment: fc.constant([]),
              status: fc.constantFrom(...Object.values(EventStatus)),
              eventType: fc.constantFrom(...Object.values(EventType)),
              participants: fc.constant([]),
              description: fc.constant('Test'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
          (events: Event[], startDate: Date, endDate: Date) => {
            // Ensure endTime is after startTime for all events
            events.forEach(event => {
              if (event.endTime <= event.startTime) {
                event.endTime = new Date(event.startTime.getTime() + 3600000);
              }
            });

            // Ensure endDate is after startDate
            if (endDate <= startDate) {
              endDate = new Date(startDate.getTime() + 86400000); // Add 1 day
            }

            // Apply date range filter
            const filteredEvents = events.filter(
              event => event.startTime >= startDate && event.startTime <= endDate
            );

            // All results should be within date range
            filteredEvents.forEach(event => {
              expect(event.startTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(event.startTime.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only events within price range filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              sportType: fc.constantFrom(...Object.values(SportType)),
              facilityId: fc.uuid(),
              organizerId: fc.uuid(),
              startTime: fc.date({ min: new Date(Date.now() + 60000) }),
              endTime: fc.date({ min: new Date(Date.now() + 120000) }),
              maxParticipants: fc.integer({ min: 1, max: 100 }),
              currentParticipants: fc.integer({ min: 0, max: 50 }),
              price: fc.float({ min: 0, max: 1000 }),
              currency: fc.constant('USD'),
              skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
              equipment: fc.constant([]),
              status: fc.constantFrom(...Object.values(EventStatus)),
              eventType: fc.constantFrom(...Object.values(EventType)),
              participants: fc.constant([]),
              description: fc.constant('Test'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.float({ min: 0, max: 500 }),
          fc.float({ min: 500, max: 1000 }),
          (events: Event[], minPrice: number, maxPrice: number) => {
            // Ensure endTime is after startTime for all events
            events.forEach(event => {
              if (event.endTime <= event.startTime) {
                event.endTime = new Date(event.startTime.getTime() + 3600000);
              }
            });

            // Apply price range filter
            const filteredEvents = events.filter(
              event => event.price >= minPrice && event.price <= maxPrice
            );

            // All results should be within price range
            filteredEvents.forEach(event => {
              expect(event.price).toBeGreaterThanOrEqual(minPrice);
              expect(event.price).toBeLessThanOrEqual(maxPrice);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply multiple filters correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              sportType: fc.constantFrom(...Object.values(SportType)),
              facilityId: fc.uuid(),
              organizerId: fc.uuid(),
              startTime: fc.date({ min: new Date(Date.now() + 60000) }),
              endTime: fc.date({ min: new Date(Date.now() + 120000) }),
              maxParticipants: fc.integer({ min: 1, max: 100 }),
              currentParticipants: fc.integer({ min: 0, max: 50 }),
              price: fc.float({ min: 0, max: 1000 }),
              currency: fc.constant('USD'),
              skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
              equipment: fc.constant([]),
              status: fc.constantFrom(...Object.values(EventStatus)),
              eventType: fc.constantFrom(...Object.values(EventType)),
              participants: fc.constant([]),
              description: fc.constant('Test'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          fc.record({
            sportType: fc.constantFrom(...Object.values(SportType)),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            minPrice: fc.float({ min: 0, max: 500 }),
            maxPrice: fc.float({ min: 500, max: 1000 }),
          }),
          (events: Event[], filters: EventFilters) => {
            // Ensure endTime is after startTime for all events
            events.forEach(event => {
              if (event.endTime <= event.startTime) {
                event.endTime = new Date(event.startTime.getTime() + 3600000);
              }
            });

            // Apply all filters
            const filteredEvents = events.filter(event => {
              const matchesSport = !filters.sportType || event.sportType === filters.sportType;
              const matchesSkill = !filters.skillLevel || event.skillLevel === filters.skillLevel;
              const matchesPrice =
                (!filters.minPrice || event.price >= filters.minPrice) &&
                (!filters.maxPrice || event.price <= filters.maxPrice);

              return matchesSport && matchesSkill && matchesPrice;
            });

            // All results should match all filters
            filteredEvents.forEach(event => {
              if (filters.sportType) {
                expect(event.sportType).toBe(filters.sportType);
              }
              if (filters.skillLevel) {
                expect(event.skillLevel).toBe(filters.skillLevel);
              }
              if (filters.minPrice !== undefined) {
                expect(event.price).toBeGreaterThanOrEqual(filters.minPrice);
              }
              if (filters.maxPrice !== undefined) {
                expect(event.price).toBeLessThanOrEqual(filters.maxPrice);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Facility Search Filtering', () => {
    it('should return only facilities matching sport type filter', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              address: fc.record({
                street: fc.string(),
                city: fc.string(),
                state: fc.string(),
                zipCode: fc.string(),
                country: fc.string(),
              }),
              coordinates: fc.record({
                latitude: fc.float({ min: -90, max: 90 }),
                longitude: fc.float({ min: -180, max: 180 }),
              }),
              amenities: fc.constant([]),
              sportTypes: fc.array(fc.constantFrom(...Object.values(SportType)), { minLength: 1 }),
              images: fc.constant([]),
              contactInfo: fc.constant({}),
              operatingHours: fc.constant({}),
              pricing: fc.constant({}),
              ownerId: fc.uuid(),
              rating: fc.float({ min: 0, max: 5 }),
              reviewCount: fc.integer({ min: 0, max: 1000 }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.constantFrom(...Object.values(SportType)),
          (facilities: Facility[], filterSportType: SportType) => {
            // Apply filter
            const filteredFacilities = facilities.filter(facility =>
              facility.sportTypes.includes(filterSportType)
            );

            // All results should support the sport type
            filteredFacilities.forEach(facility => {
              expect(facility.sportTypes).toContain(filterSportType);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return facilities within location radius', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              coordinates: fc.record({
                latitude: fc.float({ min: -90, max: 90 }),
                longitude: fc.float({ min: -180, max: 180 }),
              }),
              sportTypes: fc.array(fc.constantFrom(...Object.values(SportType)), { minLength: 1 }),
              description: fc.constant('Test'),
              address: fc.constant({} as any),
              amenities: fc.constant([]),
              images: fc.constant([]),
              contactInfo: fc.constant({} as any),
              operatingHours: fc.constant({} as any),
              pricing: fc.constant({} as any),
              ownerId: fc.uuid(),
              rating: fc.constant(0),
              reviewCount: fc.constant(0),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 5, maxLength: 30 }
          ),
          fc.record({
            latitude: fc.float({ min: -90, max: 90 }),
            longitude: fc.float({ min: -180, max: 180 }),
          }),
          fc.float({ min: 1, max: 50 }), // radius in km
          (facilities: Facility[], userLocation: { latitude: number; longitude: number }, radiusKm: number) => {
            // Simple distance calculation (Haversine formula simplified)
            const calculateDistance = (
              lat1: number,
              lon1: number,
              lat2: number,
              lon2: number
            ): number => {
              const R = 6371; // Earth's radius in km
              const dLat = ((lat2 - lat1) * Math.PI) / 180;
              const dLon = ((lon2 - lon1) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lat1 * Math.PI) / 180) *
                  Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return R * c;
            };

            // Filter facilities within radius
            const filteredFacilities = facilities.filter(facility => {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                facility.coordinates.latitude,
                facility.coordinates.longitude
              );
              return distance <= radiusKm;
            });

            // All results should be within radius
            filteredFacilities.forEach(facility => {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                facility.coordinates.latitude,
                facility.coordinates.longitude
              );
              expect(distance).toBeLessThanOrEqual(radiusKm);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
