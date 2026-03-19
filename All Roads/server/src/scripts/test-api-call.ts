import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing API call simulation...\n');

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

  if (!roweFacility || roweFacility.courts.length === 0) {
    console.log('❌ Rowe facility or courts not found');
    return;
  }

  const court = roweFacility.courts[0];
  console.log(`✅ Testing with: ${roweFacility.name} - ${court.name}`);
  console.log(`   Facility ID: ${roweFacility.id}`);
  console.log(`   Court ID: ${court.id}\n`);

  // Test different date formats
  const dateFormats = [
    '2026-03-11',
    '2026-03-12',
    new Date('2026-03-11').toISOString(),
    new Date().toISOString().split('T')[0],
  ];

  for (const dateStr of dateFormats) {
    console.log(`\n📅 Testing date format: "${dateStr}"`);
    
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);
    
    console.log(`   Parsed to: ${targetDate.toISOString()}`);
    console.log(`   Local: ${targetDate.toLocaleString()}`);

    const timeSlots = await prisma.facilityTimeSlot.findMany({
      where: {
        courtId: court.id,
        date: targetDate,
      },
      orderBy: { startTime: 'asc' },
    });

    console.log(`   ✅ Found ${timeSlots.length} slots`);
    
    if (timeSlots.length > 0) {
      console.log(`   First slot: ${timeSlots[0].startTime} - ${timeSlots[0].endTime}`);
    }
  }

  // Check what dates actually exist in the database
  console.log('\n\n📊 Dates in database for this court:');
  const allSlots = await prisma.facilityTimeSlot.findMany({
    where: { courtId: court.id },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
    take: 10,
  });

  allSlots.forEach(slot => {
    console.log(`   ${slot.date.toISOString()} (${slot.date.toLocaleDateString()})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
