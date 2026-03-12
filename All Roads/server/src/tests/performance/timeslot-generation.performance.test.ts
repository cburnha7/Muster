/**
 * Performance Tests for Time Slot Generation
 * 
 * Tests performance requirements:
 * - Single court generation: < 5 seconds
 * - 100 courts generation: < 2 minutes
 * - API response time: < 500ms
 */

import { PrismaClient } from '@prisma/client';
import { TimeSlotGeneratorService } from '../../services/TimeSlotGeneratorService';
import request from 'supertest';
import express from 'express';
import courtRoutes from '../../routes/courts';

const prisma = new PrismaClient();
const generator = new TimeSlotGeneratorService();

describe('Time Slot Generation - Performance', () => {
  let testFacilityId: string;
  const testCourtIds: string[] = [];

  beforeAll(async () => {
    // Create test facility
    const facility = await prisma.facility.create({
      data: {
        name: 'Performance Test Facility',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country',
        latitude: 0,
        longitude: 0,
        pricePerHour: 50,
        ownerId: 'test-owner-id',
      },
    });

    testFacilityId = facility.id;
  });

  afterAll(async () => {
    // Clean up test data
    for (const courtId of testCourtIds) {
      await prisma.facilityTimeSlot.deleteMany({
        where: { courtId },
      });
    }

    await prisma.facilityCourt.deleteMany({
      where: { facilityId: testFacilityId },
    });

    await prisma.facility.delete({
      where: { id: testFacilityId },
    });

    await prisma.$disconnect();
  });

  test('Single court generation completes within 5 seconds', async () => {
    // Create test court
    const court = await prisma.facilityCourt.create({
      data: {
        facilityId: testFacilityId,
        name: 'Performance Test Court 1',
        sportType: 'basketball',
        pricePerHour: 50,
      },
    });

    testCourtIds.push(court.id);

    // Measure generation time
    const startTime = Date.now();
    await generator.generateRollingWindow(court.id);
    const duration = Date.now() - startTime;

    console.log(`Single court generation took ${duration}ms`);
    expect(duration).toBeLessThan(5000); // 5 seconds
  }, 10000);

  test('100 courts generation completes within 2 minutes', async () => {
    // Create 100 test courts
    const courts = [];
    for (let i = 0; i < 100; i++) {
      const court = await prisma.facilityCourt.create({
        data: {
          facilityId: testFacilityId,
          name: `Performance Test Court ${i + 2}`,
          sportType: 'basketball',
          pricePerHour: 50,
        },
      });
      courts.push(court);
      testCourtIds.push(court.id);
    }

    // Measure generation time for all courts
    const startTime = Date.now();
    
    for (const court of courts) {
      await generator.generateRollingWindow(court.id);
    }

    const duration = Date.now() - startTime;

    console.log(`100 courts generation took ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    expect(duration).toBeLessThan(120000); // 2 minutes
  }, 150000); // 2.5 minute timeout

  test('Court creation API responds within 500ms', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', courtRoutes);

    const startTime = Date.now();

    const response = await request(app)
      .post(`/api/facilities/${testFacilityId}/courts`)
      .send({
        name: 'API Performance Test Court',
        sportType: 'tennis',
        pricePerHour: 60,
      });

    const responseTime = Date.now() - startTime;

    console.log(`API response time: ${responseTime}ms`);
    expect(response.status).toBe(201);
    expect(responseTime).toBeLessThan(500); // 500ms

    // Clean up
    if (response.body.id) {
      testCourtIds.push(response.body.id);
    }
  }, 10000);
});
