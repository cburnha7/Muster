import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFacilityCreation() {
  try {
    console.log('🧪 Testing facility and court creation...\n');

    // Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No users found');
      return;
    }
    console.log(`✅ Using user: ${user.email}\n`);

    // Create facility
    console.log('📤 Creating facility...');
    const facility = await prisma.facility.create({
      data: {
        name: 'Test Ground',
        description: 'Test description',
        sportTypes: ['basketball', 'soccer'],
        amenities: [],
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        latitude: 0,
        longitude: 0,
        contactPhone: '',
        contactEmail: '',
        contactWebsite: '',
        pricePerHour: 0,
        rating: 0,
        isVerified: false,
        verificationStatus: 'pending',
        minimumBookingHours: 1,
        bufferTimeMins: 0,
        ownerId: user.id,
      },
    });
    console.log(`✅ Facility created: ${facility.id}\n`);

    // Create courts
    console.log('📤 Creating courts...');
    const court1 = await prisma.facilityCourt.create({
      data: {
        facilityId: facility.id,
        name: 'Court 1',
        sportType: 'basketball',
        capacity: 10,
        isIndoor: true,
        pricePerHour: 50,
        displayOrder: 0,
      },
    });
    console.log(`✅ Court 1 created: ${court1.id}`);

    const court2 = await prisma.facilityCourt.create({
      data: {
        facilityId: facility.id,
        name: 'Court 2',
        sportType: 'soccer',
        capacity: 22,
        isIndoor: false,
        pricePerHour: 75,
        displayOrder: 1,
      },
    });
    console.log(`✅ Court 2 created: ${court2.id}\n`);

    // Verify
    console.log('🔍 Verifying...');
    const facilityWithCourts = await prisma.facility.findUnique({
      where: { id: facility.id },
      include: {
        courts: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    console.log(`\n📊 Result:`);
    console.log(`   Facility: ${facilityWithCourts?.name}`);
    console.log(`   Courts: ${facilityWithCourts?.courts.length}`);
    facilityWithCourts?.courts.forEach((court, i) => {
      console.log(`      ${i + 1}. ${court.name} (${court.sportType})`);
    });

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacilityCreation();
