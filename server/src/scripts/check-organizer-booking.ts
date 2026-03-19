import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrganizerBooking() {
  try {
    console.log('Checking organizer bookings...\n');

    // Find the host user
    const hostUser = await prisma.user.findFirst({
      where: { email: 'host@muster.app' },
    });

    if (!hostUser) {
      console.log('Host user not found');
      return;
    }

    console.log('Host user:', hostUser.id, hostUser.email);

    // Find events organized by host
    const organizedEvents = await prisma.event.findMany({
      where: { organizerId: hostUser.id },
      select: {
        id: true,
        title: true,
        startTime: true,
        currentParticipants: true,
      },
    });

    console.log('\nEvents organized by host:', organizedEvents.length);
    organizedEvents.forEach(event => {
      console.log(`  - ${event.title} (${event.id})`);
      console.log(`    Start: ${event.startTime}`);
      console.log(`    Participants: ${event.currentParticipants}`);
    });

    // Find bookings by host
    const hostBookings = await prisma.booking.findMany({
      where: { 
        userId: hostUser.id,
        status: 'confirmed',
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            organizerId: true,
          },
        },
      },
    });

    console.log('\nBookings by host:', hostBookings.length);
    hostBookings.forEach(booking => {
      const isOwnEvent = booking.event?.organizerId === hostUser.id;
      console.log(`  - ${booking.event?.title || 'Unknown'} (${booking.eventId})`);
      console.log(`    Booking ID: ${booking.id}`);
      console.log(`    Status: ${booking.status}`);
      console.log(`    Is own event: ${isOwnEvent ? 'YES' : 'NO'}`);
      console.log(`    Event start: ${booking.event?.startTime}`);
    });

    // Check if host has booked their own events
    const ownEventBookings = hostBookings.filter(
      booking => booking.event?.organizerId === hostUser.id
    );

    console.log('\nHost bookings for own events:', ownEventBookings.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizerBooking();
