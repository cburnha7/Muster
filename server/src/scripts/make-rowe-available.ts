import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Searching for Rowe facility...\n');

  // First, let's find all facilities to see what exists
  const allFacilities = await prisma.facility.findMany({
    select: {
      id: true,
      name: true,
      city: true,
    },
  });

  console.log('📍 Available facilities:');
  allFacilities.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (${f.city}) - ID: ${f.id}`);
  });

  // Try to find Rowe facility (case-insensitive)
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
    console.log('\n❌ No facility found with "Rowe" in the name.');
    console.log('Please check the facility name and try again.');
    return;
  }

  console.log(`\n✅ Found facility: ${roweFacility.name}`);
  console.log(`   Courts: ${roweFacility.courts.length}`);

  if (roweFacility.courts.length === 0) {
    console.log('\n⚠️  No courts found for this facility.');
    return;
  }

  // Delete all existing blocked time slots for these courts
  const courtIds = roweFacility.courts.map(c => c.id);
  
  const deletedAvailability = await prisma.facilityCourtAvailability.deleteMany({
    where: {
      courtId: {
        in: courtIds,
      },
      isBlocked: true,
    },
  });

  console.log(`\n🗑️  Deleted ${deletedAvailability.count} blocked availability slots`);
  
  // Also delete any blocked time slots
  const deletedTimeSlots = await prisma.facilityTimeSlot.deleteMany({
    where: {
      courtId: {
        in: courtIds,
      },
      status: 'blocked',
    },
  });

  console.log(`🗑️  Deleted ${deletedTimeSlots.count} blocked time slots`);

  // List all courts
  console.log('\n🏟️  Courts now fully available:');
  roweFacility.courts.forEach((court, i) => {
    console.log(`  ${i + 1}. ${court.name} - ${court.sportType} (${court.isIndoor ? 'Indoor' : 'Outdoor'})`);
  });

  console.log('\n✨ All time slots are now available for Rowe courts!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
