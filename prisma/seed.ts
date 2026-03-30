import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(18, 0, 0, 0);
  return d;
}

function dob(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

const counts: Record<string, number> = {};
function track(model: string, n = 1) {
  counts[model] = (counts[model] || 0) + n;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding preview database…');

  const hash = await bcrypt.hash('Muster123!', 10);

  // ── Users ────────────────────────────────────────────────────────────────

  const userDefs = [
    { email: 'admin@muster.test',         firstName: 'Ada',      lastName: 'Morales',   role: 'admin',  gender: 'female', dob: dob(1990, 3, 12), tier: 'pro' },
    { email: 'owner@muster.test',         firstName: 'Owen',     lastName: 'Park',      role: 'member', gender: 'male',   dob: dob(1985, 7, 22), tier: 'pro' },
    { email: 'commissioner@muster.test',  firstName: 'Carmen',   lastName: 'Reyes',     role: 'member', gender: 'female', dob: dob(1988, 11, 5), tier: 'pro' },
    { email: 'player1@muster.test',       firstName: 'Marcus',   lastName: 'Johnson',   role: 'member', gender: 'male',   dob: dob(2002, 1, 15), tier: 'standard' },
    { email: 'player2@muster.test',       firstName: 'Priya',    lastName: 'Sharma',    role: 'member', gender: 'female', dob: dob(1998, 6, 30), tier: 'standard' },
    { email: 'player3@muster.test',       firstName: 'Jamal',    lastName: 'Williams',  role: 'member', gender: 'male',   dob: dob(1995, 9, 8),  tier: 'pro' },
    { email: 'player4@muster.test',       firstName: 'Sofia',    lastName: 'Martinez',  role: 'member', gender: 'female', dob: dob(2000, 4, 18), tier: 'standard' },
    { email: 'player5@muster.test',       firstName: 'Liam',     lastName: 'Chen',      role: 'member', gender: 'male',   dob: dob(1992, 12, 3), tier: 'standard' },
    { email: 'player6@muster.test',       firstName: 'Aisha',    lastName: 'Okafor',    role: 'member', gender: 'female', dob: dob(1997, 8, 25), tier: 'pro' },
    { email: 'player7@muster.test',       firstName: 'Diego',    lastName: 'Rivera',    role: 'member', gender: 'male',   dob: dob(1983, 2, 14), tier: 'standard' },
  ];

  const users: Record<string, any> = {};
  for (const u of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        dateOfBirth: u.dob,
        gender: u.gender,
        membershipTier: u.tier,
        role: u.role,
      },
    });
    users[u.email] = user;
    track('User');
  }

  const admin        = users['admin@muster.test'];
  const owner        = users['owner@muster.test'];
  const commissioner = users['commissioner@muster.test'];
  const p1 = users['player1@muster.test'];
  const p2 = users['player2@muster.test'];
  const p3 = users['player3@muster.test'];
  const p4 = users['player4@muster.test'];
  const p5 = users['player5@muster.test'];
  const p6 = users['player6@muster.test'];
  const p7 = users['player7@muster.test'];

  console.log('✅ Users');

  // ── PlayerSportRatings ───────────────────────────────────────────────────

  const ratingDefs: { userId: string; sport: string; rating: number; pct: number }[] = [
    { userId: p1.id, sport: 'basketball', rating: 1.8, pct: 65 },
    { userId: p1.id, sport: 'soccer',     rating: 1.2, pct: 35 },
    { userId: p1.id, sport: 'tennis',     rating: 0.9, pct: 15 },
    { userId: p2.id, sport: 'basketball', rating: 2.1, pct: 80 },
    { userId: p2.id, sport: 'tennis',     rating: 1.5, pct: 50 },
    { userId: p3.id, sport: 'basketball', rating: 2.5, pct: 95 },
    { userId: p3.id, sport: 'soccer',     rating: 1.9, pct: 70 },
    { userId: p4.id, sport: 'tennis',     rating: 1.1, pct: 25 },
    { userId: p4.id, sport: 'soccer',     rating: 0.8, pct: 10 },
    { userId: p5.id, sport: 'basketball', rating: 1.4, pct: 45 },
    { userId: p5.id, sport: 'tennis',     rating: 2.0, pct: 75 },
    { userId: p6.id, sport: 'soccer',     rating: 1.6, pct: 55 },
    { userId: p6.id, sport: 'basketball', rating: 1.3, pct: 40 },
    { userId: p7.id, sport: 'basketball', rating: 1.0, pct: 20 },
    { userId: p7.id, sport: 'soccer',     rating: 2.2, pct: 85 },
    { userId: p7.id, sport: 'tennis',     rating: 1.7, pct: 60 },
  ];

  for (const r of ratingDefs) {
    await prisma.playerSportRating.upsert({
      where: { userId_sportType: { userId: r.userId, sportType: r.sport } },
      update: {},
      create: {
        userId: r.userId,
        sportType: r.sport,
        rating: r.rating,
        percentile: r.pct,
        overallRating: r.rating,
        overallPercentile: r.pct,
        overallEventCount: Math.floor(r.pct / 10),
      },
    });
    track('PlayerSportRating');
  }

  console.log('✅ PlayerSportRatings');

  // ── Facility ─────────────────────────────────────────────────────────────

  // Use a deterministic ID so upsert works on re-runs
  const FACILITY_ID = '00000000-0000-4000-a000-000000000001';

  const facility = await prisma.facility.upsert({
    where: { id: FACILITY_ID },
    update: {},
    create: {
      id: FACILITY_ID,
      name: 'Muster Sports Complex',
      description: 'Multi-sport facility in Portland with indoor and outdoor courts.',
      sportTypes: ['basketball', 'tennis'],
      amenities: ['Parking', 'Locker Rooms', 'Showers', 'Pro Shop'],
      pricePerHour: 45,
      isVerified: true,
      verificationStatus: 'approved',
      street: '100 Congress Street',
      city: 'Portland',
      state: 'ME',
      zipCode: '04101',
      latitude: 43.6591,
      longitude: -70.2568,
      ownerId: owner.id,
    },
  });
  track('Facility');

  // ── FacilityCourts ───────────────────────────────────────────────────────

  const COURT1_ID = '00000000-0000-4000-a000-000000000010';
  const COURT2_ID = '00000000-0000-4000-a000-000000000011';

  const court1 = await prisma.facilityCourt.upsert({
    where: { id: COURT1_ID },
    update: {},
    create: {
      id: COURT1_ID,
      facilityId: facility.id,
      name: 'Court 1',
      sportType: 'basketball',
      capacity: 10,
      isIndoor: true,
      displayOrder: 1,
    },
  });
  track('FacilityCourt');

  const court2 = await prisma.facilityCourt.upsert({
    where: { id: COURT2_ID },
    update: {},
    create: {
      id: COURT2_ID,
      facilityId: facility.id,
      name: 'Court 2',
      sportType: 'tennis',
      capacity: 4,
      isIndoor: false,
      displayOrder: 2,
    },
  });
  track('FacilityCourt');

  console.log('✅ Facility & Courts');

  // ── Court Availability ───────────────────────────────────────────────────

  // Helper: delete existing recurring availability for a court, then re-create
  async function seedCourtAvailability(courtId: string, weekday: [string, string], weekend: [string, string]) {
    await prisma.facilityCourtAvailability.deleteMany({
      where: { courtId, isRecurring: true },
    });
    // Mon–Fri (1–5)
    for (let day = 1; day <= 5; day++) {
      await prisma.facilityCourtAvailability.create({
        data: { courtId, dayOfWeek: day, startTime: weekday[0], endTime: weekday[1], isRecurring: true },
      });
      track('FacilityCourtAvailability');
    }
    // Sat (6) & Sun (0)
    for (const day of [0, 6]) {
      await prisma.facilityCourtAvailability.create({
        data: { courtId, dayOfWeek: day, startTime: weekend[0], endTime: weekend[1], isRecurring: true },
      });
      track('FacilityCourtAvailability');
    }
  }

  await seedCourtAvailability(court1.id, ['08:00', '22:00'], ['09:00', '20:00']);
  await seedCourtAvailability(court2.id, ['08:00', '22:00'], ['09:00', '20:00']);

  // ── Facility Availability (mirrors court hours) ──────────────────────────

  await prisma.facilityAvailability.deleteMany({
    where: { facilityId: facility.id, isRecurring: true },
  });
  for (let day = 1; day <= 5; day++) {
    await prisma.facilityAvailability.create({
      data: { facilityId: facility.id, dayOfWeek: day, startTime: '08:00', endTime: '22:00', isRecurring: true },
    });
    track('FacilityAvailability');
  }
  for (const day of [0, 6]) {
    await prisma.facilityAvailability.create({
      data: { facilityId: facility.id, dayOfWeek: day, startTime: '09:00', endTime: '20:00', isRecurring: true },
    });
    track('FacilityAvailability');
  }

  console.log('✅ Availability');

  // ── FacilityRateSchedule ─────────────────────────────────────────────────

  const RATE_ID = '00000000-0000-4000-a000-000000000020';
  await prisma.facilityRateSchedule.upsert({
    where: { id: RATE_ID },
    update: {},
    create: {
      id: RATE_ID,
      facilityId: facility.id,
      name: 'Base Rate',
      rateType: 'base',
      hourlyRate: 45,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      priority: 0,
    },
  });
  track('FacilityRateSchedule');

  console.log('✅ Rate Schedule');

  // ── Events ───────────────────────────────────────────────────────────────

  const EVT_BB1_ID  = '00000000-0000-4000-a000-000000000100';
  const EVT_BB2_ID  = '00000000-0000-4000-a000-000000000101';
  const EVT_TEN_ID  = '00000000-0000-4000-a000-000000000102';
  const EVT_PAST_ID = '00000000-0000-4000-a000-000000000103';
  const EVT_CXL_ID  = '00000000-0000-4000-a000-000000000104';

  const eventDefs = [
    {
      id: EVT_BB1_ID, title: 'Pickup Hoops — Wednesday', description: 'Casual 5v5 pickup basketball.',
      sportType: 'basketball', skillLevel: 'intermediate', eventType: 'pickup', status: 'active',
      startTime: daysFromNow(3), endTime: new Date(daysFromNow(3).getTime() + 2 * 3600000),
      maxParticipants: 10, price: 15, organizerId: commissioner.id, facilityId: facility.id,
    },
    {
      id: EVT_BB2_ID, title: 'Sunday Run — Basketball', description: 'Weekend basketball run, all levels.',
      sportType: 'basketball', skillLevel: 'intermediate', eventType: 'pickup', status: 'active',
      startTime: daysFromNow(7), endTime: new Date(daysFromNow(7).getTime() + 2 * 3600000),
      maxParticipants: 10, price: 15, organizerId: commissioner.id, facilityId: facility.id,
    },
    {
      id: EVT_TEN_ID, title: 'Doubles Tennis Mixer', description: 'Rotating doubles partners.',
      sportType: 'tennis', skillLevel: 'beginner', eventType: 'pickup', status: 'active',
      startTime: daysFromNow(5), endTime: new Date(daysFromNow(5).getTime() + 2 * 3600000),
      maxParticipants: 10, price: 15, organizerId: commissioner.id, facilityId: facility.id,
    },
    {
      id: EVT_PAST_ID, title: 'Last Week Pickup — Basketball', description: 'Completed pickup game.',
      sportType: 'basketball', skillLevel: 'intermediate', eventType: 'pickup', status: 'completed',
      startTime: daysFromNow(-7), endTime: new Date(daysFromNow(-7).getTime() + 2 * 3600000),
      maxParticipants: 10, price: 15, organizerId: commissioner.id, facilityId: facility.id,
    },
    {
      id: EVT_CXL_ID, title: 'Soccer Kickabout', description: 'Casual soccer — cancelled.',
      sportType: 'soccer', skillLevel: 'beginner', eventType: 'pickup', status: 'cancelled',
      cancellationReason: 'Not enough players',
      startTime: daysFromNow(10), endTime: new Date(daysFromNow(10).getTime() + 2 * 3600000),
      maxParticipants: 10, price: 15, organizerId: commissioner.id, facilityId: facility.id,
    },
  ];

  for (const e of eventDefs) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {},
      create: e as any,
    });
    track('Event');
  }

  console.log('✅ Events');

  // ── Bookings ─────────────────────────────────────────────────────────────

  // Upcoming basketball event — players 1-4
  for (const p of [p1, p2, p3, p4]) {
    const bookingId = `booking-bb1-${p.id}`;
    await prisma.booking.upsert({
      where: { id: bookingId },
      update: {},
      create: {
        id: bookingId,
        userId: p.id,
        eventId: EVT_BB1_ID,
        facilityId: facility.id,
        status: 'confirmed',
        bookingType: 'event',
        totalPrice: 15,
        paymentStatus: 'paid',
      },
    });
    track('Booking');
  }

  // Past completed event — players 1-3
  for (const p of [p1, p2, p3]) {
    const bookingId = `booking-past-${p.id}`;
    await prisma.booking.upsert({
      where: { id: bookingId },
      update: {},
      create: {
        id: bookingId,
        userId: p.id,
        eventId: EVT_PAST_ID,
        facilityId: facility.id,
        status: 'confirmed',
        bookingType: 'event',
        totalPrice: 15,
        paymentStatus: 'paid',
        debriefSubmitted: true,
      },
    });
    track('Booking');
  }

  console.log('✅ Bookings');

  // ── GameParticipations ───────────────────────────────────────────────────

  const pastStart = daysFromNow(-7);
  const gpDefs = [
    { userId: p1.id, eventId: EVT_PAST_ID, votesReceived: 2, gameRating: 1.2 },
    { userId: p2.id, eventId: EVT_PAST_ID, votesReceived: 1, gameRating: 1.2 },
    { userId: p3.id, eventId: EVT_PAST_ID, votesReceived: 3, gameRating: 1.2 },
  ];

  for (const gp of gpDefs) {
    await prisma.gameParticipation.upsert({
      where: { userId_eventId: { userId: gp.userId, eventId: gp.eventId } },
      update: {},
      create: {
        userId: gp.userId,
        eventId: gp.eventId,
        playedAt: pastStart,
        eventType: 'pickup',
        votesReceived: gp.votesReceived,
        gameRating: gp.gameRating,
        participantCount: 3,
      },
    });
    track('GameParticipation');
  }

  console.log('✅ GameParticipations');

  // ── PlayerVotes ──────────────────────────────────────────────────────────

  const voteDefs = [
    { eventId: EVT_PAST_ID, voterId: p1.id, votedForId: p2.id },
    { eventId: EVT_PAST_ID, voterId: p2.id, votedForId: p3.id },
  ];

  for (const v of voteDefs) {
    await prisma.playerVote.upsert({
      where: { eventId_voterId_votedForId: { eventId: v.eventId, voterId: v.voterId, votedForId: v.votedForId } },
      update: {},
      create: v,
    });
    track('PlayerVote');
  }

  console.log('✅ PlayerVotes');

  // ── Salutes ──────────────────────────────────────────────────────────────

  const saluteDefs = [
    { eventId: EVT_PAST_ID, fromUserId: p1.id, toUserId: p2.id },
    { eventId: EVT_PAST_ID, fromUserId: p3.id, toUserId: p1.id },
  ];

  for (const s of saluteDefs) {
    await prisma.salute.upsert({
      where: { eventId_fromUserId_toUserId: { eventId: s.eventId, fromUserId: s.fromUserId, toUserId: s.toUserId } },
      update: {},
      create: s,
    });
    track('Salute');
  }

  console.log('✅ Salutes');

  // ── Rosters (Teams) ──────────────────────────────────────────────────────

  const ROSTER1_ID = '00000000-0000-4000-a000-000000000200';
  const ROSTER2_ID = '00000000-0000-4000-a000-000000000201';

  const roster1 = await prisma.team.upsert({
    where: { id: ROSTER1_ID },
    update: {},
    create: {
      id: ROSTER1_ID,
      name: 'Hardwood Heroes',
      description: 'Intermediate basketball roster based in Portland.',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      maxMembers: 10,
      balance: 120.0,
    },
  });
  track('Team');

  const roster2 = await prisma.team.upsert({
    where: { id: ROSTER2_ID },
    update: {},
    create: {
      id: ROSTER2_ID,
      name: 'Net Force',
      description: 'Beginner tennis roster looking for new players.',
      sportType: 'tennis',
      skillLevel: 'beginner',
      maxMembers: 8,
      balance: 0,
    },
  });
  track('Team');

  // Roster members — upsert via unique [userId, teamId]
  const memberDefs = [
    { userId: p1.id, teamId: roster1.id, role: 'captain' },
    { userId: p2.id, teamId: roster1.id, role: 'member' },
    { userId: p3.id, teamId: roster1.id, role: 'member' },
    { userId: p4.id, teamId: roster2.id, role: 'member' },
    { userId: p5.id, teamId: roster2.id, role: 'member' },
  ];

  for (const m of memberDefs) {
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: m.userId, teamId: m.teamId } },
      update: {},
      create: m,
    });
    track('TeamMember');
  }

  console.log('✅ Rosters & Players');

  // ── League ───────────────────────────────────────────────────────────────

  const LEAGUE_ID = '00000000-0000-4000-a000-000000000300';

  const league = await prisma.league.upsert({
    where: { id: LEAGUE_ID },
    update: {},
    create: {
      id: LEAGUE_ID,
      name: 'Portland City Basketball League',
      description: 'City-wide basketball league for intermediate rosters.',
      sportType: 'basketball',
      skillLevel: 'intermediate',
      leagueType: 'team',
      isActive: true,
      leagueFormat: 'season_with_playoffs',
      playoffTeamCount: 2,
      trackStandings: true,
      organizerId: commissioner.id,
    },
  });
  track('League');

  // ── Season ───────────────────────────────────────────────────────────────

  const SEASON_ID = '00000000-0000-4000-a000-000000000310';
  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsOut = new Date(); threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);

  const season = await prisma.season.upsert({
    where: { id: SEASON_ID },
    update: {},
    create: {
      id: SEASON_ID,
      leagueId: league.id,
      name: 'Spring 2025',
      startDate: threeMonthsAgo,
      endDate: threeMonthsOut,
      isActive: true,
    },
  });
  track('Season');

  console.log('✅ League & Season');

  // ── LeagueMemberships ────────────────────────────────────────────────────

  const lmDefs = [
    { leagueId: league.id, teamId: roster1.id, memberType: 'roster' as const, memberId: roster1.id, status: 'active', seasonId: season.id },
    { leagueId: league.id, teamId: roster2.id, memberType: 'roster' as const, memberId: roster2.id, status: 'active', seasonId: season.id },
  ];

  for (const lm of lmDefs) {
    await prisma.leagueMembership.upsert({
      where: {
        leagueId_memberType_memberId_seasonId: {
          leagueId: lm.leagueId,
          memberType: lm.memberType,
          memberId: lm.memberId,
          seasonId: lm.seasonId,
        },
      },
      update: {},
      create: lm,
    });
    track('LeagueMembership');
  }

  console.log('✅ LeagueMemberships');

  // ── Matches ──────────────────────────────────────────────────────────────

  const MATCH1_ID = '00000000-0000-4000-a000-000000000400';
  const MATCH2_ID = '00000000-0000-4000-a000-000000000401';
  const MATCH3_ID = '00000000-0000-4000-a000-000000000402';

  // Completed match 1
  await prisma.match.upsert({
    where: { id: MATCH1_ID },
    update: {},
    create: {
      id: MATCH1_ID,
      leagueId: league.id,
      seasonId: season.id,
      homeTeamId: roster1.id,
      awayTeamId: roster2.id,
      scheduledAt: daysFromNow(-14),
      playedAt: daysFromNow(-14),
      status: 'completed',
      homeScore: 78,
      awayScore: 65,
      outcome: 'home_win',
    },
  });
  track('Match');

  // Completed match 2
  await prisma.match.upsert({
    where: { id: MATCH2_ID },
    update: {},
    create: {
      id: MATCH2_ID,
      leagueId: league.id,
      seasonId: season.id,
      homeTeamId: roster2.id,
      awayTeamId: roster1.id,
      scheduledAt: daysFromNow(-7),
      playedAt: daysFromNow(-7),
      status: 'completed',
      homeScore: 70,
      awayScore: 72,
      outcome: 'away_win',
    },
  });
  track('Match');

  // Upcoming match
  await prisma.match.upsert({
    where: { id: MATCH3_ID },
    update: {},
    create: {
      id: MATCH3_ID,
      leagueId: league.id,
      seasonId: season.id,
      homeTeamId: roster1.id,
      awayTeamId: roster2.id,
      scheduledAt: daysFromNow(14),
      status: 'scheduled',
    },
  });
  track('Match');

  console.log('✅ Matches');

  // ── Reviews ──────────────────────────────────────────────────────────────

  const REVIEW1_ID = '00000000-0000-4000-a000-000000000500';
  const REVIEW2_ID = '00000000-0000-4000-a000-000000000501';

  await prisma.review.upsert({
    where: { id: REVIEW1_ID },
    update: {},
    create: {
      id: REVIEW1_ID,
      userId: p1.id,
      facilityId: facility.id,
      rating: 5,
      comment: 'Great courts and well-maintained facility. Will definitely come back.',
    },
  });
  track('Review');

  await prisma.review.upsert({
    where: { id: REVIEW2_ID },
    update: {},
    create: {
      id: REVIEW2_ID,
      userId: p2.id,
      facilityId: facility.id,
      rating: 4,
      comment: 'Solid venue. Parking could be better but the courts are top-notch.',
    },
  });
  track('Review');

  console.log('✅ Reviews');

  // ── FacilityRatings ──────────────────────────────────────────────────────

  await prisma.facilityRating.upsert({
    where: {
      userId_facilityId_eventId: { userId: p1.id, facilityId: facility.id, eventId: EVT_PAST_ID },
    },
    update: {},
    create: {
      userId: p1.id,
      facilityId: facility.id,
      eventId: EVT_PAST_ID,
      rating: 4,
    },
  });
  track('FacilityRating');

  console.log('✅ FacilityRatings');

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('\n📊 Seed summary:');
  for (const [model, count] of Object.entries(counts).sort()) {
    console.log(`   ${model}: ${count}`);
  }
  console.log('\n🎉 Preview database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
