import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDuplicates() {
  console.log('🧹 Clearing duplicate facilities...');

  // Delete all facilities (this will cascade delete related records)
  await prisma.facility.deleteMany({});
  
  console.log('✅ All facilities cleared');
  
  await prisma.$disconnect();
}

clearDuplicates()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
