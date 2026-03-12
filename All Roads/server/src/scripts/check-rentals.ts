import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRentals() {
  try {
    console.log('Checking rentals in database...\n');

    // Get all rentals
    const rentals = await prisma.facilityRental.findMany({
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
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

    console.log(`Found ${rentals.length} rentals:\n`);

    rentals.forEach((rental, index) => {
      console.log(`${index + 1}. Rental ID: ${rental.id}`);
      console.log(`   User: ${rental.user.username} (${rental.user.firstName} ${rental.user.lastName})`);
      console.log(`   Facility: ${rental.timeSlot.court.facility.name}`);
      console.log(`   Court: ${rental.timeSlot.court.name}`);
      console.log(`   Date: ${rental.timeSlot.date.toISOString().split('T')[0]}`);
      console.log(`   Time: ${rental.timeSlot.startTime} - ${rental.timeSlot.endTime}`);
      console.log(`   Status: ${rental.status}`);
      console.log(`   Used for event: ${rental.usedForEventId || 'No'}`);
      console.log(`   Created: ${rental.createdAt.toISOString()}`);
      console.log('');
    });

    // Check host user specifically
    const hostUser = await prisma.user.findFirst({
      where: { username: 'host' },
    });

    if (hostUser) {
      const hostRentals = rentals.filter((r) => r.userId === hostUser.id);
      console.log(`\nHost user has ${hostRentals.length} rentals`);
    }
  } catch (error) {
    console.error('Error checking rentals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRentals();
