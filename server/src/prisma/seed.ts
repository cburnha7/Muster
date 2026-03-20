import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const edwin = await prisma.user.upsert({
    where: { email: 'edwin@muster.app' },
    update: {},
    create: {
      email: 'edwin@muster.app',
      password: hashedPassword,
      firstName: 'Edwin',
      lastName: 'Chen',
      phoneNumber: '+1234567890',
      dateOfBirth: new Date('1990-01-15'),
    },
  });

  const john = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+1234567891',
      dateOfBirth: new Date('1988-05-20'),
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phoneNumber: '+1234567892',
      dateOfBirth: new Date('1992-08-10'),
    },
  });

  console.log('✅ Created users');

  // Create facilities
  const facility1 = await prisma.facility.create({
    data: {
      name: 'Downtown Sports Complex',
      description: 'Premier sports facility in the heart of downtown with state-of-the-art equipment',
      sportTypes: ['basketball', 'volleyball', 'badminton'],
      amenities: ['Parking', 'Locker Rooms', 'Showers', 'Equipment Rental', 'Cafe'],
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      rating: 4.5,
      pricePerHour: 50,
      isVerified: true,
      verificationStatus: 'approved',
      accessInstructions: 'Enter through the main entrance on Main Street. Check in at the front desk with your booking confirmation. Locker rooms are on the second floor.',
      parkingInfo: 'Free parking available in the adjacent lot. Enter from Oak Street.',
      minimumBookingHours: 1,
      bufferTimeMins: 15,
      contactPhone: '(415) 555-0123',
      contactEmail: 'info@downtownsports.com',
      contactWebsite: 'https://downtownsports.com',
      street: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      latitude: 37.7749,
      longitude: -122.4194,
      ownerId: john.id,
    },
  });

  const facility2 = await prisma.facility.create({
    data: {
      name: 'Sunset Soccer Fields',
      description: 'Beautiful outdoor soccer fields with ocean views',
      sportTypes: ['soccer'],
      amenities: ['Parking', 'Restrooms', 'Bleachers', 'Lighting'],
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      rating: 4.8,
      pricePerHour: 75,
      isVerified: true,
      verificationStatus: 'approved',
      accessInstructions: 'Fields are located behind the main building. Gate code will be sent 1 hour before your booking. Please lock the gate when leaving.',
      parkingInfo: 'Street parking available on Ocean Avenue. Additional lot on the west side.',
      minimumBookingHours: 2,
      bufferTimeMins: 30,
      contactPhone: '(415) 555-0456',
      contactEmail: 'bookings@sunsetsoccer.com',
      contactWebsite: 'https://sunsetsoccer.com',
      street: '456 Ocean Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94116',
      latitude: 37.7599,
      longitude: -122.4936,
      ownerId: sarah.id,
    },
  });

  // Edwin's facilities
  const facility3 = await prisma.facility.create({
    data: {
      name: 'Mission District Tennis Center',
      description: 'Indoor tennis facility with professional-grade courts and coaching services',
      sportTypes: ['tennis'],
      amenities: ['Parking', 'Locker Rooms', 'Pro Shop', 'Coaching', 'Cafe'],
      imageUrl: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800',
      rating: 4.7,
      pricePerHour: 60,
      isVerified: true,
      verificationStatus: 'approved',
      accessInstructions: 'Enter through the main lobby. Courts are on the second floor. Please arrive 10 minutes early for check-in.',
      parkingInfo: 'Underground parking available. Entrance on Valencia Street.',
      minimumBookingHours: 1,
      bufferTimeMins: 15,
      contactPhone: '(415) 555-0789',
      contactEmail: 'info@missiontennis.com',
      contactWebsite: 'https://missiontennis.com',
      street: '789 Valencia Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      latitude: 37.7599,
      longitude: -122.4216,
      ownerId: edwin.id,
    },
  });

  const facility4 = await prisma.facility.create({
    data: {
      name: 'Bay Area Badminton Club',
      description: 'Premier badminton facility with 8 courts and tournament hosting capabilities',
      sportTypes: ['badminton'],
      amenities: ['Parking', 'Locker Rooms', 'Equipment Rental', 'Showers', 'Vending Machines'],
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      rating: 4.6,
      pricePerHour: 40,
      isVerified: true,
      verificationStatus: 'approved',
      accessInstructions: 'Main entrance on Market Street. Sign in at reception desk. Courts are on the main floor.',
      parkingInfo: 'Street parking available. Public lot 2 blocks away on Mission Street.',
      minimumBookingHours: 1,
      bufferTimeMins: 10,
      contactPhone: '(415) 555-0321',
      contactEmail: 'bookings@bayareabadminton.com',
      contactWebsite: 'https://bayareabadminton.com',
      street: '321 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      latitude: 37.7879,
      longitude: -122.4074,
      ownerId: edwin.id,
    },
  });

  console.log('✅ Created facilities');

  // Create courts for facilities
  // Downtown Sports Complex - Basketball and Volleyball courts
  const court1 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility1.id,
      name: 'Basketball Court 1',
      sportType: 'basketball',
      capacity: 10,
      isIndoor: true,
      isActive: true,
      displayOrder: 1,
      boundaryCoordinates: [
        { x: 0.1, y: 0.1 },
        { x: 0.45, y: 0.1 },
        { x: 0.45, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ],
    },
  });

  const court2 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility1.id,
      name: 'Basketball Court 2',
      sportType: 'basketball',
      capacity: 10,
      isIndoor: true,
      isActive: true,
      displayOrder: 2,
      boundaryCoordinates: [
        { x: 0.55, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.55, y: 0.9 },
      ],
    },
  });

  const court3 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility1.id,
      name: 'Volleyball Court',
      sportType: 'volleyball',
      capacity: 12,
      isIndoor: true,
      isActive: true,
      displayOrder: 3,
      pricePerHour: 45, // Slightly cheaper than basketball
      boundaryCoordinates: [
        { x: 0.15, y: 0.15 },
        { x: 0.4, y: 0.15 },
        { x: 0.4, y: 0.5 },
        { x: 0.15, y: 0.5 },
      ],
    },
  });

  // Sunset Soccer Fields - Multiple soccer fields
  const field1 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility2.id,
      name: 'Field A',
      sportType: 'soccer',
      capacity: 22,
      isIndoor: false,
      isActive: true,
      displayOrder: 1,
      boundaryCoordinates: [
        { x: 0.05, y: 0.1 },
        { x: 0.45, y: 0.1 },
        { x: 0.45, y: 0.9 },
        { x: 0.05, y: 0.9 },
      ],
    },
  });

  const field2 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility2.id,
      name: 'Field B',
      sportType: 'soccer',
      capacity: 22,
      isIndoor: false,
      isActive: true,
      displayOrder: 2,
      boundaryCoordinates: [
        { x: 0.55, y: 0.1 },
        { x: 0.95, y: 0.1 },
        { x: 0.95, y: 0.9 },
        { x: 0.55, y: 0.9 },
      ],
    },
  });

  console.log('✅ Created courts');

  // Edwin's Tennis Center - 4 tennis courts
  const tennisCourt1 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility3.id,
      name: 'Court 1',
      sportType: 'tennis',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 1,
      boundaryCoordinates: [
        { x: 0.05, y: 0.1 },
        { x: 0.25, y: 0.1 },
        { x: 0.25, y: 0.45 },
        { x: 0.05, y: 0.45 },
      ],
    },
  });

  const tennisCourt2 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility3.id,
      name: 'Court 2',
      sportType: 'tennis',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 2,
      boundaryCoordinates: [
        { x: 0.3, y: 0.1 },
        { x: 0.5, y: 0.1 },
        { x: 0.5, y: 0.45 },
        { x: 0.3, y: 0.45 },
      ],
    },
  });

  const tennisCourt3 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility3.id,
      name: 'Court 3',
      sportType: 'tennis',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 3,
      pricePerHour: 70, // Premium court
      boundaryCoordinates: [
        { x: 0.55, y: 0.1 },
        { x: 0.75, y: 0.1 },
        { x: 0.75, y: 0.45 },
        { x: 0.55, y: 0.45 },
      ],
    },
  });

  const tennisCourt4 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility3.id,
      name: 'Court 4',
      sportType: 'tennis',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 4,
      pricePerHour: 70, // Premium court
      boundaryCoordinates: [
        { x: 0.8, y: 0.1 },
        { x: 1.0, y: 0.1 },
        { x: 1.0, y: 0.45 },
        { x: 0.8, y: 0.45 },
      ],
    },
  });

  // Edwin's Badminton Club - 4 courts
  const badmintonCourt1 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility4.id,
      name: 'Court A',
      sportType: 'badminton',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 1,
      boundaryCoordinates: [
        { x: 0.05, y: 0.1 },
        { x: 0.25, y: 0.1 },
        { x: 0.25, y: 0.4 },
        { x: 0.05, y: 0.4 },
      ],
    },
  });

  const badmintonCourt2 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility4.id,
      name: 'Court B',
      sportType: 'badminton',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 2,
      boundaryCoordinates: [
        { x: 0.3, y: 0.1 },
        { x: 0.5, y: 0.1 },
        { x: 0.5, y: 0.4 },
        { x: 0.3, y: 0.4 },
      ],
    },
  });

  const badmintonCourt3 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility4.id,
      name: 'Court C',
      sportType: 'badminton',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 3,
      boundaryCoordinates: [
        { x: 0.55, y: 0.1 },
        { x: 0.75, y: 0.1 },
        { x: 0.75, y: 0.4 },
        { x: 0.55, y: 0.4 },
      ],
    },
  });

  const badmintonCourt4 = await prisma.facilityCourt.create({
    data: {
      facilityId: facility4.id,
      name: 'Court D',
      sportType: 'badminton',
      capacity: 4,
      isIndoor: true,
      isActive: true,
      displayOrder: 4,
      boundaryCoordinates: [
        { x: 0.8, y: 0.1 },
        { x: 1.0, y: 0.1 },
        { x: 1.0, y: 0.4 },
        { x: 0.8, y: 0.4 },
      ],
    },
  });

  console.log('✅ Created Edwin\'s facility courts');

  // Create court availability
  // Basketball Court 1 - Weekday mornings and evenings
  for (let day = 1; day <= 5; day++) {
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: court1.id,
        dayOfWeek: day,
        startTime: '06:00',
        endTime: '09:00',
        isRecurring: true,
      },
    });
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: court1.id,
        dayOfWeek: day,
        startTime: '17:00',
        endTime: '22:00',
        isRecurring: true,
      },
    });
  }

  // Basketball Court 2 - All day weekends
  for (let day = 0; day <= 6; day += 6) {
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: court2.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
        isRecurring: true,
      },
    });
  }

  // Volleyball Court - Evenings only
  for (let day = 0; day <= 6; day++) {
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: court3.id,
        dayOfWeek: day,
        startTime: '18:00',
        endTime: '22:00',
        isRecurring: true,
      },
    });
  }

  // Soccer Field A - All week, all day
  for (let day = 0; day <= 6; day++) {
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: field1.id,
        dayOfWeek: day,
        startTime: '07:00',
        endTime: '21:00',
        isRecurring: true,
      },
    });
  }

  // Soccer Field B - Weekends only
  for (let day = 0; day <= 6; day += 6) {
    await prisma.facilityCourtAvailability.create({
      data: {
        courtId: field2.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
        isRecurring: true,
      },
    });
  }

  // Add a blocked time slot for maintenance
  const maintenanceDate = new Date();
  maintenanceDate.setDate(maintenanceDate.getDate() + 5);
  await prisma.facilityCourtAvailability.create({
    data: {
      courtId: court1.id,
      specificDate: maintenanceDate,
      startTime: '10:00',
      endTime: '14:00',
      isRecurring: false,
      isBlocked: true,
      blockReason: 'Floor maintenance and cleaning',
    },
  });

  console.log('✅ Created court availability');

  // Tennis courts - All day availability
  for (let day = 0; day <= 6; day++) {
    for (const court of [tennisCourt1, tennisCourt2, tennisCourt3, tennisCourt4]) {
      await prisma.facilityCourtAvailability.create({
        data: {
          courtId: court.id,
          dayOfWeek: day,
          startTime: '06:00',
          endTime: '22:00',
          isRecurring: true,
        },
      });
    }
  }

  // Badminton courts - All day availability
  for (let day = 0; day <= 6; day++) {
    for (const court of [badmintonCourt1, badmintonCourt2, badmintonCourt3, badmintonCourt4]) {
      await prisma.facilityCourtAvailability.create({
        data: {
          courtId: court.id,
          dayOfWeek: day,
          startTime: '07:00',
          endTime: '23:00',
          isRecurring: true,
        },
      });
    }
  }

  console.log('✅ Created Edwin\'s court availability');

  // Create verification records
  await prisma.facilityVerification.create({
    data: {
      facilityId: facility1.id,
      status: 'approved',
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      reviewedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
      expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // ~11 months from now
      reviewerNotes: 'Property deed verified. All documents in order.',
    },
  });

  await prisma.facilityVerification.create({
    data: {
      facilityId: facility2.id,
      status: 'approved',
      submittedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      reviewerNotes: 'Lease agreement verified. Valid for 2 years.',
    },
  });

  console.log('✅ Created verifications');

  // Create rate schedules
  // Facility 1 - Base rate
  await prisma.facilityRateSchedule.create({
    data: {
      facilityId: facility1.id,
      name: 'Base Rate',
      rateType: 'base',
      hourlyRate: 50,
      priority: 0,
    },
  });

  // Facility 1 - Weekend peak
  await prisma.facilityRateSchedule.create({
    data: {
      facilityId: facility1.id,
      name: 'Weekend Peak Hours',
      rateType: 'peak',
      hourlyRate: 75,
      daysOfWeek: [0, 6], // Sunday and Saturday
      startTime: '10:00',
      endTime: '18:00',
      priority: 10,
    },
  });

  // Facility 2 - Base rate
  await prisma.facilityRateSchedule.create({
    data: {
      facilityId: facility2.id,
      name: 'Base Rate',
      rateType: 'base',
      hourlyRate: 75,
      priority: 0,
    },
  });

  // Facility 2 - Evening discount
  await prisma.facilityRateSchedule.create({
    data: {
      facilityId: facility2.id,
      name: 'Evening Discount',
      rateType: 'discount',
      hourlyRate: 60,
      startTime: '18:00',
      endTime: '22:00',
      minHours: 2,
      priority: 5,
    },
  });

  console.log('✅ Created rate schedules');

  // Create availability slots
  // Facility 1 - Weekday availability
  for (let day = 1; day <= 5; day++) {
    await prisma.facilityAvailability.create({
      data: {
        facilityId: facility1.id,
        dayOfWeek: day,
        startTime: '06:00',
        endTime: '22:00',
        isRecurring: true,
      },
    });
  }

  // Facility 1 - Weekend availability
  await prisma.facilityAvailability.create({
    data: {
      facilityId: facility1.id,
      dayOfWeek: 0, // Sunday
      startTime: '08:00',
      endTime: '20:00',
      isRecurring: true,
    },
  });

  await prisma.facilityAvailability.create({
    data: {
      facilityId: facility1.id,
      dayOfWeek: 6, // Saturday
      startTime: '08:00',
      endTime: '20:00',
      isRecurring: true,
    },
  });

  // Facility 2 - All week availability
  for (let day = 0; day <= 6; day++) {
    await prisma.facilityAvailability.create({
      data: {
        facilityId: facility2.id,
        dayOfWeek: day,
        startTime: '07:00',
        endTime: '21:00',
        isRecurring: true,
      },
    });
  }

  console.log('✅ Created availability slots');

  // Create events
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  await prisma.event.create({
    data: {
      title: 'Pickup Basketball Game',
      description: 'Casual pickup basketball game. All skill levels welcome!',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      eventType: 'pickup',
      status: 'active',
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      maxParticipants: 10,
      currentParticipants: 3,
      price: 0,
      equipment: ['Basketball shoes', 'Water bottle'],
      rules: 'Be respectful, play fair, have fun!',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      organizerId: edwin.id,
      facilityId: facility1.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Weekend Soccer Match',
      description: '11v11 competitive soccer match. Looking for skilled players.',
      sportType: 'soccer',
      skillLevel: 'advanced',
      eventType: 'game',
      status: 'active',
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 90 * 60 * 1000),
      maxParticipants: 22,
      currentParticipants: 15,
      price: 15,
      equipment: ['Soccer cleats', 'Shin guards', 'Water bottle'],
      rules: 'FIFA rules apply. Red cards result in suspension.',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      organizerId: john.id,
      facilityId: facility2.id,
    },
  });

  const volleyballEvent = await prisma.event.create({
    data: {
      title: 'Beach Volleyball Tournament',
      description: 'Fun beach volleyball tournament with prizes!',
      sportType: 'volleyball',
      skillLevel: 'beginner',
      eventType: 'practice',
      status: 'active',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      maxParticipants: 16,
      currentParticipants: 8,
      price: 25,
      equipment: ['Sunscreen', 'Water bottle', 'Athletic wear'],
      rules: 'Tournament format. Teams of 2. Single elimination.',
      imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
      organizerId: sarah.id,
      facilityId: facility1.id,
    },
  });

  console.log('✅ Created events');

  // More Edwin-organized events
  const tennisEvent1 = await prisma.event.create({
    data: {
      title: 'Doubles Tennis Tournament',
      description: 'Friendly doubles tournament for intermediate players. Prizes for winners!',
      sportType: 'tennis',
      skillLevel: 'intermediate',
      eventType: 'game',
      status: 'active',
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      maxParticipants: 16,
      currentParticipants: 8,
      price: 30,
      equipment: ['Tennis racket', 'Tennis shoes', 'Water bottle'],
      rules: 'Standard doubles rules. Best of 3 sets. Sportsmanship required.',
      imageUrl: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800',
      organizerId: edwin.id,
      facilityId: facility3.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Morning Tennis Practice',
      description: 'Early morning practice session for all levels. Coach available for tips.',
      sportType: 'tennis',
      skillLevel: 'all_levels',
      eventType: 'practice',
      status: 'active',
      startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      maxParticipants: 12,
      currentParticipants: 5,
      price: 15,
      equipment: ['Tennis racket', 'Tennis shoes'],
      rules: 'Respectful play. Share court time. Listen to coach instructions.',
      imageUrl: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800',
      organizerId: edwin.id,
      facilityId: facility3.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Badminton Pickup Games',
      description: 'Drop-in badminton games. All skill levels welcome. Bring your own racket or rent one.',
      sportType: 'badminton',
      skillLevel: 'all_levels',
      eventType: 'pickup',
      status: 'active',
      startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000),
      maxParticipants: 16,
      currentParticipants: 6,
      price: 0,
      equipment: ['Badminton racket (or rent)', 'Indoor shoes', 'Water bottle'],
      rules: 'Rotate players. Be respectful. Have fun!',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      organizerId: edwin.id,
      facilityId: facility4.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Advanced Badminton Training',
      description: 'High-intensity training session for advanced players. Focus on technique and strategy.',
      sportType: 'badminton',
      skillLevel: 'advanced',
      eventType: 'practice',
      status: 'active',
      startTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000),
      maxParticipants: 8,
      currentParticipants: 4,
      price: 25,
      equipment: ['Badminton racket', 'Indoor shoes', 'Towel', 'Water bottle'],
      rules: 'Advanced players only. Follow coach instructions. Arrive 10 minutes early.',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      organizerId: edwin.id,
      facilityId: facility4.id,
    },
  });

  console.log('✅ Created Edwin\'s events');

  // Create teams
  await prisma.team.create({
    data: {
      name: 'Bay Area Ballers',
      description: 'Competitive basketball team looking for dedicated players',
      sportType: 'basketball',
      skillLevel: 'advanced',
      maxMembers: 12,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      members: {
        create: [
          { userId: edwin.id, role: 'captain' },
          { userId: john.id, role: 'member' },
        ],
      },
    },
  });

  await prisma.team.create({
    data: {
      name: 'Sunset Strikers',
      description: 'Recreational soccer team for weekend warriors',
      sportType: 'soccer',
      skillLevel: 'intermediate',
      maxMembers: 20,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
      members: {
        create: [
          { userId: sarah.id, role: 'captain' },
          { userId: edwin.id, role: 'member' },
        ],
      },
    },
  });

  const team1 = await prisma.team.findFirst({ where: { name: 'Bay Area Ballers' } });
  const team2 = await prisma.team.findFirst({ where: { name: 'Sunset Strikers' } });

  console.log('✅ Created teams');

  // Create more teams for leagues
  const team3 = await prisma.team.create({
    data: {
      name: 'Golden Gate Hoops',
      description: 'Elite basketball team from San Francisco',
      sportType: 'basketball',
      skillLevel: 'advanced',
      maxMembers: 12,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      members: {
        create: [{ userId: john.id, role: 'captain' }],
      },
    },
  });

  const team4 = await prisma.team.create({
    data: {
      name: 'Mission District Dunkers',
      description: 'Fast-paced basketball team',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      maxMembers: 12,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
      members: {
        create: [{ userId: sarah.id, role: 'captain' }],
      },
    },
  });

  const team5 = await prisma.team.create({
    data: {
      name: 'Pacific FC',
      description: 'Competitive soccer club',
      sportType: 'soccer',
      skillLevel: 'advanced',
      maxMembers: 20,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
      members: {
        create: [{ userId: john.id, role: 'captain' }],
      },
    },
  });

  const team6 = await prisma.team.create({
    data: {
      name: 'Bay United',
      description: 'Friendly soccer team',
      sportType: 'soccer',
      skillLevel: 'intermediate',
      maxMembers: 20,
      isPrivate: false,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
      members: {
        create: [{ userId: edwin.id, role: 'captain' }],
      },
    },
  });

  console.log('✅ Created additional teams for leagues');

  // Create leagues
  const basketballLeague = await prisma.league.create({
    data: {
      name: 'SF Summer Basketball League',
      description: 'Competitive summer basketball league for Bay Area teams. 8-week season with playoffs.',
      sportType: 'basketball',
      skillLevel: 'advanced',
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Started 30 days ago
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Ends in 30 days
      isCertified: true,
      isActive: true,
      pointsConfig: {
        win: 3,
        draw: 1,
        loss: 0,
      },
      organizerId: edwin.id,
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    },
  });

  const soccerLeague = await prisma.league.create({
    data: {
      name: 'Bay Area Soccer Championship',
      description: 'Premier soccer league featuring the best teams in the Bay Area. Full season with home and away matches.',
      sportType: 'soccer',
      skillLevel: 'advanced',
      startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // Started 45 days ago
      endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // Ends in 45 days
      isCertified: true,
      isActive: true,
      pointsConfig: {
        win: 3,
        draw: 1,
        loss: 0,
      },
      organizerId: john.id,
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    },
  });

  const recreationalLeague = await prisma.league.create({
    data: {
      name: 'Weekend Warriors Basketball',
      description: 'Casual basketball league for recreational players. Focus on fun and fitness!',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
      endDate: new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000), // 60-day season
      isCertified: false,
      isActive: true,
      pointsConfig: {
        win: 2,
        draw: 1,
        loss: 0,
      },
      organizerId: sarah.id,
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    },
  });

  console.log('✅ Created leagues');

  // Create seasons
  const basketballSeason = await prisma.season.create({
    data: {
      leagueId: basketballLeague.id,
      name: 'Summer 2024',
      startDate: basketballLeague.startDate,
      endDate: basketballLeague.endDate,
      isActive: true,
    },
  });

  const soccerSeason = await prisma.season.create({
    data: {
      leagueId: soccerLeague.id,
      name: 'Spring 2024',
      startDate: soccerLeague.startDate,
      endDate: soccerLeague.endDate,
      isActive: true,
    },
  });

  console.log('✅ Created seasons');

  // Create league memberships
  const membership1 = await prisma.leagueMembership.create({
    data: {
      leagueId: basketballLeague.id,
      teamId: team1!.id,
      memberType: 'roster',
      memberId: team1!.id,
      seasonId: basketballSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      matchesPlayed: 5,
      wins: 4,
      losses: 1,
      draws: 0,
      points: 12,
      goalsFor: 450,
      goalsAgainst: 380,
      goalDifference: 70,
    },
  });

  const membership2 = await prisma.leagueMembership.create({
    data: {
      leagueId: basketballLeague.id,
      teamId: team3.id,
      memberType: 'roster',
      memberId: team3.id,
      seasonId: basketballSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      draws: 0,
      points: 9,
      goalsFor: 420,
      goalsAgainst: 410,
      goalDifference: 10,
    },
  });

  const membership3 = await prisma.leagueMembership.create({
    data: {
      leagueId: basketballLeague.id,
      teamId: team4.id,
      memberType: 'roster',
      memberId: team4.id,
      seasonId: basketballSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      matchesPlayed: 5,
      wins: 2,
      losses: 3,
      draws: 0,
      points: 6,
      goalsFor: 390,
      goalsAgainst: 430,
      goalDifference: -40,
    },
  });

  const membership4 = await prisma.leagueMembership.create({
    data: {
      leagueId: soccerLeague.id,
      teamId: team2!.id,
      memberType: 'roster',
      memberId: team2!.id,
      seasonId: soccerSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
      matchesPlayed: 6,
      wins: 4,
      losses: 1,
      draws: 1,
      points: 13,
      goalsFor: 15,
      goalsAgainst: 8,
      goalDifference: 7,
    },
  });

  const membership5 = await prisma.leagueMembership.create({
    data: {
      leagueId: soccerLeague.id,
      teamId: team5.id,
      memberType: 'roster',
      memberId: team5.id,
      seasonId: soccerSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
      matchesPlayed: 6,
      wins: 3,
      losses: 2,
      draws: 1,
      points: 10,
      goalsFor: 12,
      goalsAgainst: 10,
      goalDifference: 2,
    },
  });

  const membership6 = await prisma.leagueMembership.create({
    data: {
      leagueId: soccerLeague.id,
      teamId: team6.id,
      memberType: 'roster',
      memberId: team6.id,
      seasonId: soccerSeason.id,
      status: 'active',
      joinedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
      matchesPlayed: 6,
      wins: 2,
      losses: 3,
      draws: 1,
      points: 7,
      goalsFor: 9,
      goalsAgainst: 13,
      goalDifference: -4,
    },
  });

  console.log('✅ Created league memberships');

  // Create matches
  // Basketball league matches (completed)
  await prisma.match.create({
    data: {
      leagueId: basketballLeague.id,
      seasonId: basketballSeason.id,
      homeTeamId: team1!.id,
      awayTeamId: team3.id,
      scheduledAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 95,
      awayScore: 88,
      outcome: 'home_win',
      notes: 'Intense game with great defense from both teams.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: basketballLeague.id,
      seasonId: basketballSeason.id,
      homeTeamId: team3.id,
      awayTeamId: team4.id,
      scheduledAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 82,
      awayScore: 79,
      outcome: 'home_win',
      notes: 'Close game decided in the final minutes.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: basketballLeague.id,
      seasonId: basketballSeason.id,
      homeTeamId: team4.id,
      awayTeamId: team1!.id,
      scheduledAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 76,
      awayScore: 92,
      outcome: 'away_win',
      notes: 'Dominant performance by the away team.',
    },
  });

  // Basketball league matches (upcoming)
  await prisma.match.create({
    data: {
      leagueId: basketballLeague.id,
      seasonId: basketballSeason.id,
      homeTeamId: team1!.id,
      awayTeamId: team4.id,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      notes: 'Rematch of their previous encounter.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: basketballLeague.id,
      seasonId: basketballSeason.id,
      homeTeamId: team3.id,
      awayTeamId: team1!.id,
      scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      notes: 'Top of the table clash.',
    },
  });

  // Soccer league matches (completed)
  await prisma.match.create({
    data: {
      leagueId: soccerLeague.id,
      seasonId: soccerSeason.id,
      homeTeamId: team2!.id,
      awayTeamId: team5.id,
      scheduledAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 3,
      awayScore: 1,
      outcome: 'home_win',
      notes: 'Strong first half performance.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: soccerLeague.id,
      seasonId: soccerSeason.id,
      homeTeamId: team5.id,
      awayTeamId: team6.id,
      scheduledAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 2,
      awayScore: 2,
      outcome: 'draw',
      notes: 'Exciting match with late equalizer.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: soccerLeague.id,
      seasonId: soccerSeason.id,
      homeTeamId: team6.id,
      awayTeamId: team2!.id,
      scheduledAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      playedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      status: 'completed',
      homeScore: 1,
      awayScore: 2,
      outcome: 'away_win',
      notes: 'Away team controlled possession.',
    },
  });

  // Soccer league matches (upcoming)
  await prisma.match.create({
    data: {
      leagueId: soccerLeague.id,
      seasonId: soccerSeason.id,
      homeTeamId: team2!.id,
      awayTeamId: team6.id,
      scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      notes: 'Important match for playoff positioning.',
    },
  });

  await prisma.match.create({
    data: {
      leagueId: soccerLeague.id,
      seasonId: soccerSeason.id,
      homeTeamId: team5.id,
      awayTeamId: team2!.id,
      scheduledAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
      notes: 'Derby match between local rivals.',
    },
  });

  console.log('✅ Created matches');

  // Create league documents
  await prisma.leagueDocument.create({
    data: {
      leagueId: basketballLeague.id,
      fileName: 'basketball-league-rules.pdf',
      documentType: 'rules',
      fileUrl: 'https://example.com/basketball-league-rules.pdf',
      fileSize: 524288, // 512 KB
      mimeType: 'application/pdf',
      uploadedBy: edwin.id,
    },
  });

  await prisma.leagueDocument.create({
    data: {
      leagueId: basketballLeague.id,
      fileName: 'basketball-schedule.pdf',
      documentType: 'schedule',
      fileUrl: 'https://example.com/basketball-schedule.pdf',
      fileSize: 262144, // 256 KB
      mimeType: 'application/pdf',
      uploadedBy: edwin.id,
    },
  });

  await prisma.leagueDocument.create({
    data: {
      leagueId: soccerLeague.id,
      fileName: 'soccer-league-rules.pdf',
      documentType: 'rules',
      fileUrl: 'https://example.com/soccer-league-rules.pdf',
      fileSize: 786432, // 768 KB
      mimeType: 'application/pdf',
      uploadedBy: john.id,
    },
  });

  console.log('✅ Created league documents');

  // Create certification documents
  await prisma.certificationDocument.create({
    data: {
      leagueId: basketballLeague.id,
      documentType: 'bylaws',
      fileName: 'basketball-bylaws.pdf',
      fileUrl: 'https://example.com/basketball-bylaws.pdf',
      fileSize: 1048576, // 1 MB
      mimeType: 'application/pdf',
      uploadedBy: edwin.id,
      boardMembers: [
        { name: 'Edwin Chen', role: 'President' },
        { name: 'John Smith', role: 'Vice President' },
        { name: 'Sarah Johnson', role: 'Secretary' },
        { name: 'Mike Davis', role: 'Treasurer' },
      ],
    },
  });

  await prisma.certificationDocument.create({
    data: {
      leagueId: soccerLeague.id,
      documentType: 'bylaws',
      fileName: 'soccer-bylaws.pdf',
      fileUrl: 'https://example.com/soccer-bylaws.pdf',
      fileSize: 1310720, // 1.25 MB
      mimeType: 'application/pdf',
      uploadedBy: john.id,
      boardMembers: [
        { name: 'John Smith', role: 'President' },
        { name: 'Sarah Johnson', role: 'Vice President' },
        { name: 'Edwin Chen', role: 'Treasurer' },
      ],
    },
  });

  console.log('✅ Created certification documents');

  // Create past events with participants for saluting testing
  const pastBasketballEvent = await prisma.event.create({
    data: {
      title: 'Past Basketball Pickup Game',
      description: 'Completed pickup basketball game with great players!',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      eventType: 'pickup',
      status: 'completed',
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
      maxParticipants: 10,
      currentParticipants: 6,
      price: 0,
      equipment: ['Basketball shoes', 'Water bottle'],
      rules: 'Be respectful, play fair, have fun!',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      organizerId: john.id,
      facilityId: facility1.id,
    },
  });

  const pastSoccerEvent = await prisma.event.create({
    data: {
      title: 'Past Soccer Match',
      description: 'Completed 5v5 soccer match - great game!',
      sportType: 'soccer',
      skillLevel: 'intermediate',
      eventType: 'game',
      status: 'completed',
      startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 minutes duration
      maxParticipants: 10,
      currentParticipants: 8,
      price: 10,
      equipment: ['Soccer cleats', 'Shin guards'],
      rules: 'Fair play, respect the referee.',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      organizerId: sarah.id,
      facilityId: facility2.id,
    },
  });

  const pastTennisEvent = await prisma.event.create({
    data: {
      title: 'Past Tennis Doubles',
      description: 'Completed doubles tennis tournament - fun times!',
      sportType: 'tennis',
      skillLevel: 'all_levels',
      eventType: 'game',
      status: 'completed',
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
      maxParticipants: 8,
      currentParticipants: 8,
      price: 20,
      equipment: ['Tennis racket', 'Tennis shoes'],
      rules: 'Standard doubles rules.',
      imageUrl: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800',
      organizerId: edwin.id,
      facilityId: facility3.id,
    },
  });

  console.log('✅ Created past events for saluting');

  // Create bookings for past basketball event (Edwin + 5 others)
  await prisma.booking.create({
    data: {
      userId: edwin.id,
      eventId: pastBasketballEvent.id,
      bookingType: 'event',
      totalPrice: 0,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: john.id,
      eventId: pastBasketballEvent.id,
      bookingType: 'event',
      totalPrice: 0,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: sarah.id,
      eventId: pastBasketballEvent.id,
      bookingType: 'event',
      totalPrice: 0,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  // Create bookings for past soccer event (Edwin + 7 others)
  await prisma.booking.create({
    data: {
      userId: edwin.id,
      eventId: pastSoccerEvent.id,
      bookingType: 'event',
      totalPrice: 10,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: john.id,
      eventId: pastSoccerEvent.id,
      bookingType: 'event',
      totalPrice: 10,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: sarah.id,
      eventId: pastSoccerEvent.id,
      bookingType: 'event',
      totalPrice: 10,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  // Create bookings for past tennis event (Edwin + 7 others)
  await prisma.booking.create({
    data: {
      userId: edwin.id,
      eventId: pastTennisEvent.id,
      bookingType: 'event',
      totalPrice: 20,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: john.id,
      eventId: pastTennisEvent.id,
      bookingType: 'event',
      totalPrice: 20,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      userId: sarah.id,
      eventId: pastTennisEvent.id,
      bookingType: 'event',
      totalPrice: 20,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  // Create booking for upcoming volleyball event
  await prisma.booking.create({
    data: {
      userId: edwin.id,
      eventId: volleyballEvent.id,
      bookingType: 'event',
      totalPrice: 25,
      status: 'confirmed',
      paymentStatus: 'completed',
    },
  });

  console.log('✅ Created bookings');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
