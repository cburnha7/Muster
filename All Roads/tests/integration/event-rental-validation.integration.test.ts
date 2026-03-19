/**
 * Event-Rental Validation Integration Tests
 * 
 * Tests the complete validation flow for creating events from rentals,
 * including both frontend and backend validation.
 */

import request from 'supertest';
import { app } from '../../server/src/index';
import { prisma } from '../../server/src/index';

describe('Event-Rental Validation Integration', () => {
  let testUser: any;
  let testFacility: any;
  let testCourt: any;
  let testTimeSlot: any;
  let testRental: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-rental-validation@example.com',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: new Date('1990-01-01'),
      },
    });

    // Create test facility
    testFacility = await prisma.facility.create({
      data: {
        name: 'Test Facility for Validation',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        sportTypes: ['basketball'],
        amenities: [],
        operatorId: testUser.id,
      },
    });

    // Create test court
    testCourt = await prisma.facilityCourt.create({
      data: {
        facilityId: testFacility.id,
        name: 'Test Court 1',
        sportType: 'basketball',
        capacity: 10,
        isIndoor: true,
        isActive: true,
      },
    });

    // Create test time slot
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 7); // 7 days from now
    slotDate.setHours(0, 0, 0, 0);

    testTimeSlot = await prisma.facilityTimeSlot.create({
      data: {
        courtId: testCourt.id,
        date: slotDate,
        startTime: '14:00',
        endTime: '16:00',
        status: 'available',
        pricePerHour: 50,
      },
    });

    // Create test rental
    testRental = await prisma.facilityRental.create({
      data: {
        userId: testUser.id,
        timeSlotId: testTimeSlot.id,
        status: 'confirmed',
        totalPrice: 100,
        paymentStatus: 'completed',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
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
      where: { id: testFacility.id },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  describe('POST /api/events - Rental Validation', () => {
    it('should create event when all rental validations pass', async () => {
      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event from Rental',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.rentalId).toBe(testRental.id);
      expect(response.body.facilityId).toBe(testFacility.id);

      // Clean up
      await prisma.event.delete({ where: { id: response.body.id } });
    });

    it('should reject event with mismatched start time', async () => {
      const slotDate = new Date(testTimeSlot.date);
      const wrongStartTime = new Date(slotDate);
      wrongStartTime.setHours(15, 0, 0, 0); // Wrong time (should be 14:00)
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Wrong Time',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: wrongStartTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Event time must match rental slot time');
    });

    it('should reject event with mismatched end time', async () => {
      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const wrongEndTime = new Date(slotDate);
      wrongEndTime.setHours(17, 0, 0, 0); // Wrong time (should be 16:00)

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Wrong End Time',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: wrongEndTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Event time must match rental slot time');
    });

    it('should reject event with mismatched date', async () => {
      const wrongDate = new Date(testTimeSlot.date);
      wrongDate.setDate(wrongDate.getDate() + 1); // Wrong date
      const startDateTime = new Date(wrongDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(wrongDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Wrong Date',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Event time must match rental slot time');
    });

    it('should reject event when rental does not exist', async () => {
      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Invalid Rental',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: 'non-existent-rental-id',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Rental not found');
    });

    it('should reject event when user is not the renter', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user-validation@example.com',
          firstName: 'Other',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01'),
        },
      });

      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event by Non-Renter',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: otherUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only the renter can create an event for this rental');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject event when rental is not confirmed', async () => {
      // Create a pending rental
      const pendingRental = await prisma.facilityRental.create({
        data: {
          userId: testUser.id,
          timeSlotId: testTimeSlot.id,
          status: 'pending',
          totalPrice: 100,
          paymentStatus: 'pending',
        },
      });

      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Pending Rental',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: pendingRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rental must be confirmed to create an event');

      // Clean up
      await prisma.facilityRental.delete({ where: { id: pendingRental.id } });
    });

    it('should override facilityId with rental facility', async () => {
      // Create another facility
      const otherFacility = await prisma.facility.create({
        data: {
          name: 'Other Facility',
          address: '456 Other St',
          city: 'Other City',
          state: 'OS',
          zipCode: '54321',
          sportTypes: ['soccer'],
          amenities: [],
          operatorId: testUser.id,
        },
      });

      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event with Wrong Facility',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: otherFacility.id, // Wrong facility
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.facilityId).toBe(testFacility.id); // Should be overridden

      // Clean up
      await prisma.event.delete({ where: { id: response.body.id } });
      await prisma.facility.delete({ where: { id: otherFacility.id } });
    });
  });

  describe('Validation Error Messages', () => {
    it('should return clear error message for time mismatch', async () => {
      const slotDate = new Date(testTimeSlot.date);
      const wrongStartTime = new Date(slotDate);
      wrongStartTime.setHours(15, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: wrongStartTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: testUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Event time must match rental slot time');
    });

    it('should return clear error message for non-renter', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'another-user-validation@example.com',
          firstName: 'Another',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01'),
        },
      });

      const slotDate = new Date(testTimeSlot.date);
      const startDateTime = new Date(slotDate);
      startDateTime.setHours(14, 0, 0, 0);
      const endDateTime = new Date(slotDate);
      endDateTime.setHours(16, 0, 0, 0);

      const response = await request(app)
        .post('/api/events')
        .send({
          title: 'Test Event',
          description: 'Test Description',
          sportType: 'basketball',
          facilityId: testFacility.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          maxParticipants: 10,
          price: 0,
          skillLevel: 'intermediate',
          eventType: 'pickup',
          organizerId: otherUser.id,
          rentalId: testRental.id,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Only the renter can create an event for this rental');

      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
