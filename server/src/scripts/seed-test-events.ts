import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: offset days from now, set to a specific hour
function dateAt(daysOffset: number, hour: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minutes, 0, 0);
  return d;
}

// Helper: add hours to a date
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

const SPORT_CONFIGS = [
  {
    sport: 'basketball',
    titles: [
      'Pickup Basketball — 5v5 Runs',
      'Morning Hoops Session',
      'Friday Night Basketball',
      'Half-Court 3v3 Pickup',
      'Full Court Open Run',
      'Lunchtime Basketball',
    ],
    skillLevels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    maxParticipants: [8, 10, 12],
    equipment: ['Basketball shoes', 'Water bottle'],
    rules: 'Call your own fouls. Winners stay on. Respect the game.',
  },
  {
    sport: 'soccer',
    titles: [
      'Weekend Soccer Match',
      '5-a-Side Pickup Soccer',
      'Sunday Morning Football',
      'Indoor Soccer Scrimmage',
      'Competitive 11v11 Match',
      'Coed Soccer Pickup',
    ],
    skillLevels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    maxParticipants: [10, 14, 22],
    equipment: ['Soccer cleats', 'Shin guards', 'Water bottle'],
    rules: 'Fair play. No slide tackles on turf. Have fun.',
  },
  {
    sport: 'tennis',
    titles: [
      'Doubles Tennis Mixer',
      'Singles Tennis Ladder',
      'Morning Tennis Drills',
      'Social Tennis Afternoon',
      'Competitive Singles Play',
      'Tennis Cardio Session',
    ],
    skillLevels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    maxParticipants: [4, 8, 12, 16],
    equipment: ['Tennis racket', 'Tennis shoes', 'Water bottle'],
    rules: 'Standard rules. Call lines honestly. Rotate partners each set.',
  },
  {
    sport: 'badminton',
    titles: [
      'Badminton Open Play',
      'Doubles Badminton Night',
      'Badminton Skills Clinic',
      'Drop-In Badminton',
      'Competitive Badminton Matches',
      'Beginner Badminton Session',
    ],
    skillLevels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    maxParticipants: [8, 12, 16],
    equipment: ['Badminton racket', 'Indoor shoes', 'Water bottle'],
    rules: 'Rotate players every game. Be respectful. Have fun!',
  },
  {
    sport: 'volleyball',
    titles: [
      'Beach Volleyball Pickup',
      'Indoor Volleyball Open Gym',
      'Coed Volleyball Night',
      '6v6 Volleyball Scrimmage',
      'Volleyball Skills & Drills',
      'Casual Volleyball Hangout',
    ],
    skillLevels: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    maxParticipants: [8, 12, 16],
    equipment: ['Knee pads (optional)', 'Water bottle', 'Athletic wear'],
    rules: 'Rally scoring to 25. Rotate positions. Call your own net violations.',
  },
];

