import { PrismaClient } from '@prisma/client';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';

const prisma = new PrismaClient();

/**
 * Backfill time slots for a specific facility
 * Usage: npx ts-node src/scripts/backfill-timeslots-for-facility.ts <facilityId>
 */
async function backfillTimeSlotsForFacility(facilityId?: string) {
  try {
    console.log('🔄 Starting time slot backfill...');

    // Get facility ID from command line or find first facility
    let targetFacilityId = facilityId || process.argv[2];

    if (!targetFacilityId) {
      console.log('No facility ID provided, finding first facility...');
      const firstFacility = await prisma.facility.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      if (!firstFacility) {
        console.error('❌ No active facilities found');
        return;
      }

      targetFacilityId = firstFacility.id;
      console.log(`📍 Using facility: ${firstFacility.name} (${targetFacilityId})`);
    }

    // Get facility with courts
    const facility = await prisma.facility.findUnique({
      where: { id: targetFacilityId },
      include: {
        courts: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        availabilitySlots: {
          where: {
            isRecurring: true,
            specificDate: null,
          },
        },
      },
    });

    if (!facility) {
      console.error(`❌ Facility not found: ${targetFacilityId}`);
      return;
    }

    console.log(`\n📋 Facility: ${facility.name}`);
    console.log(`   Courts: ${facility.courts.length}`);
    console.log(`   Hours of operation: ${facility.availabilitySlots.length} days configured`);

    if (facility.courts.length === 0) {
      console.log('⚠️  No courts found for this facility');
      return;
    }

    if (facility.availabilitySlots.length === 0) {
      console.log('⚠️  No hours of operation configured for this facility');
      console.log('   Please set hours of operation in the Edit Facility screen first');
      return;
    }

    // Initialize time slot generator
    const generator = new TimeSlotGeneratorService();

    // Generate slots for each court
    console.log('\n🏟️  Generating time slots for courts...\n');

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const court of facility.courts) {
      console.log(`   Court: ${court.name} (${court.sportType})`);
      
      const result = await generator.generateRollingWindow(court.id);
      
      console.log(`   ✅ Generated: ${result.slotsGenerated} slots`);
      console.log(`   ⏭️  Skipped: ${result.slotsSkipped} existing slots`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
      
      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.join(', ')}`);
      }
      
      console.log('');
      
      totalGenerated += result.slotsGenerated;
      totalSkipped += result.slotsSkipped;
    }

    console.log('✅ Backfill complete!');
    console.log(`   Total slots generated: ${totalGenerated}`);
    console.log(`   Total slots skipped: ${totalSkipped}`);
    console.log(`   Date range: ${new Date().toLocaleDateString()} - ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  backfillTimeSlotsForFacility()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { backfillTimeSlotsForFacility };
