import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFacility() {
  try {
    const facility = await prisma.facility.findFirst({
      where: { name: 'My House' },
    });

    if (facility) {
      console.log('\n🏟️  Facility Details:');
      console.log('Name:', facility.name);
      console.log('ID:', facility.id);
      console.log('Owner ID:', facility.ownerId);
      console.log('isActive:', facility.isActive);
      console.log('isVerified:', facility.isVerified);
      console.log('\n');
    } else {
      console.log('Facility not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFacility();
