import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFacilities() {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        courts: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    console.log(`\n📊 Total Facilities: ${facilities.length}\n`);

    if (facilities.length === 0) {
      console.log('No facilities found in database.');
    } else {
      facilities.forEach((facility, index) => {
        console.log(`${index + 1}. ${facility.name}`);
        console.log(`   ID: ${facility.id}`);
        console.log(`   Address: ${facility.street}, ${facility.city}, ${facility.state}`);
        console.log(`   Courts: ${facility.courts.length}`);
        if (facility.courts.length > 0) {
          facility.courts.forEach((court, courtIndex) => {
            console.log(`      ${courtIndex + 1}. ${court.name} (${court.sportType})`);
          });
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error checking facilities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFacilities();
