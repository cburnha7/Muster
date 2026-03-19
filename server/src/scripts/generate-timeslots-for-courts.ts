import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTimeSlotsForCourts() {
  try {
    console.log('🕐 Generating time slots for all courts...\n');

    // Get all courts
    const courts = await prisma.facilityCourt.findMany({
      where: {
        isActive: true,
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
          },
        },
      },
    });

    if (courts.length === 0) {
      console.log('No courts found.');
      return;
    }

    console.log(`Found ${courts.length} courts\n`);

    let totalSlotsCreated = 0;

    for (const court of courts) {
      console.log(`Processing: ${court.name} at ${court.facility.name}`);

      // Check if court already has time slots
      const existingSlots = await prisma.facilityTimeSlot.count({
        where: { courtId: court.id },
      });

      if (existingSlots > 0) {
        console.log(`  ⏭️  Skipping - already has ${existingSlots} time slots\n`);
        continue;
      }

      // Generate time slots for the next 90 days
      const timeSlots = [];
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(startDate.getDate() + dayOffset);

        // Create slots from 6 AM to 10 PM (16 hours)
        for (let hour = 6; hour < 22; hour++) {
          const startTime = `${String(hour).padStart(2, '0')}:00`;
          const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

          timeSlots.push({
            courtId: court.id,
            date: slotDate,
            startTime,
            endTime,
            price: court.pricePerHour || court.facility.pricePerHour || 50,
            status: 'available',
          });
        }
      }

      // Batch create time slots
      await prisma.facilityTimeSlot.createMany({
        data: timeSlots,
      });

      console.log(`  ✅ Created ${timeSlots.length} time slots\n`);
      totalSlotsCreated += timeSlots.length;
    }

    console.log(`\n🎉 Complete! Created ${totalSlotsCreated} total time slots`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTimeSlotsForCourts();
