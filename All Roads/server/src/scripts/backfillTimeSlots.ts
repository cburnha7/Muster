import { PrismaClient } from '@prisma/client';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';

const prisma = new PrismaClient();
const generator = new TimeSlotGeneratorService();

async function backfillTimeSlots() {
  console.log('🔄 Starting time slot backfill...');

  try {
    // Find all courts with zero time slots
    const courtsWithoutSlots = await prisma.facilityCourt.findMany({
      where: {
        isActive: true,
        timeSlots: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        facility: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`📊 Found ${courtsWithoutSlots.length} courts without time slots`);

    if (courtsWithoutSlots.length === 0) {
      console.log('✅ All courts already have time slots');
      return;
    }

    let totalSlotsGenerated = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each court
    for (let i = 0; i < courtsWithoutSlots.length; i++) {
      const court = courtsWithoutSlots[i];
      const progress = `[${i + 1}/${courtsWithoutSlots.length}]`;

      console.log(`${progress} Processing: ${court.facility.name} - ${court.name}`);

      try {
        const result = await generator.generateRollingWindow(court.id);

        totalSlotsGenerated += result.slotsGenerated;
        successCount++;

        console.log(`  ✅ Generated ${result.slotsGenerated} slots`);
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ Failed: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📈 Backfill Summary:');
    console.log(`  Courts processed: ${courtsWithoutSlots.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log(`  Total slots generated: ${totalSlotsGenerated}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some courts failed. Check logs for details.');
      process.exit(1);
    } else {
      console.log('\n✅ Backfill completed successfully!');
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  backfillTimeSlots();
}

export { backfillTimeSlots };
