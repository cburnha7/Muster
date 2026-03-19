import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix event times that were incorrectly stored as UTC when they should be local
 * This adds 4 hours to events that were created with the UTC bug
 */
async function fixEventTimes() {
  try {
    console.log('\n🔧 Fixing event times...\n');

    // Get all events
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    });

    if (events.length === 0) {
      console.log('No events found to fix');
      return;
    }

    console.log(`Found ${events.length} event(s) to check\n`);

    let fixedCount = 0;

    for (const event of events) {
      const oldStart = new Date(event.startTime);
      const oldEnd = new Date(event.endTime);

      // Add 4 hours (EDT offset from UTC)
      const newStart = new Date(oldStart.getTime() + 4 * 60 * 60 * 1000);
      const newEnd = new Date(oldEnd.getTime() + 4 * 60 * 60 * 1000);

      console.log(`📅 ${event.title}`);
      console.log(`   Old: ${oldStart.toLocaleString()} - ${oldEnd.toLocaleString()}`);
      console.log(`   New: ${newStart.toLocaleString()} - ${newEnd.toLocaleString()}`);

      // Update the event
      await prisma.event.update({
        where: { id: event.id },
        data: {
          startTime: newStart,
          endTime: newEnd,
        },
      });

      fixedCount++;
      console.log(`   ✅ Fixed\n`);
    }

    console.log(`\n✅ Fixed ${fixedCount} event(s)\n`);
  } catch (error) {
    console.error('❌ Error fixing event times:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEventTimes();
