import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    console.log('\n📚 Bookings in database:');
    if (bookings.length === 0) {
      console.log('No bookings found');
    } else {
      bookings.forEach(booking => {
        console.log(`\n- ${booking.user.email} -> ${booking.event?.title || 'Unknown Event'}`);
        console.log(`  Booking ID: ${booking.id}`);
        console.log(`  User ID: ${booking.userId}`);
        console.log(`  Event ID: ${booking.eventId}`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Payment Status: ${booking.paymentStatus}`);
        console.log(`  Created At: ${booking.createdAt}`);
      });
    }
    console.log(`\nTotal: ${bookings.length} bookings\n`);
  } catch (error) {
    console.error('Error listing bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listBookings();
