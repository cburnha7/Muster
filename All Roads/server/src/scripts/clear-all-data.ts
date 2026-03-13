/**
 * Clear All Data Script
 * 
 * Wipes all events, teams/rosters, leagues, facilities/grounds, bookings, and related data
 * while preserving users and database structure.
 * 
 * Usage: npx tsx src/scripts/clear-all-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🧹 Starting data cleanup...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    console.log('Deleting salutes...');
    const salutes = await prisma.salute.deleteMany({});
    console.log(`✅ Deleted ${salutes.count} salutes`);

    console.log('Deleting player votes...');
    const votes = await prisma.playerVote.deleteMany({});
    console.log(`✅ Deleted ${votes.count} player votes`);

    console.log('Deleting game participations...');
    const participations = await prisma.gameParticipation.deleteMany({});
    console.log(`✅ Deleted ${participations.count} game participations`);

    console.log('Deleting bookings...');
    const bookings = await prisma.booking.deleteMany({});
    console.log(`✅ Deleted ${bookings.count} bookings`);

    console.log('Deleting matches...');
    const matches = await prisma.match.deleteMany({});
    console.log(`✅ Deleted ${matches.count} matches`);

    console.log('Deleting events...');
    const events = await prisma.event.deleteMany({});
    console.log(`✅ Deleted ${events.count} events`);

    console.log('Deleting facility rentals...');
    const rentals = await prisma.facilityRental.deleteMany({});
    console.log(`✅ Deleted ${rentals.count} facility rentals`);

    console.log('Deleting facility time slots...');
    const timeSlots = await prisma.facilityTimeSlot.deleteMany({});
    console.log(`✅ Deleted ${timeSlots.count} time slots`);

    console.log('Deleting court availability...');
    const courtAvailability = await prisma.facilityCourtAvailability.deleteMany({});
    console.log(`✅ Deleted ${courtAvailability.count} court availability records`);

    console.log('Deleting facility courts...');
    const courts = await prisma.facilityCourt.deleteMany({});
    console.log(`✅ Deleted ${courts.count} courts`);

    console.log('Deleting facility access images...');
    const accessImages = await prisma.facilityAccessImage.deleteMany({});
    console.log(`✅ Deleted ${accessImages.count} access images`);

    console.log('Deleting facility availability...');
    const facilityAvailability = await prisma.facilityAvailability.deleteMany({});
    console.log(`✅ Deleted ${facilityAvailability.count} facility availability records`);

    console.log('Deleting facility rate schedules...');
    const rateSchedules = await prisma.facilityRateSchedule.deleteMany({});
    console.log(`✅ Deleted ${rateSchedules.count} rate schedules`);

    console.log('Deleting verification documents...');
    const verificationDocs = await prisma.verificationDocument.deleteMany({});
    console.log(`✅ Deleted ${verificationDocs.count} verification documents`);

    console.log('Deleting facility verifications...');
    const verifications = await prisma.facilityVerification.deleteMany({});
    console.log(`✅ Deleted ${verifications.count} facility verifications`);

    console.log('Deleting reviews...');
    const reviews = await prisma.review.deleteMany({});
    console.log(`✅ Deleted ${reviews.count} reviews`);

    console.log('Deleting facilities/grounds...');
    const facilities = await prisma.facility.deleteMany({});
    console.log(`✅ Deleted ${facilities.count} facilities/grounds`);

    console.log('Deleting league documents...');
    const leagueDocs = await prisma.leagueDocument.deleteMany({});
    console.log(`✅ Deleted ${leagueDocs.count} league documents`);

    console.log('Deleting certification documents...');
    const certDocs = await prisma.certificationDocument.deleteMany({});
    console.log(`✅ Deleted ${certDocs.count} certification documents`);

    console.log('Deleting league memberships...');
    const leagueMemberships = await prisma.leagueMembership.deleteMany({});
    console.log(`✅ Deleted ${leagueMemberships.count} league memberships`);

    console.log('Deleting seasons...');
    const seasons = await prisma.season.deleteMany({});
    console.log(`✅ Deleted ${seasons.count} seasons`);

    console.log('Deleting team members...');
    const teamMembers = await prisma.teamMember.deleteMany({});
    console.log(`✅ Deleted ${teamMembers.count} roster players`);

    console.log('Deleting teams/rosters...');
    const teams = await prisma.team.deleteMany({});
    console.log(`✅ Deleted ${teams.count} rosters`);

    console.log('Deleting leagues...');
    const leagues = await prisma.league.deleteMany({});
    console.log(`✅ Deleted ${leagues.count} leagues`);

    console.log('\n✨ Data cleanup complete!');
    console.log('\n📊 Summary:');
    console.log(`   Events: ${events.count}`);
    console.log(`   Rosters: ${teams.count}`);
    console.log(`   Leagues: ${leagues.count}`);
    console.log(`   Grounds: ${facilities.count}`);
    console.log(`   Bookings: ${bookings.count}`);
    console.log(`   Rentals: ${rentals.count}`);
    console.log(`   Time Slots: ${timeSlots.count}`);
    console.log('\n🔐 Users preserved for fresh start!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllData()
  .then(() => {
    console.log('\n✅ Ready for production walkthrough!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to clear data:', error);
    process.exit(1);
  });
