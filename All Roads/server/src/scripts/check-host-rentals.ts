import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHostRentals() {
  try {
    const hostUser = await prisma.user.findUnique({
      where: { email: 'host@muster.app' },
    });

    if (!hostUser) {
      console.log('❌ Host user not found');
      return;
    }

    console.log(`\n✓ Host user: ${hostUser.email} (${hostUser.id})\n`);

    // Get all rentals for host
    const rentals = await prisma.facilityRental.findMany({
      where: {
        userId: hostUser.id,
      },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${rentals.length} rentals for host:\n`);

    if (rentals.length === 0) {
      console.log('No rentals found for host user.');
      console.log('\nThe host user needs to book time slots before they can create events from rentals.');
    } else {
      rentals.forEach((rental: any) => {
        const slot = rental.timeSlot;
        const court = slot.court;
        const facility = court.facility;

        console.log(`- ${facility.name} - ${court.name}`);
        console.log(`  Date: ${slot.date.toISOString().split('T')[0]}`);
        console.log(`  Time: ${slot.startTime} - ${slot.endTime}`);
        console.log(`  Status: ${rental.status}`);
        console.log(`  Used for event: ${rental.usedForEventId || 'No'}`);
        console.log(`  Rental ID: ${rental.id}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHostRentals();
