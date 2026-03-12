import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('🔍 Checking for duplicate facilities...');

  try {
    // Get all facilities
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Found ${facilities.length} facilities`);

    // Group by name + address
    const facilityMap = new Map<string, typeof facilities>();
    
    for (const facility of facilities) {
      const key = `${facility.name}-${facility.street}-${facility.city}`.toLowerCase();
      
      if (!facilityMap.has(key)) {
        facilityMap.set(key, []);
      }
      
      facilityMap.get(key)!.push(facility);
    }

    // Find duplicates
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    for (const [key, group] of facilityMap.entries()) {
      if (group.length > 1) {
        duplicatesFound++;
        console.log(`\n📍 Found ${group.length} duplicates for: ${group[0].name}`);
        
        // Keep the oldest one (first created), delete the rest
        const toKeep = group[0];
        const toDelete = group.slice(1);
        
        console.log(`  ✅ Keeping: ${toKeep.id} (created ${toKeep.createdAt})`);
        
        for (const duplicate of toDelete) {
          console.log(`  ❌ Deleting: ${duplicate.id} (created ${duplicate.createdAt})`);
          
          try {
            // Delete related records first (cascade should handle this, but being explicit)
            await prisma.facilityAccessImage.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.facilityAvailability.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.facilityRateSchedule.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.facilityVerification.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.review.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.booking.deleteMany({
              where: { facilityId: duplicate.id },
            });
            
            await prisma.event.updateMany({
              where: { facilityId: duplicate.id },
              data: { facilityId: toKeep.id },
            });
            
            // Finally delete the facility
            await prisma.facility.delete({
              where: { id: duplicate.id },
            });
            
            duplicatesRemoved++;
            console.log(`     ✓ Deleted successfully`);
          } catch (error) {
            console.error(`     ✗ Error deleting ${duplicate.id}:`, error);
          }
        }
      }
    }

    if (duplicatesFound === 0) {
      console.log('\n✨ No duplicates found!');
    } else {
      console.log(`\n🎉 Removed ${duplicatesRemoved} duplicate facilities`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicates()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  });
