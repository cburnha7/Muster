import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteFootyBooking() {
  try {
    console.log('🔍 Finding Footy event and booking...');

    // Find the Footy event
    const footyEvent = await prisma.event.findFirst({
      where: { title: 'Footy' },
      include: {
        bookings: {
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!footyEvent) {
      console.log('❌ Footy event not found');
      return;
    }

    console.log('✅ Found Footy event:', footyEvent.id);
    console.log('📋 Current participants:', footyEvent.currentParticipants);
    console.log('📋 Bookings:', footyEvent.bookings.length);

    if (footyEvent.bookings.length === 0) {
      console.log('✅ No bookings to delete');
      return;
    }

    // Delete all bookings for Footy event
    console.log('\n🗑️ Deleting bookings...');
    for (const booking of footyEvent.bookings) {
      console.log(`  - Deleting booking ${booking.id} for ${booking.user.email}`);
      await prisma.booking.delete({
        where: { id: booking.id },
      });
    }

    // Update event participant count
    console.log('\n📊 Updating event participant count...');
    await prisma.event.update({
      where: { id: footyEvent.id },
      data: {
        currentParticipants: 0,
      },
    });

    console.log('✅ Successfully deleted all Footy bookings');
    console.log('✅ Event participant count reset to 0');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteFootyBooking();
