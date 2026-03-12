import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCourtTimeSlots() {
  try {
    console.log('Checking court time slots...\n');

    // Get all courts with their time slot counts
    const courts = await prisma.facilityCourt.findMany({
      include: {
        facility: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            timeSlots: true,
          },
        },
      },
    });

    console.log(`Found ${courts.length} courts:\n`);

    for (const court of courts) {
      console.log(`Court: ${court.name} at ${court.facility.name}`);
      console.log(`  Total time slots: ${court._count.timeSlots}`);

      // Get available slots count
      const availableSlots = await prisma.facilityTimeSlot.count({
        where: {
          courtId: court.id,
          status: 'available',
        },
      });

      console.log(`  Available slots: ${availableSlots}`);

      // Get a sample of slots for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySlots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId: court.id,
          date: today,
        },
        orderBy: {
          startTime: 'asc',
        },
        take: 5,
      });

      if (todaySlots.length > 0) {
        console.log(`  Sample slots for today (${today.toISOString().split('T')[0]}):`);
        todaySlots.forEach((slot) => {
          console.log(`    ${slot.startTime} - ${slot.endTime} | ${slot.status} | $${slot.price}`);
        });
      } else {
        console.log(`  No slots found for today`);
      }

      console.log('');
    }
  } catch (error) {
    console.error('Error checking court time slots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCourtTimeSlots();
