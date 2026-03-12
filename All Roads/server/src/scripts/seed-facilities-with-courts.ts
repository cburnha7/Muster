import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const facilities = [
  {
    name: 'Downtown Sports Complex',
    description: 'Premier multi-sport facility in the heart of downtown with state-of-the-art courts and fields.',
    street: '123 Main Street',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    latitude: 47.6062,
    longitude: -122.3321,
    sportTypes: ['basketball', 'volleyball', 'badminton'],
    contactPhone: '(206) 555-0100',
    contactEmail: 'info@downtownsports.com',
    pricePerHour: 50,
    wholeFacilityRate: 400,
    courts: [
      { name: 'Court 1', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 60 },
      { name: 'Court 2', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 60 },
      { name: 'Court 3', sportType: 'volleyball', capacity: 12, isIndoor: true, pricePerHour: 55 },
      { name: 'Court 4', sportType: 'badminton', capacity: 4, isIndoor: true, pricePerHour: 40 },
    ],
  },
  {
    name: 'Greenfield Soccer Park',
    description: 'Beautiful outdoor soccer facility with multiple full-size fields and excellent drainage.',
    street: '456 Park Avenue',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98102',
    latitude: 47.6205,
    longitude: -122.3493,
    sportTypes: ['soccer'],
    contactPhone: '(206) 555-0200',
    contactEmail: 'bookings@greenfieldsoccer.com',
    pricePerHour: 80,
    wholeFacilityRate: 600,
    courts: [
      { name: 'Field A', sportType: 'soccer', capacity: 22, isIndoor: false, pricePerHour: 100 },
      { name: 'Field B', sportType: 'soccer', capacity: 22, isIndoor: false, pricePerHour: 100 },
      { name: 'Field C', sportType: 'soccer', capacity: 14, isIndoor: false, pricePerHour: 75 },
      { name: 'Training Field', sportType: 'soccer', capacity: 10, isIndoor: false, pricePerHour: 50 },
    ],
  },
  {
    name: 'Lakeside Tennis Center',
    description: 'Professional tennis facility with clay and hard courts, plus a pro shop and coaching services.',
    street: '789 Lakeside Drive',
    city: 'Bellevue',
    state: 'WA',
    zipCode: '98004',
    latitude: 47.6101,
    longitude: -122.2015,
    sportTypes: ['tennis'],
    contactPhone: '(425) 555-0300',
    contactEmail: 'reservations@lakesidetennis.com',
    pricePerHour: 45,
    wholeFacilityRate: 500,
    courts: [
      { name: 'Court 1 (Clay)', sportType: 'tennis', capacity: 4, isIndoor: false, pricePerHour: 50 },
      { name: 'Court 2 (Clay)', sportType: 'tennis', capacity: 4, isIndoor: false, pricePerHour: 50 },
      { name: 'Court 3 (Hard)', sportType: 'tennis', capacity: 4, isIndoor: false, pricePerHour: 45 },
      { name: 'Court 4 (Hard)', sportType: 'tennis', capacity: 4, isIndoor: false, pricePerHour: 45 },
      { name: 'Court 5 (Indoor)', sportType: 'tennis', capacity: 4, isIndoor: true, pricePerHour: 60 },
      { name: 'Court 6 (Indoor)', sportType: 'tennis', capacity: 4, isIndoor: true, pricePerHour: 60 },
    ],
  },
  {
    name: 'Hoops Arena',
    description: 'Indoor basketball facility with professional-grade courts and spectator seating.',
    street: '321 Arena Boulevard',
    city: 'Redmond',
    state: 'WA',
    zipCode: '98052',
    latitude: 47.6740,
    longitude: -122.1215,
    sportTypes: ['basketball'],
    contactPhone: '(425) 555-0400',
    contactEmail: 'book@hoopsarena.com',
    pricePerHour: 70,
    wholeFacilityRate: 500,
    courts: [
      { name: 'Main Court', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 80 },
      { name: 'Court 2', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 75 },
      { name: 'Court 3', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 75 },
      { name: 'Practice Court', sportType: 'basketball', capacity: 6, isIndoor: true, pricePerHour: 50 },
    ],
  },
  {
    name: 'Eastside Multi-Sport Complex',
    description: 'Versatile facility offering basketball, volleyball, and badminton courts for all skill levels.',
    street: '555 Sports Way',
    city: 'Kirkland',
    state: 'WA',
    zipCode: '98033',
    latitude: 47.6815,
    longitude: -122.2087,
    sportTypes: ['basketball', 'volleyball', 'badminton'],
    contactPhone: '(425) 555-0500',
    contactEmail: 'info@eastsidems.com',
    pricePerHour: 55,
    wholeFacilityRate: 450,
    courts: [
      { name: 'Court A', sportType: 'basketball', capacity: 10, isIndoor: true, pricePerHour: 65 },
      { name: 'Court B', sportType: 'volleyball', capacity: 12, isIndoor: true, pricePerHour: 60 },
      { name: 'Court C', sportType: 'volleyball', capacity: 12, isIndoor: true, pricePerHour: 60 },
      { name: 'Court D', sportType: 'badminton', capacity: 4, isIndoor: true, pricePerHour: 45 },
      { name: 'Court E', sportType: 'badminton', capacity: 4, isIndoor: true, pricePerHour: 45 },
    ],
  },
  {
    name: 'Sunset Soccer Fields',
    description: 'Community soccer fields with evening lighting and covered seating areas.',
    street: '888 Sunset Road',
    city: 'Tacoma',
    state: 'WA',
    zipCode: '98402',
    latitude: 47.2529,
    longitude: -122.4443,
    sportTypes: ['soccer'],
    contactPhone: '(253) 555-0600',
    contactEmail: 'bookings@sunsetsoccer.com',
    pricePerHour: 75,
    wholeFacilityRate: 550,
    courts: [
      { name: 'Field 1', sportType: 'soccer', capacity: 22, isIndoor: false, pricePerHour: 90 },
      { name: 'Field 2', sportType: 'soccer', capacity: 22, isIndoor: false, pricePerHour: 90 },
      { name: 'Field 3', sportType: 'soccer', capacity: 14, isIndoor: false, pricePerHour: 70 },
    ],
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Get or create a default user to own these facilities
  let owner = await prisma.user.findFirst({
    where: { email: 'facility.owner@example.com' },
  });

  if (!owner) {
    console.log('Creating default facility owner...');
    owner = await prisma.user.create({
      data: {
        email: 'facility.owner@example.com',
        password: 'password123',
        firstName: 'Facility',
        lastName: 'Owner',
        dateOfBirth: new Date('1990-01-01'),
      },
    });
  }

  console.log(`Using owner: ${owner.email} (${owner.id})`);

  for (const facilityData of facilities) {
    console.log(`\n📍 Creating facility: ${facilityData.name}`);

    // Check if facility already exists
    const existing = await prisma.facility.findFirst({
      where: {
        name: facilityData.name,
        city: facilityData.city,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Facility already exists, skipping...`);
      continue;
    }

    // Create facility
    const facility = await prisma.facility.create({
      data: {
        name: facilityData.name,
        description: facilityData.description,
        street: facilityData.street,
        city: facilityData.city,
        state: facilityData.state,
        zipCode: facilityData.zipCode,
        latitude: facilityData.latitude,
        longitude: facilityData.longitude,
        sportTypes: facilityData.sportTypes,
        contactPhone: facilityData.contactPhone,
        contactEmail: facilityData.contactEmail,
        pricePerHour: facilityData.pricePerHour,
        rating: Math.random() * 1.5 + 3.5, // Random rating between 3.5 and 5.0
        isVerified: true,
        verificationStatus: 'approved',
        minimumBookingHours: 1,
        bufferTimeMins: 15,
        ownerId: owner.id,
      },
    });

    console.log(`  ✅ Created facility: ${facility.id}`);

    // Create courts for this facility
    for (let i = 0; i < facilityData.courts.length; i++) {
      const courtData = facilityData.courts[i];
      const court = await prisma.facilityCourt.create({
        data: {
          facilityId: facility.id,
          name: courtData.name,
          sportType: courtData.sportType,
          capacity: courtData.capacity,
          isIndoor: courtData.isIndoor,
          pricePerHour: courtData.pricePerHour,
          displayOrder: i,
          isActive: true,
        },
      });

      console.log(`    🏟️  Created court: ${court.name} ($${court.pricePerHour}/hr)`);
    }
  }

  console.log('\n✨ Seed completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Facilities created: ${facilities.length}`);
  console.log(`   - Total courts: ${facilities.reduce((sum, f) => sum + f.courts.length, 0)}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
