import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing availability API...\n');

  // Find Rowe facility
  const roweFacility = await prisma.facility.findFirst({
    where: {
      name: {
        contains: 'rowe',
        mode: 'insensitive',
      },
    },
    include: {
      courts: true,
    },
  });

  if (!roweFacility) {
    console.log('❌ Rowe facility not found');
    return;
  }

  console.log(`✅ Found facility: ${roweFacility.name} (${roweFacility.id})`);
  console.log(`   Courts: ${roweFacility.courts.length}\n`);

  if (roweFacility.courts.length === 0) {
    console.log('⚠️  No courts found');
    return;
  }

  // Test with first court
  const court = roweFacility.courts[0];
  console.log(`🏟️  Testing court: ${court.name} (${court.id})\n`);

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`📅 Checking availability for: ${today.toISOString()}\n`);

  // Query time slots
  const timeSlots = await prisma.facilityTimeSlot.findMany({
    where: {
      courtId: court.id,
      date: today,
    },
    orderBy: { startTime: 'asc' },
  });

  console.log(`📊 Results:`);
  console.log(`   Total slots found: ${timeSlots.length}`);
  
  if (timeSlots.length > 0) {
    const available = timeSlots.filter(s => s.status === 'available').length;
    const rented = timeSlots.filter(s => s.status === 'rented').length;
    const blocked = timeSlots.filter(s => s.status === 'blocked').length;

    console.log(`   Available: ${available}`);
    console.log(`   Rented: ${rented}`);
    console.log(`   Blocked: ${blocked}\n`);

    console.log('📋 Sample slots:');
    timeSlots.slice(0, 5).forEach(slot => {
      console.log(`   ${slot.startTime} - ${slot.endTime}: ${slot.status} ($${slot.price})`);
    });
  } else {
    console.log('\n⚠️  No time slots found for this date!');
    
    // Check if there are any slots at all
    const anySlots = await prisma.facilityTimeSlot.findMany({
      where: { courtId: court.id },
      take: 5,
      orderBy: { date: 'asc' },
    });

    if (anySlots.length > 0) {
      console.log('\n📋 Found slots for other dates:');
      anySlots.forEach(slot => {
        console.log(`   ${slot.date.toISOString().split('T')[0]} ${slot.startTime}: ${slot.status}`);
      });
    }
  }

  // Test the API endpoint logic
  console.log('\n\n🔧 Simulating API endpoint...');
  const targetDate = today;
  
  const apiTimeSlots = await prisma.facilityTimeSlot.findMany({
    where: {
      courtId: court.id,
      date: targetDate,
    },
    orderBy: { startTime: 'asc' },
  });

  const availableSlots = apiTimeSlots.filter(slot => slot.status === 'available');

  const apiResponse = {
    date: targetDate,
    courtId: court.id,
    courtName: court.name,
    totalSlots: apiTimeSlots.length,
    availableSlots: availableSlots.length,
    slots: apiTimeSlots,
  };

  console.log('\n📤 API Response:');
  console.log(JSON.stringify(apiResponse, null, 2));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
