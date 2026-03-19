import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEventSlots() {
  try {
    console.log('=== Debugging Event Slots ===\n');

    // Get host user
    const hostUser = await prisma.user.findUnique({
      where: { email: 'host@muster.app' },
    });

    if (!hostUser) {
      console.log('❌ Host user not found');
      return;
    }

    console.log(`✓ Host user found: ${hostUser.id} (${hostUser.email})\n`);

    // Get Rowe facility
    const rowe = await prisma.facility.findFirst({
      where: { 
        name: {
          contains: 'Rowe',
        },
      },
      include: {
        courts: {
          where: { isActive: true },
        },
      },
    });

    if (!rowe) {
      console.log('❌ Rowe facility not found');
      return;
    }

    console.log(`✓ Rowe facility found: ${rowe.id}`);
    console.log(`  Owner: ${rowe.ownerId}`);
    console.log(`  Courts: ${rowe.courts.length}\n`);

    // Check each court
    for (const court of rowe.courts) {
      console.log(`\n--- Court: ${court.name} (${court.id}) ---`);

      // Get time slots for this court
      const slots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId: court.id,
          date: {
            gte: new Date(),
          },
        },
        include: {
          rental: true,
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
        take: 20,
      });

      console.log(`Total slots: ${slots.length}`);

      // Filter for host's rentals
      const hostRentals = slots.filter(
        slot => slot.rental && slot.rental.userId === hostUser.id
      );

      console.log(`Host's rentals: ${hostRentals.length}`);

      if (hostRentals.length > 0) {
        console.log('\nHost rental details:');
        hostRentals.forEach(slot => {
          const rental = slot.rental!;
          console.log(`  - ${slot.date.toISOString().split('T')[0]} ${slot.startTime}-${slot.endTime}`);
          console.log(`    Slot status: ${slot.status}`);
          console.log(`    Rental status: ${rental.status}`);
          console.log(`    Used for event: ${rental.usedForEventId || 'No'}`);
          console.log(`    Rental ID: ${rental.id}`);
          
          // Check if selectable
          const isUserRental = rental.userId === hostUser.id && !rental.usedForEventId;
          const isSelectable = isUserRental && rental.status === 'confirmed';
          console.log(`    Is selectable: ${isSelectable ? '✓ YES' : '✗ NO'}`);
          
          if (!isSelectable) {
            if (rental.status !== 'confirmed') {
              console.log(`    Reason: Rental status is ${rental.status}, not confirmed`);
            }
            if (rental.usedForEventId) {
              console.log(`    Reason: Already used for event ${rental.usedForEventId}`);
            }
          }
        });
      }

      // Check available slots
      const availableSlots = slots.filter(slot => slot.status === 'available');
      console.log(`\nAvailable slots: ${availableSlots.length}`);
    }

    console.log('\n=== Debug Complete ===');
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEventSlots();
