import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listEvents() {
  try {
    const events = await prisma.event.findMany({
      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('\n🎯 Events in database:');
    if (events.length === 0) {
      console.log('No events found');
    } else {
      events.forEach(event => {
        console.log(`\n- ${event.title}`);
        console.log(`  ID: ${event.id}`);
        console.log(`  Organizer ID: ${event.organizerId}`);
        console.log(`  Status: ${event.status}`);
        console.log(`  Start: ${event.startTime}`);
        console.log(`  End: ${event.endTime}`);
        console.log(`  Facility: ${event.facility?.name || 'None'}`);
        console.log(`  Sport: ${event.sportType}`);
        console.log(`  Participants: ${event.currentParticipants}/${event.maxParticipants}`);
        console.log(`  Price: $${event.price}`);
      });
    }
    console.log(`\nTotal: ${events.length} events\n`);
  } catch (error) {
    console.error('Error listing events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listEvents();
