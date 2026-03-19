import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEventPrices() {
  try {
    console.log('🔍 Checking event prices in database...\n');

    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        currentParticipants: true,
        maxParticipants: true,
        startTime: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    console.log(`Found ${events.length} events:\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Price: $${event.price.toFixed(2)}`);
      console.log(`   Participants: ${event.currentParticipants}/${event.maxParticipants}`);
      console.log(`   Start: ${event.startTime.toISOString()}`);
      console.log(`   ID: ${event.id}`);
      console.log('');
    });

    // Check for any events with basketball/hoops
    const basketballEvents = events.filter(e => 
      e.title.toLowerCase().includes('basketball') || 
      e.title.toLowerCase().includes('hoops')
    );

    if (basketballEvents.length > 0) {
      console.log('\n🏀 Basketball/Hoops events:');
      basketballEvents.forEach(event => {
        console.log(`   - ${event.title}: $${event.price.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('Error checking event prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEventPrices();
