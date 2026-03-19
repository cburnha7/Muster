import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRentalTimeSlot() {
  try {
    const rental = await prisma.facilityRental.findFirst({
      where: { id: '14d748dc-2f1a-43b0-869c-51200a72a8c4' },
      include: {
        timeSlot: {
          include: {
            court: true,
          },
        },
      },
    });

    console.log('\nRental details:');
    console.log(JSON.stringify(rental, null, 2));

    if (rental) {
      console.log('\n\nTimeSlot ID:', rental.timeSlotId);
      console.log('Court ID:', rental.timeSlot.courtId);
      console.log('Court Name:', rental.timeSlot.court.name);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRentalTimeSlot();
