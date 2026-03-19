import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMyRentalsEndpoint() {
  try {
    console.log('Testing my-rentals query logic...\n');

    // Get host user
    const hostUser = await prisma.user.findFirst({
      where: { username: 'host' },
    });

    if (!hostUser) {
      console.log('Host user not found');
      return;
    }

    console.log(`Host user ID: ${hostUser.id}\n`);

    // Test the exact query used by the endpoint
    const where: any = { userId: hostUser.id };
    // Normalize to start of day for date comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    where.timeSlot = {
      date: { gte: today },
    };

    console.log('Query where clause:', JSON.stringify(where, null, 2));
    console.log(`Current date: ${new Date().toISOString()}\n`);

    const rentals = await prisma.facilityRental.findMany({
      where,
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
      orderBy: {
        timeSlot: {
          date: 'asc',
        },
      },
    });

    console.log(`Found ${rentals.length} rentals:\n`);

    rentals.forEach((rental, index) => {
      console.log(`${index + 1}. ${rental.timeSlot.court.facility.name} - ${rental.timeSlot.court.name}`);
      console.log(`   Date: ${rental.timeSlot.date.toISOString()}`);
      console.log(`   Time: ${rental.timeSlot.startTime} - ${rental.timeSlot.endTime}`);
      console.log(`   Status: ${rental.status}`);
      console.log(`   Used for event: ${rental.usedForEventId || 'No'}`);
      console.log('');
    });

    // Test without upcoming filter
    console.log('\n--- Testing without upcoming filter ---\n');
    const allRentals = await prisma.facilityRental.findMany({
      where: { userId: hostUser.id },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${allRentals.length} total rentals for host user`);
  } catch (error) {
    console.error('Error testing query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMyRentalsEndpoint();
