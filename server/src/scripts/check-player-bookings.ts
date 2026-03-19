import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlayerBookings() {
  try {
    // Find player user
    const player = await prisma.user.findUnique({
      where: { email: 'player@muster.app' },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!player) {
      console.log('❌ Player user not found');
      return;
    }

    console.log('👤 Player user:', player.email, player.id);

    // Get all bookings for player
    const bookings = await prisma.booking.findMany({
      where: { userId: player.id },
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
      },
    });

    console.log('\n📚 Bookings for player:', bookings.length);
    bookings.forEach(booking => {
      console.log(`  - ${booking.event?.title}`);
      console.log(`    Event ID: ${booking.eventId}`);
      console.log(`    Booking ID: ${booking.id}`);
      console.log(`    Status: ${booking.status}`);
      console.log(`    Start: ${booking.event?.startTime}`);
      console.log('');
    });

    // Get all events
    const allEvents = await prisma.event.findMany({
      where: {
        startTime: { gte: new Date() },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        currentParticipants: true,
        maxParticipants: true,
      },
      orderBy: { startTime: 'asc' },
    });

    console.log('\n📅 All upcoming events:', allEvents.length);
    for (const event of allEvents) {
      // Check if player has booking for this event
      const hasBooking = bookings.some(b => b.eventId === event.id);
      
      // Get all bookings for this event
      const eventBookings = await prisma.booking.findMany({
        where: { eventId: event.id, status: 'confirmed' },
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      console.log(`\n  ${event.title}`);
      console.log(`    Event ID: ${event.id}`);
      console.log(`    Participants: ${event.currentParticipants}/${event.maxParticipants}`);
      console.log(`    Bookings: ${eventBookings.length}`);
      console.log(`    Player has booking: ${hasBooking ? 'YES' : 'NO'}`);
      
      if (eventBookings.length > 0) {
        console.log(`    Booked by:`);
        eventBookings.forEach(b => {
          console.log(`      - ${b.user.email}${b.userId === player.id ? ' (PLAYER)' : ''}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayerBookings();
