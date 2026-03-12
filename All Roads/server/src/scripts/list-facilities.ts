import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listFacilities() {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        owner: {
          select: {
            email: true,
          },
        },
        courts: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    console.log(`\nFound ${facilities.length} facilities:\n`);

    facilities.forEach(facility => {
      console.log(`- ${facility.name} (ID: ${facility.id})`);
      console.log(`  Owner: ${facility.owner.email}`);
      console.log(`  Courts: ${facility.courts.length}`);
      facility.courts.forEach(court => {
        console.log(`    - ${court.name} (${court.isActive ? 'Active' : 'Inactive'})`);
      });
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listFacilities();
