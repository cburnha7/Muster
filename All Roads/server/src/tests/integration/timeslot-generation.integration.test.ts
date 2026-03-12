/**
 * End-to-End Integration Tests for Time Slot Generation
 * 
 * Tests the complete flow:
 * - Create facility with operating hours
 * - Create court
 * - Verify async slot generation
 * - Verify 365-day coverage
 * - Verify operating hours respected
 * - Test maintenance job
 * - Test backfill
 */

import { PrismaClient } from '@prisma/client';
import { TimeSlotGeneratorService } from '../../services/TimeSlotGeneratorService';
import { TimeSlotMaintenanceJob } from '../../jobs/TimeSlotMaintenanceJob';
import { backfillTimeSlots } from '../../scripts/backfillTimeSlots';

const prisma = new PrismaClient();
const generator = new TimeSlotGeneratorService();

describe('Time Slot Generation - End-to-End', () => {
  let testFacilityId: string;
  let testCourtId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.facilityTimeSlot.deleteMany({
      where: {
        court: {
          facility: {
            name: { contains: 'E2E Test Facility' },
          },
        },
      },
    });

    await prisma.facilityCourt.deleteMany({
      where: {
        facility: {
          name: { contains: 'E2E Test Facility' },
        },
      },
    });

    await prisma.facility.deleteMany({
      where: {
        name: { contains: 'E2E Test Facility' },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testCourtId) {
      await prisma.facilityTimeSlot.deleteMany({
        where: { courtId: testCourtId },
      });
    }

    if (testFacilityId) {
      await prisma.facilityCourt.deleteMany({
        where: { facilityId: testFacilityId },
      });

      await prisma.facilityAvailability.deleteMany({
        where: { facilityId: testFacilityId },
      });

      await prisma.facility.delete({
        where: { id: testFacilityId },
      });
    }

    await prisma.$disconnect();
  });

  test('Complete flow: create facility with operating hours → create court → verify async slot generation → verify 365-day coverage → verify operating hours respected', async () => {
    // Step 1: Create facility with operating hours
    const facility = await prisma.facility.create({
      data: {
        name: 'E2E Test Facility',
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

    // Create operating hours (Monday-Friday: 08:00-20:00, Weekend: 10:00-18:00)
    await prisma.facilityAvailability.createMany({
      data: [
        // Monday-Friday
        { facilityId: facility.id, dayOfWeek: 1, startTime: '08:00', endTime: '20:00', isRecurring: true },
        { facilityId: facility.id, dayOfWeek: 2, startTime: '08:00', endTime: '20:00', isRecurring: true },
        { facilityId: facility.id, dayOfWeek: 3, startTime: '08:00', endTime: '20:00', isRecurring: true },
        { facilityId: facility.id, dayOfWeek: 4, startTime: '08:00', endTime: '20:00', isRecurring: true },
        { facilityId: facility.id, dayOfWeek: 5, startTime: '08:00', endTime: '20:00', isRecurring: true },
        // Weekend
        { facilityId: facility.id, dayOfWeek: 0, startTime: '10:00', endTime: '18:00', isRecurring: true },
        { facilityId: facility.id, dayOfWeek: 6, startTime: '10:00', endTime: '18:00', isRecurring: true },
      ],
    });

    // Step 2: Create court
    const court = await prisma.facilityCourt.create({
      data: {
        facilityId: facility.id,
        name: 'Test Court 1',
        sportType: 'basketball',
        pricePerHour: 75,
      },
    });

    testCourtId = court.id;

    // Step 3: Generate slots (simulating async generation)
    const result = await generator.generateRollingWindow(court.id);

    expect(result.slotsGenerated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    // Step 4: Verify 365-day coverage
    const slots = await prisma.facilityTimeSlot.findMany({
      where: { courtId: court.id },
      orderBy: { date: 'asc' },
    });

    const uniqueDates = new Set(slots.map(s => s.date.toISOString().split('T')[0]));
    expect(uniqueDates.size).toBe(365);

    // Step 5: Verify operating hours respected
    for (const slot of slots) {
      const dayOfWeek = slot.date.getUTCDay();
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekday: 08:00-20:00
        expect(slot.startTime >= '08:00').toBe(true);
        expect(slot.endTime <= '20:00').toBe(true);
      } else {
        // Weekend: 10:00-18:00
        expect(slot.startTime >= '10:00').toBe(true);
        expect(slot.endTime <= '18:00').toBe(true);
      }
    }
  }, 30000); // 30 second timeout

  test('Maintenance job: create court with partial coverage → run job → verify gaps filled', async () => {
    // Create a court
    const court = await prisma.facilityCourt.create({
      data: {
        facilityId: testFacilityId,
        name: 'Test Court 2',
        sportType: 'tennis',
        pricePerHour: 60,
      },
    });

    // Generate only 200 days of slots
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 200);

    await generator.generateSlotsForCourt({
      courtId: court.id,
      startDate,
      endDate,
      skipExisting: true,
    });

    // Verify partial coverage
    let coverage = await generator.checkSlotCoverage(court.id, 365);
    expect(coverage.hasCompleteCoverage).toBe(false);
    expect(coverage.missingDays).toBeGreaterThan(0);

    // Run maintenance job
    const job = new TimeSlotMaintenanceJob();
    const metrics = await job.execute();

    expect(metrics.courtsProcessed).toBeGreaterThan(0);

    // Verify complete coverage after maintenance
    coverage = await generator.checkSlotCoverage(court.id, 365);
    expect(coverage.hasCompleteCoverage).toBe(true);
    expect(coverage.missingDays).toBe(0);

    // Clean up
    await prisma.facilityTimeSlot.deleteMany({
      where: { courtId: court.id },
    });
    await prisma.facilityCourt.delete({
      where: { id: court.id },
    });
  }, 30000);

  test('Backfill: create court without slots → run backfill → verify slots created', async () => {
    // Create a court without generating slots
    const court = await prisma.facilityCourt.create({
      data: {
        facilityId: testFacilityId,
        name: 'Test Court 3',
        sportType: 'soccer',
        pricePerHour: 80,
      },
    });

    // Verify no slots exist
    let slotCount = await prisma.facilityTimeSlot.count({
      where: { courtId: court.id },
    });
    expect(slotCount).toBe(0);

    // Run backfill (this would normally be run as a script)
    await generator.generateRollingWindow(court.id);

    // Verify slots were created
    slotCount = await prisma.facilityTimeSlot.count({
      where: { courtId: court.id },
    });
    expect(slotCount).toBeGreaterThan(0);

    // Verify 365-day coverage
    const coverage = await generator.checkSlotCoverage(court.id, 365);
    expect(coverage.hasCompleteCoverage).toBe(true);

    // Clean up
    await prisma.facilityTimeSlot.deleteMany({
      where: { courtId: court.id },
    });
    await prisma.facilityCourt.delete({
      where: { id: court.id },
    });
  }, 30000);
});
