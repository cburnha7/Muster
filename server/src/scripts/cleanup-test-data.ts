import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test data...\n');

  // Find the owner user
  const ownerUser = await prisma.user.findUnique({
    where: { username: 'owner' },
  });

  if (!ownerUser) {
    console.error('❌ Owner user not found. Please run seed-test-users.ts first.');
    process.exit(1);
  }

  console.log(`✅ Found owner user: ${ownerUser.displayName} (${ownerUser.email})`);
  console.log(`   User ID: ${ownerUser.id}\n`);

  // 1. Delete all facility rentals
  console.log('🗑️  Deleting all facility rentals...');
  const deletedRentals = await prisma.facilityRental.deleteMany({});
  console.log(`   ✅ Deleted ${deletedRentals.count} rentals\n`);

  // 2. Delete all events
  console.log('🗑️  Deleting all events...');
  const deletedEvents = await prisma.event.deleteMany({});
  console.log(`   ✅ Deleted ${deletedEvents.count} events\n`);

  // 3. Ensure all facilities are owned by owner user
  console.log('🏟️  Assigning all facilities to owner user...');
  const updatedFacilities = await prisma.facility.updateMany({
    data: {
      ownerId: ownerUser.id,
    },
  });
  console.log(`   ✅ Updated ${updatedFacilities.count} facilities\n`);

  // 4. List all facilities
  const facilities = await prisma.facility.findMany({
    where: { ownerId: ownerUser.id },
    select: {
      name: true,
      city: true,
      state: true,
      _count: {
        select: {
          courts: true,
        },
      },
    },
  });

  console.log('📊 Facilities owned by "owner" user:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  facilities.forEach((facility, index) => {
    console.log(`${index + 1}. ${facility.name} - ${facility.city}, ${facility.state} (${facility._count.courts} courts)`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 5. Get time slot counts (if TimeSlot model exists)
  try {
    const totalSlots = await prisma.timeSlot.count();
    const availableSlots = await prisma.timeSlot.count({
      where: { status: 'available' },
    });
    const blockedSlots = await prisma.timeSlot.count({
      where: { status: 'blocked' },
    });

    console.log('📅 Time Slot Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total slots: ${totalSlots}`);
    console.log(`   Available: ${availableSlots}`);
    console.log(`   Blocked: ${blockedSlots}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.log('⚠️  Time slot information not available\n');
  }

  console.log('✨ Cleanup complete!');
  console.log('\nTest Setup:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 owner    - Owns all facilities, can manage grounds');
  console.log('👤 host     - Can book time slots and create events');
  console.log('👤 player   - Can join events and book time slots');
  console.log('👤 playerplus - Can join events and book time slots');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning up test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
