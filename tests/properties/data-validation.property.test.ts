// Feature: sports-booking-app, Property 10: Data Validation Consistency
// Property-based tests for data model validation
import * as fc from 'fast-check';
import {
  validateEventData,
  validateFacilityData,
  validateProfileData,
} from '../../src/utils/validation';
import {
  CreateEventData,
  CreateFacilityData,
  UpdateProfileData,
  SportType,
  SkillLevel,
  EventType,
} from '../../src/types';

describe('Property 10: Data Validation Consistency', () => {
  describe('Event Data Validation', () => {
    it('should reject invalid event data with descriptive error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            description: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            sportType: fc.oneof(fc.constant('invalid_sport'), fc.constant(null), fc.constant(undefined)),
            facilityId: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            startTime: fc.date({ max: new Date() }), // Past date
            endTime: fc.date({ max: new Date() }), // Past date
            maxParticipants: fc.oneof(fc.constant(0), fc.constant(-1), fc.constant(1001)),
            price: fc.constant(-10), // Negative price
            currency: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            skillLevel: fc.oneof(fc.constant('invalid_skill'), fc.constant(null), fc.constant(undefined)),
            equipment: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('not_array')),
            eventType: fc.oneof(fc.constant('invalid_type'), fc.constant(null), fc.constant(undefined)),
          }),
          (invalidEventData) => {
            const result = validateEventData(invalidEventData as any);
            
            // Invalid data should be rejected
            expect(result.isValid).toBe(false);
            
            // Should have descriptive error messages
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Each error should have a field and message
            result.errors.forEach(error => {
              expect(error.field).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.field).toBe('string');
              expect(typeof error.message).toBe('string');
              expect(error.field.length).toBeGreaterThan(0);
              expect(error.message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid event data and return no errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            startTime: fc.date({ min: new Date(Date.now() + 60000) }), // Future date
            endTime: fc.date({ min: new Date(Date.now() + 120000) }), // Further future date
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            eventType: fc.constantFrom(...Object.values(EventType)),
          }),
          (validEventData) => {
            // Ensure endTime is after startTime
            if (validEventData.endTime <= validEventData.startTime) {
              validEventData.endTime = new Date(validEventData.startTime.getTime() + 3600000); // Add 1 hour
            }

            const result = validateEventData(validEventData);
            
            // Valid data should be accepted
            expect(result.isValid).toBe(true);
            
            // Should have no errors
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent event creation with past dates', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            startTime: fc.date({ max: new Date(Date.now() - 60000) }), // Past date
            endTime: fc.date({ max: new Date(Date.now() - 30000) }), // Past date
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            eventType: fc.constantFrom(...Object.values(EventType)),
          }),
          (eventDataWithPastDate) => {
            const result = validateEventData(eventDataWithPastDate);
            
            // Should be rejected due to past date
            expect(result.isValid).toBe(false);
            
            // Should have error about start time
            const startTimeError = result.errors.find(error => error.field === 'startTime');
            expect(startTimeError).toBeDefined();
            expect(startTimeError?.message).toContain('future');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent over-capacity events', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            startTime: fc.date({ min: new Date(Date.now() + 60000) }),
            endTime: fc.date({ min: new Date(Date.now() + 120000) }),
            maxParticipants: fc.integer({ min: 1001, max: 10000 }), // Over capacity
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            eventType: fc.constantFrom(...Object.values(EventType)),
          }),
          (overCapacityEventData) => {
            // Ensure endTime is after startTime
            if (overCapacityEventData.endTime <= overCapacityEventData.startTime) {
              overCapacityEventData.endTime = new Date(overCapacityEventData.startTime.getTime() + 3600000);
            }

            const result = validateEventData(overCapacityEventData);
            
            // Should be rejected due to over-capacity
            expect(result.isValid).toBe(false);
            
            // Should have error about max participants
            const capacityError = result.errors.find(error => error.field === 'maxParticipants');
            expect(capacityError).toBeDefined();
            expect(capacityError?.message).toContain('1000');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Facility Data Validation', () => {
    it('should reject incomplete facility information with descriptive error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            description: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined)),
            address: fc.record({
              street: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              city: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              state: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              zipCode: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              country: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
            }),
            coordinates: fc.record({
              latitude: fc.oneof(fc.constant(91), fc.constant(-91), fc.constant(null), fc.constant(undefined)), // Invalid latitude
              longitude: fc.oneof(fc.constant(181), fc.constant(-181), fc.constant(null), fc.constant(undefined)), // Invalid longitude
            }),
            amenities: fc.array(fc.string()),
            sportTypes: fc.oneof(fc.constant([]), fc.constant(['invalid_sport']), fc.constant(null), fc.constant(undefined)),
            contactInfo: fc.record({
              phone: fc.constant(undefined),
              email: fc.constant(undefined),
              website: fc.constant(undefined),
            }),
            operatingHours: fc.record({}), // Empty operating hours
            pricing: fc.record({
              currency: fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
              hourlyRate: fc.constant(-10), // Negative rate
            }),
          }),
          (incompleteFacilityData) => {
            const result = validateFacilityData(incompleteFacilityData as any);
            
            // Incomplete data should be rejected
            expect(result.isValid).toBe(false);
            
            // Should have descriptive error messages
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Each error should have a field and message
            result.errors.forEach(error => {
              expect(error.field).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.field).toBe('string');
              expect(typeof error.message).toBe('string');
              expect(error.field.length).toBeGreaterThan(0);
              expect(error.message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept complete and accurate facility information', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            address: fc.record({
              street: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              zipCode: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            }),
            coordinates: fc.record({
              latitude: fc.float({ min: -90, max: 90 }),
              longitude: fc.float({ min: -180, max: 180 }),
            }),
            amenities: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            sportTypes: fc.array(fc.constantFrom(...Object.values(SportType)), { minLength: 1 }),
            contactInfo: fc.record({
              phone: fc.string({ minLength: 1, maxLength: 20 }),
              email: fc.emailAddress(),
              website: fc.webUrl(),
            }),
            operatingHours: fc.record({
              monday: fc.array(fc.record({
                open: fc.constantFrom('06:00', '07:00', '08:00'),
                close: fc.constantFrom('20:00', '21:00', '22:00'),
              }), { minLength: 1, maxLength: 3 }),
            }),
            pricing: fc.record({
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              hourlyRate: fc.float({ min: 0, max: 1000 }),
              dailyRate: fc.float({ min: 0, max: 5000 }),
              deposit: fc.float({ min: 0, max: 500 }),
            }),
          }),
          (completeFacilityData) => {
            const result = validateFacilityData(completeFacilityData);
            
            // Complete and accurate data should be accepted
            expect(result.isValid).toBe(true);
            
            // Should have no errors
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Profile Data Validation', () => {
    it('should reject invalid profile data with descriptive error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null)),
            lastName: fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null)),
            phoneNumber: fc.oneof(fc.constant('invalid-phone'), fc.constant('abc123')),
            dateOfBirth: fc.date({ min: new Date(Date.now() + 86400000) }), // Future date
            preferredSports: fc.oneof(fc.constant(['invalid_sport']), fc.constant('not_array')),
          }),
          (invalidProfileData) => {
            const result = validateProfileData(invalidProfileData as any);
            
            // Invalid data should be rejected
            expect(result.isValid).toBe(false);
            
            // Should have descriptive error messages
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Each error should have a field and message
            result.errors.forEach(error => {
              expect(error.field).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.field).toBe('string');
              expect(typeof error.message).toBe('string');
              expect(error.field.length).toBeGreaterThan(0);
              expect(error.message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid profile data and return no errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            phoneNumber: fc.constantFrom('+1-555-0123', '555-0123', '(555) 012-3456'),
            dateOfBirth: fc.date({ max: new Date(Date.now() - 86400000) }), // Past date
            preferredSports: fc.array(fc.constantFrom(...Object.values(SportType)), { minLength: 1, maxLength: 5 }),
          }),
          (validProfileData) => {
            const result = validateProfileData(validProfileData);
            
            // Valid data should be accepted
            expect(result.isValid).toBe(true);
            
            // Should have no errors
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-validation consistency', () => {
    it('should consistently validate the same data across multiple calls', () => {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            sportType: fc.constantFrom(...Object.values(SportType)),
            facilityId: fc.uuid(),
            startTime: fc.date({ min: new Date(Date.now() + 60000) }),
            endTime: fc.date({ min: new Date(Date.now() + 120000) }),
            maxParticipants: fc.integer({ min: 1, max: 1000 }),
            price: fc.float({ min: 0, max: 1000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            skillLevel: fc.constantFrom(...Object.values(SkillLevel)),
            equipment: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            eventType: fc.constantFrom(...Object.values(EventType)),
          }),
          (eventData) => {
            // Ensure endTime is after startTime
            if (eventData.endTime <= eventData.startTime) {
              eventData.endTime = new Date(eventData.startTime.getTime() + 3600000);
            }

            // Validate the same data multiple times
            const result1 = validateEventData(eventData);
            const result2 = validateEventData(eventData);
            const result3 = validateEventData(eventData);
            
            // Results should be consistent
            expect(result1.isValid).toBe(result2.isValid);
            expect(result2.isValid).toBe(result3.isValid);
            expect(result1.errors.length).toBe(result2.errors.length);
            expect(result2.errors.length).toBe(result3.errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});