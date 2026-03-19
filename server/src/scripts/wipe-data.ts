import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeData() {
  try {
    console.log('🗑️  Starting data wipe...');

    // Delete in order to respect foreign key constraints
    
    // 1. Delete bookings (they reference events)
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`✅ Deleted ${deletedBookings.count} bookings`);

    // 2. Delete events (they reference facilities and rentals)
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`✅ Deleted ${deletedEvents.count} events`);

    // 3. Delete facility rentals (they reference time slots)
    const deletedRentals = await prisma.facilityRental.deleteMany({});
    console.log(`✅ Deleted ${deletedRentals.count} rentals`);

    // 4. Delete time slots (they reference courts)
    const deletedTimeSlots = await prisma.facilityTimeSlot.deleteMany({});
    console.log(`✅ Deleted ${deletedTimeSlots.count} time slots`);

    // 5. Delete court availability
    const deletedCourtAvailability = await prisma.facilityCourtAvailability.deleteMany({});
    console.log(`✅ Deleted ${deletedCourtAvailability.count} court availability records`);

    // 6. Delete courts (they reference facilities)
    const deletedCourts = await prisma.facilityCourt.deleteMany({});
    console.log(`✅ Deleted ${deletedCourts.count} courts`);

    // 7. Delete facility verifications (they reference facilities)
    const deletedVerifications = await prisma.facilityVerification.deleteMany({});
    console.log(`✅ Deleted ${deletedVerifications.count} facility verifications`);

    // 8. Delete facility availability
    const deletedAvailability = await prisma.facilityAvailability.deleteMany({});
    console.log(`✅ Deleted ${deletedAvailability.count} facility availability records`);

    // 9. Delete facility rate schedules
    const deletedRateSchedules = await prisma.facilityRateSchedule.deleteMany({});
    console.log(`✅ Deleted ${deletedRateSchedules.count} rate schedules`);

    // 10. Delete facility access images
    const deletedAccessImages = await prisma.facilityAccessImage.deleteMany({});
    console.log(`✅ Deleted ${deletedAccessImages.count} access images`);

    // 11. Delete facilities
    const deletedFacilities = await prisma.facility.deleteMany({});
    console.log(`✅ Deleted ${deletedFacilities.count} facilities`);

    console.log('');
    console.log('🎉 Data wipe complete!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Facilities: ${deletedFacilities.count}`);
    console.log(`  - Courts: ${deletedCourts.count}`);
    console.log(`  - Time Slots: ${deletedTimeSlots.count}`);
    console.log(`  - Events: ${deletedEvents.count}`);
    console.log(`  - Bookings: ${deletedBookings.count}`);
    console.log(`  - Rentals: ${deletedRentals.count}`);

  } catch (error) {
    console.error('❌ Error wiping data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

wipeData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
