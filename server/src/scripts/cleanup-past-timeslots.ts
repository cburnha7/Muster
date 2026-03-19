import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cleanup past time slots that are not rented.
 * Slots with status 'available' or 'blocked' whose date+time is in the past are deleted.
 * Rented slots are preserved for historical records.
 *
 * Usage: npx ts-node src/scripts/cleanup-past-timeslots.ts [--dry-run]
 */
async function cleanupPastTimeSlots(dryRun = false) {
  const now = new Date();
  console.log(`🧹 Starting past time slot cleanup at ${now.toISOString()}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no deletions)' : 'LIVE'}\n`);

  try {
    // Find all non-rented slots where the date is in the past (before today)
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(23, 59, 59, 999);

    // First pass: delete slots from days that have fully passed
    const pastDaySlots = await prisma.facilityTimeSlot.findMany({
      where: {
        date: { lt: yesterday },
        status: { in: ['available', 'blocked'] },
      },
      select: { id: true, date: true, startTime: true, courtId: true },
    });

    console.log(`📅 Found ${pastDaySlots.length} slots from past days (available/blocked)`);

    // Second pass: find today's slots whose start time has passed
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const todaySlots = await prisma.facilityTimeSlot.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { in: ['available', 'blocked'] },
      },
      select: { id: true, date: true, startTime: true, courtId: true },
    });

    // Filter to only those whose start time has passed
    const pastTodaySlots = todaySlots.filter(slot => {
      const slotDateTime = new Date(slot.date);
      const [h, m] = slot.startTime.split(':').map(Number);
      slotDateTime.setUTCHours(h, m, 0, 0);
      return slotDateTime.getTime() <= now.getTime();
    });

    console.log(`⏰ Found ${pastTodaySlots.length} slots from today with past start times`);

    const allSlotsToDelete = [...pastDaySlots, ...pastTodaySlots];
    const totalToDelete = allSlotsToDelete.length;

    if (totalToDelete === 0) {
      console.log('\n✅ No past slots to clean up');
      return { deleted: 0 };
    }

    console.log(`\n🗑️  Total slots to delete: ${totalToDelete}`);

    if (dryRun) {
      console.log('\n📋 Sample of slots that would be deleted:');
      allSlotsToDelete.slice(0, 10).forEach(slot => {
        console.log(`   - ${slot.date.toISOString().split('T')[0]} ${slot.startTime} (court: ${slot.courtId.slice(0, 8)}...)`);
      });
      if (totalToDelete > 10) {
        console.log(`   ... and ${totalToDelete - 10} more`);
      }
      console.log('\n⚠️  DRY RUN - no slots were deleted');
      return { deleted: 0, wouldDelete: totalToDelete };
    }

    // Delete in batches to avoid overwhelming the database
    const batchSize = 1000;
    let deleted = 0;

    for (let i = 0; i < allSlotsToDelete.length; i += batchSize) {
      const batch = allSlotsToDelete.slice(i, i + batchSize);
      const ids = batch.map(s => s.id);

      const result = await prisma.facilityTimeSlot.deleteMany({
        where: { id: { in: ids } },
      });

      deleted += result.count;
      console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${result.count} slots`);
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deleted} past time slots`);
    return { deleted };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');

  cleanupPastTimeSlots(dryRun)
    .then(result => {
      console.log('\n✅ Script completed successfully');
      console.log(`   Result: ${JSON.stringify(result)}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { cleanupPastTimeSlots };
