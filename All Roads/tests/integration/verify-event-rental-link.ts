/**
 * Verification script for Event-Rental Linking (Task 13.5)
 * 
 * This script verifies that:
 * 1. Events can be linked to rentals in the database
 * 2. The relationship can be queried bidirectionally
 * 3. The schema supports the relationship
 * 
 * Run with: npx tsx tests/integration/verify-event-rental-link.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEventRentalLinking() {
  console.log('🔍 Verifying Event-Rental Linking Implementation...\n');

  try {
    // Step 1: Verify schema has rentalId field
    console.log('✓ Step 1: Checking Event schema for rentalId field...');
    const eventFields = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events' AND column_name = 'rentalId';
    `;
    
    if (Array.isArray(eventFields) && eventFields.length > 0) {
      console.log('  ✓ Event.rentalId field exists in database');
      console.log(`    Type: ${(eventFields[0] as any).data_type}`);
      console.log(`    Nullable: ${(eventFields[0] as any).is_nullable}`);
    } else {
      console.log('  ✗ Event.rentalId field NOT found in database');
      return false;
    }

    // Step 2: Check foreign key constraint
    console.log('\n✓ Step 2: Checking foreign key constraint...');
    const foreignKeys = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'events'
        AND kcu.column_name = 'rentalId';
    `;

    if (Array.isArray(foreignKeys) && foreignKeys.length > 0) {
      const fk = foreignKeys[0] as any;
      console.log('  ✓ Foreign key constraint exists');
      console.log(`    Constraint: ${fk.constraint_name}`);
      console.log(`    References: ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    } else {
      console.log('  ✗ Foreign key constraint NOT found');
      return false;
    }

    // Step 3: Create test data
    console.log('\n✓ Step 3: Creating test data...');
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `verify-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Verify',
        lastName: 'Test',
        dateOfBirth: new Date('1990-01-01'),
      },
    });
    console.log(`  ✓ Created test user: ${testUser.id}`);

    // Create test facility
    const testFacility = await prisma.facility.create({
      data: {
        name: 'Verification Test Facility',
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
    console.log(`  ✓ Created test facility: ${testFacility.id}`);

    // Create test court
    const testCourt = await prisma.facilityCourt.create({
      data: {
        name: 'Verification Court',
        sportType: 'basketball',
        facilityId: testFacility.id,
        capacity: 10,
        isIndoor: true,
      },
    });
    console.log(`  ✓ Created test court: ${testCourt.id}`);

    // Create test time slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const testTimeSlot = await prisma.facilityTimeSlot.create({
      data: {
        courtId: testCourt.id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '16:00',
        status: 'available',
        price: 100,
      },
    });
    console.log(`  ✓ Created test time slot: ${testTimeSlot.id}`);

    // Create test rental
    const testRental = await prisma.facilityRental.create({
      data: {
        userId: testUser.id,
        timeSlotId: testTimeSlot.id,
        status: 'confirmed',
        totalPrice: 100,
        paymentStatus: 'paid',
      },
    });
    console.log(`  ✓ Created test rental: ${testRental.id}`);

    // Step 4: Create event with rental link
    console.log('\n✓ Step 4: Creating event with rental link...');
    const startTime = new Date(tomorrow);
    startTime.setHours(14, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(16, 0, 0, 0);

    const testEvent = await prisma.event.create({
      data: {
        title: 'Verification Test Event',
        description: 'Event created to verify rental linking',
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
    console.log(`  ✓ Created event with rentalId: ${testEvent.id}`);
    console.log(`    Event.rentalId = ${testEvent.rentalId}`);

    // Step 5: Query event → rental (forward relation)
    console.log('\n✓ Step 5: Testing event → rental query...');
    const eventWithRental = await prisma.event.findUnique({
      where: { id: testEvent.id },
      include: {
        rental: {
          include: {
            timeSlot: {
              include: {
                court: {
                  include: {
                    facility: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (eventWithRental?.rental) {
      console.log('  ✓ Successfully queried rental from event');
      console.log(`    Rental ID: ${eventWithRental.rental.id}`);
      console.log(`    Court: ${eventWithRental.rental.timeSlot.court.name}`);
      console.log(`    Facility: ${eventWithRental.rental.timeSlot.court.facility.name}`);
    } else {
      console.log('  ✗ Failed to query rental from event');
      return false;
    }

    // Step 6: Query rental → events (reverse relation)
    console.log('\n✓ Step 6: Testing rental → events query...');
    const rentalWithEvents = await prisma.facilityRental.findUnique({
      where: { id: testRental.id },
      include: {
        events: true,
      },
    });

    if (rentalWithEvents?.events && rentalWithEvents.events.length > 0) {
      console.log('  ✓ Successfully queried events from rental');
      console.log(`    Found ${rentalWithEvents.events.length} event(s)`);
      console.log(`    Event: ${rentalWithEvents.events[0].title}`);
    } else {
      console.log('  ✗ Failed to query events from rental');
      return false;
    }

    // Step 7: Clean up test data
    console.log('\n✓ Step 7: Cleaning up test data...');
    await prisma.event.delete({ where: { id: testEvent.id } });
    await prisma.facilityRental.delete({ where: { id: testRental.id } });
    await prisma.facilityTimeSlot.delete({ where: { id: testTimeSlot.id } });
    await prisma.facilityCourt.delete({ where: { id: testCourt.id } });
    await prisma.facility.delete({ where: { id: testFacility.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('  ✓ Test data cleaned up');

    console.log('\n✅ All verification checks passed!');
    console.log('\nSummary:');
    console.log('  ✓ Event table has rentalId field');
    console.log('  ✓ Foreign key constraint exists');
    console.log('  ✓ Events can be created with rentalId');
    console.log('  ✓ Event → Rental relationship works');
    console.log('  ✓ Rental → Events relationship works');
    
    return true;
  } catch (error) {
    console.error('\n❌ Verification failed with error:');
    console.error(error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyEventRentalLinking()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
