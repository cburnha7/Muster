import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const april = (day: number, hour: number, min = 0) =>
  new Date(2026, 3, day, hour, min); // month is 0-indexed

const dob = (year: number) => new Date(year, 0, 1);

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const sports = [
  'Basketball', 'Soccer', 'Flag_football', 'Baseball',
  'Softball', 'Volleyball', 'Kickball', 'Hockey',
  'Tennis', 'Lacrosse',
];

const skillLevels = ['beginner', 'intermediate', 'advanced', 'all'];

const meSports: Record<string, [number, number]> = {
  // name: [lat, lng]
  'Portland':        [43.6591, -70.2568],
  'South Portland':  [43.6415, -70.2409],
  'Westbrook':       [43.6770, -70.3712],
  'Scarborough':     [43.5787, -70.3242],
  'Gorham':          [43.6993, -70.4440],
  'Windham':         [43.8040, -70.4328],
  'Falmouth':        [43.7273, -70.2417],
  'Cape Elizabeth':  [43.5929, -70.2012],
  'Yarmouth':        [43.8001, -70.1884],
  'Cumberland':      [43.7993, -70.2590],
  'Gray':            [43.8918, -70.3373],
};

const meLocations = Object.entries(meSports);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding test data for April 2026...');

  // ── 1. Users ─────────────────────────────────────────────────────────────

  const userData = [
    // [firstName, lastName, email, gender, dobYear, sports]
    ['Liam',    'Foster',    'liam.foster@test.com',    'male',   1990, ['Basketball', 'Soccer']],
    ['Noah',    'Carter',    'noah.carter@test.com',    'male',   1988, ['Baseball', 'Softball']],
    ['Elijah',  'Brooks',    'elijah.brooks@test.com',  'male',   1995, ['Flag_football', 'Kickball']],
    ['James',   'Rivera',    'james.rivera@test.com',   'male',   1992, ['Soccer', 'Lacrosse']],
    ['Oliver',  'Ward',      'oliver.ward@test.com',    'male',   1987, ['Hockey', 'Basketball']],
    ['Lucas',   'Price',     'lucas.price@test.com',    'male',   1998, ['Tennis', 'Volleyball']],
    ['Mason',   'Bell',      'mason.bell@test.com',     'male',   1993, ['Basketball', 'Flag_football']],
    ['Ethan',   'Murphy',    'ethan.murphy@test.com',   'male',   1991, ['Soccer', 'Baseball']],
    ['Aiden',   'Coleman',   'aiden.coleman@test.com',  'male',   1996, ['Kickball', 'Softball']],
    ['Logan',   'Ross',      'logan.ross@test.com',     'male',   1989, ['Lacrosse', 'Hockey']],
    ['Emma',    'Hughes',    'emma.hughes@test.com',    'female', 1994, ['Soccer', 'Volleyball']],
    ['Olivia',  'Sanders',   'olivia.sanders@test.com', 'female', 1997, ['Basketball', 'Tennis']],
    ['Ava',     'Patterson', 'ava.patterson@test.com',  'female', 1991, ['Softball', 'Kickball']],
    ['Sophia',  'Jenkins',   'sophia.jenkins@test.com', 'female', 1993, ['Soccer', 'Lacrosse']],
    ['Isabella','Perry',     'isabella.perry@test.com', 'female', 1989, ['Volleyball', 'Basketball']],
    ['Mia',     'Long',      'mia.long@test.com',       'female', 1999, ['Tennis', 'Flag_football']],
    ['Charlotte','Butler',   'charlotte.butler@test.com','female',1995, ['Soccer', 'Softball']],
    ['Amelia',  'Simmons',   'amelia.simmons@test.com', 'female', 1992, ['Basketball', 'Volleyball']],
    ['Harper',  'Foster',    'harper.foster@test.com',  'female', 1996, ['Kickball', 'Soccer']],
    ['Evelyn',  'Gonzalez',  'evelyn.gonzalez@test.com','female', 1990, ['Lacrosse', 'Tennis']],
    ['Jack',    'Bryant',    'jack.bryant@test.com',    'male',   1986, ['Hockey', 'Basketball']],
    ['Henry',   'Alexander', 'henry.alexander@test.com','male',   2000, ['Soccer', 'Flag_football']],
    ['Owen',    'Russell',   'owen.russell@test.com',   'male',   1994, ['Baseball', 'Hockey']],
    ['Sebastian','Griffin',  'sebastian.griffin@test.com','male', 1997, ['Basketball', 'Lacrosse']],
    ['Carter',  'Diaz',      'carter.diaz@test.com',    'male',   1988, ['Softball', 'Soccer']],
    ['Wyatt',   'Hayes',     'wyatt.hayes@test.com',    'male',   1992, ['Flag_football', 'Basketball']],
    ['Jayden',  'Myers',     'jayden.myers@test.com',   'male',   2001, ['Soccer', 'Volleyball']],
    ['Grayson', 'Ford',      'grayson.ford@test.com',   'male',   1985, ['Tennis', 'Baseball']],
    ['Levi',    'Hamilton',  'levi.hamilton@test.com',  'male',   1998, ['Kickball', 'Flag_football']],
    ['Isaac',   'Graham',    'isaac.graham@test.com',   'male',   1993, ['Basketball', 'Soccer']],
  ] as const;

  const users = [];
  for (const [firstName, lastName, email, gender, dobYear, prefs] of userData) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        password: hash('Test1234!'),
        gender,
        dateOfBirth: dob(dobYear),
        sportPreferences: [...prefs],
        onboardingComplete: true,
        locationCity: 'Portland',
        locationState: 'ME',
        locationLat: 43.6591,
        locationLng: -70.2568,
        membershipTier: 'standard',
        role: 'member',
      },
    });
    users.push(user);
    console.log(`  ✓ User: ${firstName} ${lastName}`);
  }

  // First 3 users are organizers/commissioners/facility owners
  const [owner1, owner2, owner3, ...members] = users;

  // ── 2. Facilities / Grounds ──────────────────────────────────────────────

  const facilityDefs = [
    {
      name: 'Riverside Athletic Complex',
      city: 'Portland', sport: 'Basketball',
      street: '100 Riverside St', zip: '04103',
      lat: 43.6591, lng: -70.2568,
      owner: owner1,
      courts: [
        { name: 'Court A', sport: 'Basketball', indoor: true },
        { name: 'Court B', sport: 'Basketball', indoor: true },
      ],
    },
    {
      name: 'Deering Oaks Sports Center',
      city: 'Portland', sport: 'Soccer',
      street: '212 Park Ave', zip: '04102',
      lat: 43.6631, lng: -70.2631,
      owner: owner1,
      courts: [
        { name: 'Field 1', sport: 'Soccer', indoor: false },
        { name: 'Field 2', sport: 'Soccer', indoor: false },
      ],
    },
    {
      name: 'South Portland Rec Center',
      city: 'South Portland', sport: 'Volleyball',
      street: '21 Nelson Rd', zip: '04106',
      lat: 43.6415, lng: -70.2409,
      owner: owner2,
      courts: [
        { name: 'Court 1', sport: 'Volleyball', indoor: true },
      ],
    },
    {
      name: 'Scarborough Sports Dome',
      city: 'Scarborough', sport: 'Flag_football',
      street: '40 Gorham Rd', zip: '04074',
      lat: 43.5787, lng: -70.3242,
      owner: owner2,
      courts: [
        { name: 'Field A', sport: 'Flag_football', indoor: false },
        { name: 'Field B', sport: 'Flag_football', indoor: false },
      ],
    },
    {
      name: 'Westbrook Community Fields',
      city: 'Westbrook', sport: 'Baseball',
      street: '55 Main St', zip: '04092',
      lat: 43.6770, lng: -70.3712,
      owner: owner3,
      courts: [
        { name: 'Diamond 1', sport: 'Baseball', indoor: false },
        { name: 'Diamond 2', sport: 'Softball', indoor: false },
      ],
    },
    {
      name: 'Falmouth Athletic Park',
      city: 'Falmouth', sport: 'Lacrosse',
      street: '33 Foreside Rd', zip: '04105',
      lat: 43.7273, lng: -70.2417,
      owner: owner3,
      courts: [
        { name: 'Lacrosse Field', sport: 'Lacrosse', indoor: false },
      ],
    },
    {
      name: 'Gorham Recreation Hub',
      city: 'Gorham', sport: 'Basketball',
      street: '75 Main St', zip: '04038',
      lat: 43.6993, lng: -70.4440,
      owner: owner1,
      courts: [
        { name: 'Gym Court 1', sport: 'Basketball', indoor: true },
        { name: 'Gym Court 2', sport: 'Basketball', indoor: true },
      ],
    },
    {
      name: 'Yarmouth Community Center',
      city: 'Yarmouth', sport: 'Tennis',
      street: '10 East Main St', zip: '04096',
      lat: 43.8001, lng: -70.1884,
      owner: owner2,
      courts: [
        { name: 'Tennis Court 1', sport: 'Tennis', indoor: false },
        { name: 'Tennis Court 2', sport: 'Tennis', indoor: false },
      ],
    },
    {
      name: 'Windham Sports Complex',
      city: 'Windham', sport: 'Soccer',
      street: '8 School Rd', zip: '04062',
      lat: 43.8040, lng: -70.4328,
      owner: owner3,
      courts: [
        { name: 'Turf Field', sport: 'Soccer', indoor: false },
      ],
    },
    {
      name: 'Cape Elizabeth Grounds',
      city: 'Cape Elizabeth', sport: 'Kickball',
      street: '320 Ocean House Rd', zip: '04107',
      lat: 43.5929, lng: -70.2012,
      owner: owner1,
      courts: [
        { name: 'Field 1', sport: 'Kickball', indoor: false },
        { name: 'Field 2', sport: 'Kickball', indoor: false },
      ],
    },
    {
      name: 'Cumberland Athletic Center',
      city: 'Cumberland', sport: 'Hockey',
      street: '290 Tuttle Rd', zip: '04021',
      lat: 43.7993, lng: -70.2590,
      owner: owner2,
      courts: [
        { name: 'Ice Rink A', sport: 'Hockey', indoor: true },
      ],
    },
    {
      name: 'Gray Recreation Fields',
      city: 'Gray', sport: 'Flag_football',
      street: '15 Shaker Rd', zip: '04039',
      lat: 43.8918, lng: -70.3373,
      owner: owner3,
      courts: [
        { name: 'Field North', sport: 'Flag_football', indoor: false },
        { name: 'Field South', sport: 'Flag_football', indoor: false },
      ],
    },
  ];

  const facilities = [];
  for (const def of facilityDefs) {
    const facility = await prisma.facility.create({
      data: {
        name: def.name,
        description: `A great place to play ${def.sport} in ${def.city}, Maine.`,
        sportTypes: [def.sport],
        pricePerHour: pick([0, 25, 50, 75]),
        street: def.street,
        city: def.city,
        state: 'ME',
        zipCode: def.zip,
        latitude: def.lat,
        longitude: def.lng,
        isActive: true,
        ownerId: def.owner.id,
        courts: {
          create: def.courts.map((c, i) => ({
            name: c.name,
            sportType: c.sport,
            capacity: pick([10, 20, 30, 40]),
            isIndoor: c.indoor,
            displayOrder: i,
          })),
        },
      },
      include: { courts: true },
    });
    facilities.push(facility);
    console.log(`  ✓ Ground: ${def.name} (${def.courts.length} courts)`);
  }

  // ── 3. Leagues ───────────────────────────────────────────────────────────

  const leagueDefs = [
    { name: 'Greater Portland Basketball League',  sport: 'Basketball',    skill: 'intermediate', organizer: owner1 },
    { name: 'Maine Adult Soccer League',           sport: 'Soccer',        skill: 'all',          organizer: owner1 },
    { name: 'Southern Maine Flag Football League', sport: 'Flag_football', skill: 'intermediate', organizer: owner2 },
    { name: 'Portland Softball Association',       sport: 'Softball',      skill: 'beginner',     organizer: owner2 },
    { name: 'Youth Basketball - U12',              sport: 'Basketball',    skill: 'beginner',     organizer: owner3 },
    { name: 'Youth Soccer - U9',                   sport: 'Soccer',        skill: 'beginner',     organizer: owner3 },
    { name: 'Casco Bay Volleyball League',         sport: 'Volleyball',    skill: 'intermediate', organizer: owner1 },
    { name: 'Portland Kickball Classic',           sport: 'Kickball',      skill: 'all',          organizer: owner2 },
    { name: 'Maine Lacrosse League',               sport: 'Lacrosse',      skill: 'advanced',     organizer: owner3 },
    { name: 'Southern Maine Hockey League',        sport: 'Hockey',        skill: 'intermediate', organizer: owner1 },
    { name: 'Greater Portland Baseball League',    sport: 'Baseball',      skill: 'all',          organizer: owner2 },
    { name: 'Maine Tennis Doubles League',         sport: 'Tennis',        skill: 'advanced',     organizer: owner3 },
  ];

  const leagues = [];
  for (const def of leagueDefs) {
    const league = await prisma.league.create({
      data: {
        name: def.name,
        description: `Competitive ${def.sport} league for the Greater Portland area.`,
        sportType: def.sport,
        skillLevel: def.skill,
        organizerId: def.organizer.id,
        isActive: true,
        leagueType: 'team',
        visibility: 'public',
        leagueFormat: 'season',
        gameFrequency: 'weekly',
        startDate: april(1, 8),
        endDate: april(30, 20),
        scheduleGenerated: false,
        trackStandings: true,
        pricingType: 'free',
      },
    });
    leagues.push(league);
    console.log(`  ✓ League: ${def.name}`);
  }

  // ── 4. Rosters / Teams ───────────────────────────────────────────────────

  const rosterDefs = [
    { name: 'Portland Ballers',      sport: 'Basketball',    league: leagues[0],  captain: users[4] },
    { name: 'Casco Bay Hoopers',     sport: 'Basketball',    league: leagues[0],  captain: users[5] },
    { name: 'Maine FC',              sport: 'Soccer',        league: leagues[1],  captain: users[6] },
    { name: 'Deering Rovers',        sport: 'Soccer',        league: leagues[1],  captain: users[7] },
    { name: 'Flag Smashers',         sport: 'Flag_football', league: leagues[2],  captain: users[8] },
    { name: 'Scarborough Strikers',  sport: 'Flag_football', league: leagues[2],  captain: users[9] },
    { name: 'South Portland Slugs',  sport: 'Softball',      league: leagues[3],  captain: users[10] },
    { name: 'Westbrook Wombats',     sport: 'Softball',      league: leagues[3],  captain: users[11] },
    { name: 'Pickup Hoopers',        sport: 'Basketball',    league: null,        captain: users[12] },
    { name: 'Sunday Soccer Crew',    sport: 'Soccer',        league: null,        captain: users[13] },
  ];

  const rosters = [];
  for (const def of rosterDefs) {
    const roster = await prisma.team.create({
      data: {
        name: def.name,
        description: `${def.name} — ${def.sport} roster.`,
        sportType: def.sport,
        skillLevel: 'intermediate',
        maxMembers: 15,
        isPrivate: false,
        leagueId: def.league?.id ?? null,
        members: {
          create: {
            userId: def.captain.id,
            role: 'captain',
            status: 'active',
          },
        },
      },
    });

    // Add 4 random members per roster
    const pool = members.filter(m => m.id !== def.captain.id);
    const chosen = pool.sort(() => 0.5 - Math.random()).slice(0, 4);
    for (const member of chosen) {
      await prisma.teamMember.upsert({
        where: { userId_teamId: { userId: member.id, teamId: roster.id } },
        update: {},
        create: { userId: member.id, teamId: roster.id, role: 'member', status: 'active' },
      });
    }

    rosters.push(roster);
    console.log(`  ✓ Roster: ${def.name}`);
  }

  // ── 5. Events — Fill April ───────────────────────────────────────────────

  const eventDefs: {
    title: string;
    sport: string;
    day: number;
    startH: number;
    durationH: number;
    max: number;
    price: number;
    organizer: typeof users[0];
    facility: typeof facilities[0] | null;
    locationName?: string;
    locationAddress?: string;
    locationLat?: number;
    locationLng?: number;
  }[] = [
    // Week 1
    { title: 'Pickup Basketball - Monday Morning',      sport: 'Basketball',    day: 6,  startH: 7,  durationH: 2, max: 20, price: 0,  organizer: owner1, facility: facilities[0] },
    { title: 'Tuesday Night Soccer',                    sport: 'Soccer',        day: 7,  startH: 18, durationH: 2, max: 22, price: 5,  organizer: owner1, facility: facilities[1] },
    { title: 'Wednesday Volleyball Open Gym',           sport: 'Volleyball',    day: 8,  startH: 12, durationH: 2, max: 18, price: 0,  organizer: owner2, facility: facilities[2] },
    { title: 'Thursday Flag Football Pickup',           sport: 'Flag_football', day: 9,  startH: 17, durationH: 2, max: 24, price: 5,  organizer: owner2, facility: facilities[3] },
    { title: 'Friday Evening Basketball',               sport: 'Basketball',    day: 10, startH: 19, durationH: 2, max: 16, price: 0,  organizer: owner3, facility: facilities[6] },
    { title: 'Saturday Morning Soccer',                 sport: 'Soccer',        day: 11, startH: 9,  durationH: 2, max: 20, price: 0,  organizer: owner3, facility: facilities[8] },
    { title: 'Saturday Softball Game',                  sport: 'Softball',      day: 11, startH: 11, durationH: 3, max: 20, price: 0,  organizer: owner1, facility: facilities[4] },

    // Week 2
    { title: 'Monday Lacrosse Scrimmage',               sport: 'Lacrosse',      day: 13, startH: 17, durationH: 2, max: 20, price: 10, organizer: owner1, facility: facilities[5] },
    { title: 'Tuesday Basketball 3v3',                  sport: 'Basketball',    day: 14, startH: 18, durationH: 2, max: 12, price: 0,  organizer: owner2, facility: facilities[0] },
    { title: 'Wednesday Night Kickball',                sport: 'Kickball',      day: 15, startH: 18, durationH: 2, max: 24, price: 5,  organizer: owner2, facility: facilities[9] },
    { title: 'Thursday Soccer Pickup',                  sport: 'Soccer',        day: 16, startH: 17, durationH: 2, max: 18, price: 0,  organizer: owner3, facility: facilities[1] },
    { title: 'Friday Night Volleyball',                 sport: 'Volleyball',    day: 17, startH: 20, durationH: 2, max: 16, price: 5,  organizer: owner3, facility: facilities[2] },
    { title: 'Saturday Baseball Double Header',         sport: 'Baseball',      day: 18, startH: 10, durationH: 4, max: 22, price: 0,  organizer: owner1, facility: facilities[4] },
    { title: 'Sunday Flag Football Shootout',           sport: 'Flag_football', day: 19, startH: 10, durationH: 3, max: 28, price: 10, organizer: owner1, facility: facilities[3] },

    // Week 3
    { title: 'Monday Morning Basketball',               sport: 'Basketball',    day: 20, startH: 6,  durationH: 2, max: 20, price: 0,  organizer: owner2, facility: facilities[6] },
    { title: 'Tuesday Tennis Mixer',                    sport: 'Tennis',        day: 21, startH: 17, durationH: 2, max: 8,  price: 15, organizer: owner2, facility: facilities[7] },
    { title: 'Wednesday Pickup Soccer',                 sport: 'Soccer',        day: 22, startH: 18, durationH: 2, max: 20, price: 0,  organizer: owner3, facility: null, locationName: 'Payson Park', locationAddress: '163 Forrest Ave, Portland, ME 04101', locationLat: 43.6653, locationLng: -70.2756 },
    { title: 'Thursday Hockey Pickup',                  sport: 'Hockey',        day: 23, startH: 20, durationH: 2, max: 14, price: 20, organizer: owner3, facility: facilities[10] },
    { title: 'Friday Kickball Happy Hour',              sport: 'Kickball',      day: 24, startH: 17, durationH: 2, max: 20, price: 5,  organizer: owner1, facility: facilities[9] },
    { title: 'Saturday Lacrosse Open',                  sport: 'Lacrosse',      day: 25, startH: 9,  durationH: 3, max: 22, price: 10, organizer: owner1, facility: facilities[5] },
    { title: 'Saturday Evening Basketball Tournament',  sport: 'Basketball',    day: 25, startH: 14, durationH: 4, max: 24, price: 15, organizer: owner2, facility: facilities[0] },
    { title: 'Sunday Soccer 5v5',                       sport: 'Soccer',        day: 26, startH: 10, durationH: 2, max: 10, price: 0,  organizer: owner2, facility: facilities[8] },

    // Week 4
    { title: 'Monday Flag Football Practice',           sport: 'Flag_football', day: 27, startH: 17, durationH: 2, max: 24, price: 0,  organizer: owner3, facility: facilities[11] },
    { title: 'Tuesday Softball Pickup',                 sport: 'Softball',      day: 28, startH: 18, durationH: 2, max: 20, price: 0,  organizer: owner3, facility: facilities[4] },
    { title: 'Wednesday Basketball Shoot Around',       sport: 'Basketball',    day: 29, startH: 7,  durationH: 1, max: 16, price: 0,  organizer: owner1, facility: null, locationName: 'East End Community School', locationAddress: '195 N St, Portland, ME 04101', locationLat: 43.6639, locationLng: -70.2480 },
    { title: 'Thursday Tennis Clinic',                  sport: 'Tennis',        day: 30, startH: 9,  durationH: 2, max: 8,  price: 20, organizer: owner1, facility: facilities[7] },

    // Extra events to pack the month
    { title: 'Evening Volleyball Pickup',               sport: 'Volleyball',    day: 1,  startH: 19, durationH: 2, max: 16, price: 0,  organizer: owner3, facility: facilities[2] },
    { title: 'Westbrook Soccer Open',                   sport: 'Soccer',        day: 2,  startH: 17, durationH: 2, max: 18, price: 5,  organizer: owner2, facility: facilities[8] },
    { title: 'Portland 3v3 Basketball',                 sport: 'Basketball',    day: 3,  startH: 18, durationH: 2, max: 12, price: 0,  organizer: owner1, facility: facilities[0] },
    { title: 'Cape Elizabeth Kickball',                 sport: 'Kickball',      day: 4,  startH: 15, durationH: 2, max: 20, price: 0,  organizer: owner3, facility: facilities[9] },
    { title: 'Gorham Basketball Night',                 sport: 'Basketball',    day: 5,  startH: 20, durationH: 2, max: 16, price: 5,  organizer: owner2, facility: facilities[6] },
    { title: 'Gray Flag Football Pickup',               sport: 'Flag_football', day: 12, startH: 10, durationH: 2, max: 22, price: 0,  organizer: owner1, facility: facilities[11] },
  ];

  const events = [];
  for (const def of eventDefs) {
    const start = april(def.day, def.startH);
    const end   = april(def.day, def.startH + def.durationH);

    const event = await prisma.event.create({
      data: {
        title: def.title,
        description: `Join us for ${def.title}. All ${def.sport} skill levels welcome.`,
        sportType: def.sport,
        skillLevel: pick(skillLevels),
        eventType: 'public',
        status: 'active',
        startTime: start,
        endTime: end,
        maxParticipants: def.max,
        currentParticipants: Math.floor(Math.random() * (def.max * 0.6)),
        price: def.price,
        isPrivate: false,
        organizerId: def.organizer.id,
        facilityId: def.facility?.id ?? null,
        locationName: def.locationName ?? null,
        locationAddress: def.locationAddress ?? null,
        locationLat: def.locationLat ?? null,
        locationLng: def.locationLng ?? null,
      },
    });

    // Book 3–8 random users into the event
    const attendees = users.sort(() => 0.5 - Math.random()).slice(0, pick([3, 4, 5, 6, 7, 8]));
    for (const attendee of attendees) {
      await prisma.booking.create({
        data: {
          userId: attendee.id,
          eventId: event.id,
          facilityId: def.facility?.id ?? null,
          status: 'confirmed',
          bookingType: 'event',
          totalPrice: def.price,
          paymentStatus: def.price === 0 ? 'paid' : 'paid',
        },
      });
    }

    events.push(event);
    console.log(`  ✓ Event: ${def.title} (Apr ${def.day})`);
  }

  // ── 6. League Memberships ────────────────────────────────────────────────

  for (let i = 0; i < Math.min(rosters.length, leagues.length); i++) {
    await prisma.leagueMembership.upsert({
      where: {
        teamId_leagueId: {
          teamId: rosters[i].id,
          leagueId: leagues[i % leagues.length].id,
        },
      },
      update: {},
      create: {
        teamId: rosters[i].id,
        leagueId: leagues[i % leagues.length].id,
        memberType: 'roster',
        status: 'active',
      },
    });
  }

  console.log('\n✅ Seed complete!');
  console.log(`   ${users.length} users`);
  console.log(`   ${facilities.length} grounds`);
  console.log(`   ${leagues.length} leagues`);
  console.log(`   ${rosters.length} rosters`);
  console.log(`   ${events.length} events across April 2026`);
  console.log('\n🗑️  To delete all seed data, filter by test.com emails and created timestamps.');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());