import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTimeSlotRental() {
  try {
    const slot = await prisma.facilityTimeSlot.findUnique({
      where: { id: '5707a0c2-0bff-4ee0-9616-9e4db5465118' },
      include: {
        rental: true,
      },
    });

    console.log('\nTimeSlot details:');
    console.log(JSON.stringify(slot, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlotRental();
