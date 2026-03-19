import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🕐 Generating time slots for Rowe courts...\n');

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

  console.log(`✅ Found facility: ${roweFacility.name}`);
  console.log(`   Courts: ${roweFacility.courts.length}\n`);

  if (roweFacility.courts.length === 0) {
    console.log('⚠️  No courts found');
    return;
  }

  // Generate time slots for the next 30 days
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  endDate.setHours(23, 59, 59, 999);

  // Time slots: 6 AM to 10 PM (16 hours), 1-hour slots
  const timeSlots = [
    { start: '06:00', end: '07:00' },
    { start: '07:00', end: '08:00' },
    { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:00', end: '12:00' },
    { start: '12:00', end: '13:00' },
    { start: '13:00', end: '14:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' },
    { start: '17:00', end: '18:00' },
    { start: '18:00', end: '19:00' },
    { start: '19:00', end: '20:00' },
    { start: '20:00', end: '21:00' },
    { start: '21:00', end: '22:00' },
  ];

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const court of roweFacility.courts) {
    console.log(`\n🏟️  Processing: ${court.name} (${court.sportType})`);
    
    const price = court.pricePerHour || roweFacility.pricePerHour || 50;
    let courtCreated = 0;
    let courtSkipped = 0;

    // Generate slots for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      for (const slot of timeSlots) {
        // Check if slot already exists
        const existing = await prisma.facilityTimeSlot.findUnique({
          where: {
            courtId_date_startTime: {
              courtId: court.id,
              date: new Date(currentDate),
              startTime: slot.start,
            },
          },
        });

        if (existing) {
          courtSkipped++;
          continue;
        }

        // Create time slot
        await prisma.facilityTimeSlot.create({
          data: {
            courtId: court.id,
            date: new Date(currentDate),
            startTime: slot.start,
            endTime: slot.end,
            status: 'available',
            price,
          },
        });

        courtCreated++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`   ✅ Created: ${courtCreated} slots`);
    if (courtSkipped > 0) {
      console.log(`   ⏭️  Skipped: ${courtSkipped} existing slots`);
    }

    totalCreated += courtCreated;
    totalSkipped += courtSkipped;
  }

  console.log(`\n✨ Time slot generation complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total slots created: ${totalCreated}`);
  console.log(`   - Total slots skipped: ${totalSkipped}`);
  console.log(`   - Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
  console.log(`   - Time range: 6:00 AM to 10:00 PM`);
  console.log(`   - Slot duration: 1 hour`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
