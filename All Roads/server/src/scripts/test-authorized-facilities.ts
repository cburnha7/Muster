import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAuthorizedFacilities() {
  try {
    const hostUserId = 'd85bc42c-2368-4337-a486-8d88ff31ccfb';
    
    console.log('Testing authorized facilities for host user...\n');
    console.log(`Host user ID: ${hostUserId}\n`);

    // Check owned facilities
    const ownedFacilities = await prisma.facility.findMany({
      where: {
        ownerId: hostUserId,
        isActive: true,
      },
    });
    console.log(`Owned facilities: ${ownedFacilities.length}`);

    // Check rentals
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    console.log(`Today (normalized): ${today.toISOString()}\n`);

    const rentals = await prisma.facilityRental.findMany({
      where: {
        userId: hostUserId,
        status: 'confirmed',
        usedForEventId: null,
      },
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

    console.log(`Total rentals for host: ${rentals.length}`);
    
    rentals.forEach((rental, index) => {
      const slotDate = new Date(rental.timeSlot.date);
      console.log(`\nRental ${index + 1}:`);
      console.log(`  Facility: ${rental.timeSlot.court.facility.name}`);
      console.log(`  Date: ${rental.timeSlot.date.toISOString()}`);
      console.log(`  Date >= today: ${slotDate >= today}`);
      console.log(`  Status: ${rental.status}`);
      console.log(`  Used for event: ${rental.usedForEventId || 'No'}`);
    });

    // Test with date filter
    const futureRentals = await prisma.facilityRental.findMany({
      where: {
        userId: hostUserId,
        status: 'confirmed',
        usedForEventId: null,
        timeSlot: {
          date: { gte: today },
        },
      },
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

    console.log(`\nFuture rentals (with date filter): ${futureRentals.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthorizedFacilities();
