import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDefaultHours(facilityId?: string) {
  try {
    let targetFacilityId = facilityId || process.argv[2];

    if (!targetFacilityId) {
      const firstFacility = await prisma.facility.findFirst({
        where: { isActive: true },
      });
      if (!firstFacility) {
        console.error('No facilities found');
        return;
      }
      targetFacilityId = firstFacility.id;
    }

    // Default hours: 6 AM - 10 PM, Monday-Sunday
    const defaultHours = [
      { dayOfWeek: 0, startTime: '06:00', endTime: '22:00' }, // Sunday
      { dayOfWeek: 1, startTime: '06:00', endTime: '22:00' }, // Monday
      { dayOfWeek: 2, startTime: '06:00', endTime: '22:00' }, // Tuesday
      { dayOfWeek: 3, startTime: '06:00', endTime: '22:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '06:00', endTime: '22:00' }, // Thursday
      { dayOfWeek: 5, startTime: '06:00', endTime: '22:00' }, // Friday
      { dayOfWeek: 6, startTime: '06:00', endTime: '22:00' }, // Saturday
    ];

    await prisma.facilityAvailability.createMany({
      data: defaultHours.map(h => ({
        facilityId: targetFacilityId,
        ...h,
        isRecurring: true,
        isBlocked: false,
      })),
    });

    console.log('✅ Default hours added (6 AM - 10 PM, 7 days/week)');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultHours();
