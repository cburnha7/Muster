import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeFacilities() {
  try {
    console.log('🗑️ Starting facility wipe...');

    // Delete in order due to foreign key constraints
    console.log('Deleting facility rentals...');
    const rentalsDeleted = await prisma.facilityRental.deleteMany({});
    console.log(`✅ Deleted ${rentalsDeleted.count} rentals`);

    console.log('Deleting facility timeslots...');
    const timeslotsDeleted = await prisma.facilityTimeSlot.deleteMany({});
    console.log(`✅ Deleted ${timeslotsDeleted.count} timeslots`);

    console.log('Deleting facility court availability...');
    const courtAvailDeleted = await prisma.facilityCourtAvailability.deleteMany({});
    console.log(`✅ Deleted ${courtAvailDeleted.count} court availability records`);

    console.log('Deleting facility courts...');
    const courtsDeleted = await prisma.facilityCourt.deleteMany({});
    console.log(`✅ Deleted ${courtsDeleted.count} courts`);

    console.log('Deleting facility access images...');
    const imagesDeleted = await prisma.facilityAccessImage.deleteMany({});
    console.log(`✅ Deleted ${imagesDeleted.count} access images`);

    console.log('Deleting facility availability slots...');
    const availDeleted = await prisma.facilityAvailability.deleteMany({});
    console.log(`✅ Deleted ${availDeleted.count} availability slots`);

    console.log('Deleting facility rate schedules...');
    const ratesDeleted = await prisma.facilityRateSchedule.deleteMany({});
    console.log(`✅ Deleted ${ratesDeleted.count} rate schedules`);

    console.log('Deleting facility verifications...');
    const verificationsDeleted = await prisma.facilityVerification.deleteMany({});
    console.log(`✅ Deleted ${verificationsDeleted.count} verifications`);

    console.log('Deleting reviews...');
    const reviewsDeleted = await prisma.review.deleteMany({});
    console.log(`✅ Deleted ${reviewsDeleted.count} reviews`);

    console.log('Deleting bookings...');
    const bookingsDeleted = await prisma.booking.deleteMany({});
    console.log(`✅ Deleted ${bookingsDeleted.count} bookings`);

    console.log('Deleting facilities...');
    const facilitiesDeleted = await prisma.facility.deleteMany({});
    console.log(`✅ Deleted ${facilitiesDeleted.count} facilities`);

    console.log('✅ All facilities wiped successfully!');
  } catch (error) {
    console.error('❌ Error wiping facilities:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

wipeFacilities()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
