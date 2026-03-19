/**
 * API tests for Event-Rental Linking (Task 13.5)
 * 
 * Tests verify that the backend API:
 * 1. Accepts rentalId in event creation requests
 * 2. Validates rental ownership
 * 3. Validates rental status
 * 4. Validates event time matches rental slot
 * 5. Returns rental information in event responses
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

describe('Event-Rental Linking API Tests', () => {
  let testUser: any;
  let otherUser: any;
  let testFacility: any;
  let testCourt: any;
  let testTimeSlot: any;
  let testRental: any;

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: `test-api-rental-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: new Date('1990-01-01'),
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: `other-api-rental-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Other',
        lastName: 'User',
        dateOfBirth: new Date('1990-01-01'),
      },
    });

    // Create test facility
    testFacility = await prisma.facility.create({
      data: {
        name: 'Test Facility for API',
        description: 'Test facility',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        pricePerHour: 50,
        ownerId: testUser.id,
        sportTypes: ['basketball'],
      },
    });

    // Create test court
    testCourt = await prisma.facilityCourt.create({
      data: {
        name: 'Court 1',
        sportType: 'basketball',
        facilityId: testFacility.id,
        capacity: 10,
        isIndoor: true,
      },
    });

    // Create test time slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    testTimeSlot = await prisma.facilityTimeSlot.create({
      data: {
        courtId: testCourt.id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '16:00',
        status: 'available',
        price: 100,
      },
    });

    // Create test rental
    testRental = await prisma.facilityRental.create({
      data: {
        userId: testUser.id,
        timeSlotId: testTimeSlot.id,
        status: 'confirmed',
        totalPrice: 100,
        paymentStatus: 'paid',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.event.deleteMany({
      where: { organizerId: testUser.id },
    });
    await prisma.facilityRental.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.facilityTimeSlot.deleteMany({
      where: { courtId: testCourt.id },
    });
    await prisma.facilityCourt.deleteMany({
      where: { facilityId: testFacility.id },
    });
    await prisma.facility.deleteMany({
      where: { ownerId: testUser.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser.id, otherUser.id] } },
    });

    await prisma.$disconnect();
  });

  describe('POST /api/events - Create Event with Rental', () => {
    it('should create event with valid rentalId', async () => {
      const tomorrow = new Date(testTimeSlot.date);
      const startTime = new Date(tomorrow);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Basketball Game from Rental',
          description: 'Test event created from rental',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.rentalId).toBe(testRental.id);
      expect(response.body.facilityId).toBe(testFacility.id);
    });

    it('should reject event creation with non-existent rentalId', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startTime = new Date(tomorrow);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Event with Invalid Rental',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          rentalId: 'non-existent-rental-id',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Rental not found');
    });

    it('should reject event creation if user is not the renter', async () => {
      const tomorrow = new Date(testTimeSlot.date);
      const startTime = new Date(tomorrow);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Unauthorized Event',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: otherUser.id, // Different user
          facilityId: testFacility.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only the renter can create an event');
    });

    it('should reject event creation if rental is not confirmed', async () => {
      // Create a pending rental
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 3);
      testDate.setHours(10, 0, 0, 0);

      const timeSlot = await prisma.facilityTimeSlot.create({
        data: {
          courtId: testCourt.id,
          date: testDate,
          startTime: '10:00',
          endTime: '12:00',
          status: 'available',
          price: 100,
        },
      });

      const pendingRental = await prisma.facilityRental.create({
        data: {
          userId: testUser.id,
          timeSlotId: timeSlot.id,
          status: 'pending', // Not confirmed
          totalPrice: 100,
          paymentStatus: 'pending',
        },
      });

      const startTime = new Date(testDate);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(testDate);
      endTime.setHours(12, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Event from Pending Rental',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          rentalId: pendingRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rental must be confirmed');

      // Clean up
      await prisma.facilityRental.delete({ where: { id: pendingRental.id } });
      await prisma.facilityTimeSlot.delete({ where: { id: timeSlot.id } });
    });

    it('should reject event if time does not match rental slot', async () => {
      const tomorrow = new Date(testTimeSlot.date);
      const wrongStartTime = new Date(tomorrow);
      wrongStartTime.setHours(15, 0, 0, 0); // Wrong time
      const wrongEndTime = new Date(tomorrow);
      wrongEndTime.setHours(17, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Event with Wrong Time',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: wrongStartTime.toISOString(),
          endTime: wrongEndTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Event time must match rental slot time');
    });

    it('should automatically set facilityId from rental', async () => {
      const tomorrow = new Date(testTimeSlot.date);
      const startTime = new Date(tomorrow);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const response = await request(API_URL)
        .post('/events')
        .send({
          title: 'Event with Auto Facility',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          // No facilityId provided
          rentalId: testRental.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.facilityId).toBe(testFacility.id);
    });
  });

  describe('GET /api/events/:id - Retrieve Event with Rental', () => {
    it('should return event with rental information', async () => {
      // Create event with rental
      const tomorrow = new Date(testTimeSlot.date);
      const startTime = new Date(tomorrow);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0);

      const event = await prisma.event.create({
        data: {
          title: 'Event for GET Test',
          description: 'Test event',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime,
          endTime,
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          rentalId: testRental.id,
        },
      });

      const response = await request(API_URL)
        .get(`/events/${event.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.rentalId).toBe(testRental.id);
      expect(response.body.rental).toBeDefined();
      expect(response.body.rental.id).toBe(testRental.id);
      expect(response.body.rental.timeSlot).toBeDefined();
      expect(response.body.rental.timeSlot.court).toBeDefined();
      expect(response.body.rental.timeSlot.court.id).toBe(testCourt.id);
    });

    it('should return event without rental information if not linked', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const startTime = new Date(tomorrow);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      const event = await prisma.event.create({
        data: {
          title: 'Regular Event',
          description: 'Test event without rental',
          sportType: 'basketball',
          skillLevel: 'intermediate',
          eventType: 'pickup',
          startTime,
          endTime,
          maxParticipants: 10,
          price: 0,
          organizerId: testUser.id,
          facilityId: testFacility.id,
          // No rentalId
        },
      });

      const response = await request(API_URL)
        .get(`/events/${event.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.rentalId).toBeNull();
      expect(response.body.rental).toBeNull();
    });
  });

  describe('GET /api/events - List Events with Rental Filter', () => {
    it('should include rental information in event list', async () => {
      const response = await request(API_URL)
        .get('/events');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Find events with rentals
      const eventsWithRentals = response.body.data.filter((e: any) => e.rentalId);
      
      if (eventsWithRentals.length > 0) {
        const eventWithRental = eventsWithRentals[0];
        expect(eventWithRental.rental).toBeDefined();
        expect(eventWithRental.rental.timeSlot).toBeDefined();
        expect(eventWithRental.rental.timeSlot.court).toBeDefined();
      }
    });
  });
});
