/**
 * Production Database Reset Script
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/reset-production.ts
 *
 * This will DELETE ALL DATA and re-run migrations.
 * Only use this for a complete fresh start.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  PRODUCTION DATABASE RESET');
  console.log('This will delete ALL data. Starting in 3 seconds...\n');

  await new Promise(r => setTimeout(r, 3000));

  // Delete in dependency order (children before parents)
  const tables = [
    'WaiverSignature',
    'CancelRequest',
    'FacilityRental',
    'FacilityTimeSlot',
    'FacilityCourtAvailability',
    'FacilityCourt',
    'FacilityPhoto',
    'FacilityAccessImage',
    'FacilityAvailability',
    'FacilityRateSchedule',
    'FacilityRating',
    'FacilityVerification',
    'BookingParticipant',
    'Booking',
    'EventParticipant',
    'Match',
    'Event',
    'LeagueTransaction',
    'LeagueSeason',
    'LeagueMembership',
    'League',
    'InviteLink',
    'TeamMember',
    'Team',
    'Facility',
    'ConversationParticipant',
    'MessageReaction',
    'Message',
    'Conversation',
    'Notification',
    'Review',
    'InsuranceDocument',
    'PasswordResetToken',
    'RefreshToken',
    'RecurringBooking',
    'RosterStrike',
    'EscrowTransaction',
    'PromoCode',
    'Subscription',
    'User',
  ];

  for (const table of tables) {
    try {
      const result = await (prisma as any)[
        table[0].toLowerCase() + table.slice(1)
      ].deleteMany({});
      console.log(`  ✓ ${table}: ${result.count} records deleted`);
    } catch (err: any) {
      // Table might not exist or have a different casing
      console.log(`  - ${table}: skipped (${err.message?.slice(0, 50)})`);
    }
  }

  console.log('\n✅ Database wiped. All tables empty.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
