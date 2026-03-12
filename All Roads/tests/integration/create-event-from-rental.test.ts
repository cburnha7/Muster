/**
 * Integration test for creating events from rentals
 * Tests task 13: Create Event from Rental
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

describe('Create Event from Rental Integration', () => {
  let testUserId: string;
  let testFacilityId: string;
  let testCourtId: string;
  let testTimeSlotId: string;
  let testRentalId: string;

  beforeAll(async () => {
    // Setup: Create test user, facility, court, time slot, and rental
    // This would normally be done through the API
    // For now, we'll assume these exist in the test database
    testUserId = 'test-user-id';
    testFacilityId = 'test-facility-id';
    testCourtId = 'test-court-id';
    testTimeSlotId = 'test-timeslot-id';
    testRentalId = 'test-rental-id';
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  it('should create an event linked to a rental', async () => {
    const eventData = {
      title: 'Basketball Game',
      description: 'Friendly basketball game',
      sportType: 'basketball',
      eventType: 'pickup',
      facilityId: testFacilityId,
      startTime: new Date('2024-12-25T14:00:00Z'),
      endTime: new Date('2024-12-25T16:00:00Z'),
      maxParticipants: 10,
      price: 0,
      skillLevel: 'intermediate',
      equipment: ['Basketball'],
      organizerId: testUserId,
      rentalId: testRentalId,
    };

    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    expect(response.status).toBe(201);
    const event = await response.json();
    expect(event.rentalId).toBe(testRentalId);
    expect(event.rental).toBeDefined();
  });

  it('should reject event creation if time does not match rental slot', async () => {
    const eventData = {
      title: 'Basketball Game',
      description: 'Friendly basketball game',
      sportType: 'basketball',
      eventType: 'pickup',
      facilityId: testFacilityId,
      startTime: new Date('2024-12-25T15:00:00Z'), // Different time
      endTime: new Date('2024-12-25T17:00:00Z'),
      maxParticipants: 10,
      price: 0,
      skillLevel: 'intermediate',
      equipment: ['Basketball'],
      organizerId: testUserId,
      rentalId: testRentalId,
    };

    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('time must match rental slot');
  });

  it('should reject event creation if user is not the renter', async () => {
    const eventData = {
      title: 'Basketball Game',
      description: 'Friendly basketball game',
      sportType: 'basketball',
      eventType: 'pickup',
      facilityId: testFacilityId,
      startTime: new Date('2024-12-25T14:00:00Z'),
      endTime: new Date('2024-12-25T16:00:00Z'),
      maxParticipants: 10,
      price: 0,
      skillLevel: 'intermediate',
      equipment: ['Basketball'],
      organizerId: 'different-user-id', // Different user
      rentalId: testRentalId,
    };

    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error).toContain('Only the renter can create an event');
  });

  it('should include rental information when fetching event details', async () => {
    // First create an event with rental
    const eventData = {
      title: 'Basketball Game',
      description: 'Friendly basketball game',
      sportType: 'basketball',
      eventType: 'pickup',
      facilityId: testFacilityId,
      startTime: new Date('2024-12-25T14:00:00Z'),
      endTime: new Date('2024-12-25T16:00:00Z'),
      maxParticipants: 10,
      price: 0,
      skillLevel: 'intermediate',
      equipment: ['Basketball'],
      organizerId: testUserId,
      rentalId: testRentalId,
    };

    const createResponse = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const createdEvent = await createResponse.json();

    // Then fetch the event details
    const getResponse = await fetch(`${API_URL}/events/${createdEvent.id}`);
    expect(getResponse.status).toBe(200);
    
    const event = await getResponse.json();
    expect(event.rentalId).toBe(testRentalId);
    expect(event.rental).toBeDefined();
    expect(event.rental.timeSlot).toBeDefined();
    expect(event.rental.timeSlot.court).toBeDefined();
  });
});
