import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBookings() {
  try {
    console.log('🔍 Debugging bookings...\n');

    // Get player user
    const playerUser = await prisma.user.findFirst({
      where: { email: 'player@muster.app' },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!playerUser) {
      console.log('❌ Player user not found');
      return;
    }

    console.log('👤 Player user:', playerUser);
    console.log('');

    // Get all bookings for player
    const bookings = await prisma.booking.findMany({
      where: { userId: playerUser.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📋 Total bookings for ${playerUser.email}: ${bookings.length}\n`);

    bookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1}:`);
      console.log(`  ID: ${booking.id}`);
      console.log(`  Event ID: ${booking.eventId}`);
      console.log(`  Event Title: ${booking.event?.title || 'N/A'}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Payment Status: ${booking.paymentStatus}`);
      console.log(`  Start Time: ${booking.event?.startTime || 'N/A'}`);
      console.log(`  Created At: ${booking.createdAt}`);
      console.log('');
    });

    // Get upcoming bookings (same logic as backend)
    const now = new Date();
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        userId: playerUser.id,
        event: {
          startTime: { gte: now },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            status: true,
          },
        },
      },
    });

    console.log(`📅 Upcoming bookings: ${upcomingBookings.length}\n`);
    upcomingBookings.forEach((booking, index) => {
      console.log(`Upcoming ${index + 1}: ${booking.event?.title} - ${booking.event?.startTime}`);
    });

    // Check participants table
    console.log('\n🔍 Checking participants table...\n');
    const participants = await prisma.participant.findMany({
      where: { userId: playerUser.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            status: true,
          },
        },
      },
    });

    console.log(`👥 Total participants records: ${participants.length}\n`);
    participants.forEach((participant, index) => {
      console.log(`Participant ${index + 1}:`);
      console.log(`  Event: ${participant.event?.title}`);
      console.log(`  Status: ${participant.status}`);
      console.log(`  Booking ID: ${participant.bookingId || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBookings();
