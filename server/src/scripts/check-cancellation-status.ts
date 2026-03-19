import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCancellationStatus() {
  try {
    console.log('Checking if cancellationStatus column exists...');
    
    // Try to query with cancellationStatus
    const rental = await prisma.facilityRental.findFirst({
      select: {
        id: true,
        status: true,
        cancellationStatus: true,
      },
    });
    
    console.log('✅ cancellationStatus column exists!');
    console.log('Sample rental:', rental);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCancellationStatus();
