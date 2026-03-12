import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('🔍 Checking bookings in database...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    console.log('👥 Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - ID: ${user.id}`);
    });

    // Get all bookings
    const bookings = await prisma.booking.findMany({
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            currentParticipants: true,
            maxParticipants: true,
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📋 Total bookings: ${bookings.length}\n`);

    bookings.forEach(booking => {
      console.log(`Booking ID: ${booking.id}`);
      console.log(`  User: ${booking.user.email} (${booking.user.firstName} ${booking.user.lastName})`);
      console.log(`  Event: ${booking.event?.title || 'N/A'}`);
      console.log(`  Event ID: ${booking.eventId}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Payment Status: ${booking.paymentStatus}`);
      console.log(`  Start Time: ${booking.event?.startTime}`);
      console.log(`  Created: ${booking.createdAt}`);
      console.log('');
    });

    // Check for "Skate" event specifically
    const skateEvent = await prisma.event.findFirst({
      where: {
        title: {
          contains: 'Skate',
          mode: 'insensitive',
        },
      },
      include: {
        bookings: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (skateEvent) {
      console.log('🛹 Skate Event Details:');
      console.log(`  ID: ${skateEvent.id}`);
      console.log(`  Title: ${skateEvent.title}`);
      console.log(`  Start Time: ${skateEvent.startTime}`);
      console.log(`  Participants: ${skateEvent.currentParticipants}/${skateEvent.maxParticipants}`);
      console.log(`  Bookings: ${skateEvent.bookings.length}`);
      skateEvent.bookings.forEach(booking => {
        console.log(`    - ${booking.user.email}: ${booking.status}`);
      });
    } else {
      console.log('❌ No "Skate" event found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
