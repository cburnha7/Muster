import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUsedRentals() {
  try {
    console.log('🔄 Clearing usedForEventId from all rentals...');

    const result = await prisma.facilityRental.updateMany({
      where: {
        usedForEventId: { not: null },
      },
      data: {
        usedForEventId: null,
      },
    });

    console.log(`✅ Cleared ${result.count} rentals`);

    // Show rentals that are now available
    const availableRentals = await prisma.facilityRental.findMany({
      where: {
        status: 'confirmed',
        usedForEventId: null,
      },
      select: {
        id: true,
        userId: true,
        timeSlot: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            court: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(`\n📋 Available rentals: ${availableRentals.length}`);
    availableRentals.forEach((rental) => {
      console.log(`  - ${rental.timeSlot.court.name}: ${rental.timeSlot.date} ${rental.timeSlot.startTime}-${rental.timeSlot.endTime}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearUsedRentals();