const EVENT_TYPES = ['pickup', 'game', 'practice'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Descriptions for variety
const DESCRIPTIONS = [
  'All skill levels welcome. Come out and have a good time.',
  'Looking for competitive players who want to get some solid reps in.',
  'Casual session — great way to meet new people and stay active.',
  'Bring your A-game. We keep score and play to win.',
  'Relaxed atmosphere, good vibes. Just show up and play.',
  'Weekly session — regulars and newcomers both welcome.',
  'Fast-paced games with quick rotations. Stay ready.',
  'Perfect for players looking to improve. All levels encouraged.',
  'Organized play with balanced teams. Show up 10 min early.',
  'Fun, friendly, and competitive. The way it should be.',
];

async function main() {
  console.log('🌱 Seeding test events...\n');

  // Grab existing users to use as organizers
  const users = await prisma.user.findMany({ take: 10 });
  if (users.length === 0) {
    console.error('❌ No users found. Run the main seed first: npm run prisma:seed');
    process.exit(1);
  }

  // Grab existing facilities
  const facilities = await prisma.facility.findMany({ take: 10 });
  if (facilities.length === 0) {
    console.error('❌ No facilities found. Run the main seed first.');
    process.exit(1);
  }

  const createdEvents: string[] = [];

  // ─── ONE-OFF EVENTS: spread from -14 days to +30 days ───
  console.log('Creating one-off events...');

  for (let dayOffset = -14; dayOffset <= 30; dayOffset++) {
    // 1-3 events per day
    const eventsToday = randInt(1, 3);

    for (let e = 0; e < eventsToday; e++) {
      const config = pick(SPORT_CONFIGS);
      const hour = pick([7, 9, 10, 12, 14, 17, 18, 19, 20]);
      const durationHours = pick([1, 1.5, 2, 2.5, 3]);
      const startTime = dateAt(dayOffset, hour);
      const endTime = addHours(startTime, durationHours);
      const maxP = pick(config.maxParticipants);
      const isPast = dayOffset < 0;
      const price = pick([0, 0, 0, 5, 10, 15, 20, 25]);

      // Match facility to sport when possible
      const matchingFacility = facilities.find((f) =>
        f.sportTypes.includes(config.sport)
      );
      const facility = matchingFacility || pick(facilities);

      const event = await prisma.event.create({
        data: {
          title: pick(config.titles),
          description: pick(DESCRIPTIONS),
          sportType: config.sport,
          skillLevel: pick(config.skillLevels),
          eventType: pick(EVENT_TYPES),
          status: isPast ? 'completed' : 'active',
          startTime,
          endTime,
          maxParticipants: maxP,
          currentParticipants: isPast
            ? randInt(Math.floor(maxP * 0.5), maxP)
            : randInt(0, Math.floor(maxP * 0.6)),
          price,
          equipment: config.equipment,
          rules: config.rules,
          organizerId: pick(users).id,
          facilityId: facility.id,
        },
      });

      createdEvents.push(event.id);

      // Add bookings for past events
      if (isPast) {
        const bookers = users
          .sort(() => Math.random() - 0.5)
          .slice(0, randInt(2, Math.min(users.length, maxP)));
        for (const user of bookers) {
          await prisma.booking.create({
            data: {
              userId: user.id,
              eventId: event.id,
              bookingType: 'event',
              totalPrice: price,
              status: 'confirmed',
              paymentStatus: 'completed',
            },
          });
        }
      }
    }
  }

  console.log(`  ✅ Created ${createdEvents.length} one-off events`);

  // ─── RECURRING EVENTS: weekly series ───
  console.log('Creating recurring event series...');

  const recurringSeries = [
    {
      title: 'Tuesday Night Basketball',
      sport: 'basketball',
      dayOfWeek: 2, // Tuesday
      hour: 19,
      durationHours: 2,
      maxParticipants: 10,
      price: 0,
      description: 'Every Tuesday night. Consistent runs with regulars. New players always welcome.',
      skillLevel: 'intermediate',
      eventType: 'pickup' as const,
    },
    {
      title: 'Thursday Soccer 5-a-Side',
      sport: 'soccer',
      dayOfWeek: 4, // Thursday
      hour: 18,
      durationHours: 1.5,
      maxParticipants: 10,
      price: 10,
      description: 'Weekly 5v5 on the turf. Fast games, quick rotations. Bring your boots.',
      skillLevel: 'intermediate',
      eventType: 'pickup' as const,
    },
    {
      title: 'Saturday Morning Tennis',
      sport: 'tennis',
      dayOfWeek: 6, // Saturday
      hour: 9,
      durationHours: 2,
      maxParticipants: 8,
      price: 15,
      description: 'Weekend doubles mixer. We rotate partners every set. Coffee after.',
      skillLevel: 'all_levels',
      eventType: 'game' as const,
    },
    {
      title: 'Sunday Volleyball Open Gym',
      sport: 'volleyball',
      dayOfWeek: 0, // Sunday
      hour: 10,
      durationHours: 3,
      maxParticipants: 16,
      price: 5,
      description: 'Sunday open gym. Indoor 6v6 with balanced teams. All levels.',
      skillLevel: 'all_levels',
      eventType: 'pickup' as const,
    },
    {
      title: 'Wednesday Badminton Club',
      sport: 'badminton',
      dayOfWeek: 3, // Wednesday
      hour: 20,
      durationHours: 2,
      maxParticipants: 12,
      price: 0,
      description: 'Midweek badminton. Doubles and singles. Rackets available to borrow.',
      skillLevel: 'all_levels',
      eventType: 'pickup' as const,
    },
    {
      title: 'Monday Basketball Practice',
      sport: 'basketball',
      dayOfWeek: 1, // Monday
      hour: 17,
      durationHours: 1.5,
      maxParticipants: 12,
      price: 0,
      description: 'Structured practice — shooting drills, scrimmage, conditioning.',
      skillLevel: 'intermediate',
      eventType: 'practice' as const,
    },
    {
      title: 'Friday Night Soccer',
      sport: 'soccer',
      dayOfWeek: 5, // Friday
      hour: 20,
      durationHours: 2,
      maxParticipants: 14,
      price: 10,
      description: 'End the week right. Competitive 7v7 under the lights.',
      skillLevel: 'advanced',
      eventType: 'game' as const,
    },
    {
      title: 'Saturday Afternoon Badminton',
      sport: 'badminton',
      dayOfWeek: 6, // Saturday
      hour: 14,
      durationHours: 2,
      maxParticipants: 16,
      price: 5,
      description: 'Casual Saturday session. Great for beginners and experienced players alike.',
      skillLevel: 'beginner',
      eventType: 'pickup' as const,
    },
  ];

  let recurringCount = 0;

  for (const series of recurringSeries) {
    const config = SPORT_CONFIGS.find((c) => c.sport === series.sport)!;
    const matchingFacility = facilities.find((f) =>
      f.sportTypes.includes(series.sport)
    );
    const facility = matchingFacility || pick(facilities);

    // Generate instances: 4 weeks back + 6 weeks forward = ~10 instances each
    for (let weekOffset = -4; weekOffset <= 6; weekOffset++) {
      // Find the next occurrence of this day of week from the offset
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = series.dayOfWeek - currentDay + weekOffset * 7;
      const startTime = dateAt(daysUntil, series.hour);
      const endTime = addHours(startTime, series.durationHours);
      const isPast = startTime < now;

      const event = await prisma.event.create({
        data: {
          title: series.title,
          description: series.description,
          sportType: series.sport,
          skillLevel: series.skillLevel,
          eventType: series.eventType,
          status: isPast ? 'completed' : 'active',
          startTime,
          endTime,
          maxParticipants: series.maxParticipants,
          currentParticipants: isPast
            ? randInt(
                Math.floor(series.maxParticipants * 0.6),
                series.maxParticipants
              )
            : randInt(0, Math.floor(series.maxParticipants * 0.5)),
          price: series.price,
          equipment: config.equipment,
          rules: config.rules,
          organizerId: pick(users).id,
          facilityId: facility.id,
        },
      });

      // Add bookings for past recurring events
      if (isPast) {
        const bookers = users
          .sort(() => Math.random() - 0.5)
          .slice(0, randInt(3, Math.min(users.length, series.maxParticipants)));
        for (const user of bookers) {
          await prisma.booking.create({
            data: {
              userId: user.id,
              eventId: event.id,
              bookingType: 'event',
              totalPrice: series.price,
              status: 'confirmed',
              paymentStatus: 'completed',
            },
          });
        }
      }

      recurringCount++;
    }
  }

  console.log(`  ✅ Created ${recurringCount} recurring event instances (${recurringSeries.length} series × ~11 weeks)`);

  // ─── A few special events ───
  console.log('Creating special events...');

  const specials = [
    {
      title: 'All-Sports Community Day',
      description: 'Try basketball, soccer, volleyball, and badminton. Rotating stations every 30 minutes. Free for everyone.',
      sportType: 'basketball',
      skillLevel: 'all_levels',
      eventType: 'practice',
      startTime: dateAt(14, 9),
      endTime: dateAt(14, 15),
      maxParticipants: 50,
      price: 0,
    },
    {
      title: 'Midnight Basketball',
      description: 'Late night hoops. Doors open at 11 PM. Bring your game face.',
      sportType: 'basketball',
      skillLevel: 'advanced',
      eventType: 'pickup',
      startTime: dateAt(7, 23),
      endTime: dateAt(8, 1),
      maxParticipants: 20,
      price: 10,
    },
    {
      title: 'Sunrise Tennis',
      description: 'Early bird gets the court. 6 AM start. Coffee provided.',
      sportType: 'tennis',
      skillLevel: 'all_levels',
      eventType: 'practice',
      startTime: dateAt(3, 6),
      endTime: dateAt(3, 8),
      maxParticipants: 8,
      price: 20,
    },
    {
      title: 'Soccer Skills Challenge',
      description: 'Dribbling, passing, shooting drills with timed challenges. Prizes for top performers.',
      sportType: 'soccer',
      skillLevel: 'intermediate',
      eventType: 'practice',
      startTime: dateAt(10, 16),
      endTime: dateAt(10, 18),
      maxParticipants: 20,
      price: 15,
    },
    {
      title: 'Badminton Doubles Showdown',
      description: 'Bring a partner or get matched. Round-robin format. Bragging rights on the line.',
      sportType: 'badminton',
      skillLevel: 'advanced',
      eventType: 'game',
      startTime: dateAt(5, 18),
      endTime: dateAt(5, 21),
      maxParticipants: 16,
      price: 10,
    },
  ];

  for (const special of specials) {
    const matchingFacility = facilities.find((f) =>
      f.sportTypes.includes(special.sportType)
    );
    const facility = matchingFacility || pick(facilities);

    await prisma.event.create({
      data: {
        ...special,
        status: 'active',
        currentParticipants: randInt(0, Math.floor(special.maxParticipants * 0.4)),
        equipment: SPORT_CONFIGS.find((c) => c.sport === special.sportType)!.equipment,
        rules: SPORT_CONFIGS.find((c) => c.sport === special.sportType)!.rules,
        organizerId: pick(users).id,
        facilityId: facility.id,
      },
    });
  }

  console.log(`  ✅ Created ${specials.length} special events`);

  const totalEvents = createdEvents.length + recurringCount + specials.length;
  console.log(`\n🎉 Done! Created ${totalEvents} total test events.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
