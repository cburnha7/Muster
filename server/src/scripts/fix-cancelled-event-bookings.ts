import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill: mark all bookings for cancelled events as cancelled
 */
async function fixCancelledEventBookings() {
  try {
    console.log('\n🔧 Fixing bookings for cancelled events...\n');

    const result = await prisma.booking.updateMany({
      where: {
        event: { status: 'cancelled' },
        status: { not: 'cancelled' },
      },
      data: {
        status: 'cancelled',
        cancellationReason: 'Event cancelled by organizer',
        cancelledAt: new Date(),
      },
    });

    console.log(`✅ Updated ${result.count} booking(s) to cancelled\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCancelledEventBookings();
