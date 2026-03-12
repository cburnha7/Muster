Error Details (Dev Only):
ReferenceError: selectedSlot is not defined

const prisma = new PrismaClient();

async function main() {
  console.log('🏟️  Assigning all facilities to owner user...\n');

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

  // Get all facilities
  const facilities = await prisma.facility.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  console.log(`📊 Found ${facilities.length} facilities\n`);

  if (facilities.length === 0) {
    console.log('⚠️  No facilities found in database.');
    return;
  }

  // Update all facilities to be owned by owner user
  const updateResult = await prisma.facility.updateMany({
    data: {
      ownerId: ownerUser.id,
    },
  });

  console.log(`✅ Updated ${updateResult.count} facilities`);
  console.log('\nFacilities now owned by "owner" user:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // List all facilities
  const updatedFacilities = await prisma.facility.findMany({
    where: { ownerId: ownerUser.id },
    select: {
      name: true,
      city: true,
      state: true,
    },
  });

  updatedFacilities.forEach((facility, index) => {
    console.log(`${index + 1}. ${facility.name} - ${facility.city}, ${facility.state}`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ All facilities assigned to owner user!');
}

main()
  .catch((e) => {
    console.error('❌ Error assigning facilities:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
