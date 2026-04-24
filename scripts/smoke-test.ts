/**
 * Smoke Test — exercises every critical user flow against the live API.
 *
 * Creates real data: users, facilities, courts, events, bookings,
 * rosters, leagues, conversations, messages. Verifies each step
 * returns the expected status code and shape.
 *
 * Usage:
 *   npx ts-node scripts/smoke-test.ts
 *   npx ts-node scripts/smoke-test.ts https://muster-production.up.railway.app/api
 *
 * All test entities are prefixed with "[SMOKE]" so they can be
 * identified and swept later.
 */

const API = process.argv[2] || 'https://muster-production.up.railway.app/api';
const NOW = Date.now();
const PREFIX = '[SMOKE]';

let passed = 0;
let failed = 0;
const failures: string[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    const msg = detail ? `${label} — ${detail}` : label;
    console.log(`  ❌ ${msg}`);
    failed++;
    failures.push(msg);
  }
}

// ── State ────────────────────────────────────────────────────────────────────

let userAToken = '';
let userAId = '';
let userBToken = '';
let userBId = '';
let facilityId = '';
let courtId = ''; // eslint-disable-line @typescript-eslint/no-unused-vars
let eventId = '';
let teamId = '';
let leagueId = ''; // eslint-disable-line @typescript-eslint/no-unused-vars
let conversationId = '';

// ── 1. Register two users ────────────────────────────────────────────────────

async function testRegistration() {
  console.log('\n── 1. Registration ──');

  const userA = await api('POST', '/auth/register', {
    firstName: `${PREFIX} Alice`,
    lastName: 'Tester',
    email: `smoke-alice-${NOW}@test.muster.dev`,
    username: `smoke_alice_${NOW}`,
    password: 'TestPass123!',
    agreedToTerms: true,
  });
  assert(
    'Register User A',
    userA.status === 201 || userA.status === 200,
    `status=${userA.status} ${userA.data?.error || ''}`
  );
  if (userA.data?.accessToken) {
    userAToken = userA.data.accessToken;
    userAId = userA.data.user?.id;
  }

  const userB = await api('POST', '/auth/register', {
    firstName: `${PREFIX} Bob`,
    lastName: 'Tester',
    email: `smoke-bob-${NOW}@test.muster.dev`,
    username: `smoke_bob_${NOW}`,
    password: 'TestPass123!',
    agreedToTerms: true,
  });
  assert(
    'Register User B',
    userB.status === 201 || userB.status === 200,
    `status=${userB.status} ${userB.data?.error || ''}`
  );
  if (userB.data?.accessToken) {
    userBToken = userB.data.accessToken;
    userBId = userB.data.user?.id;
  }
}

// ── 2. Login ─────────────────────────────────────────────────────────────────

async function testLogin() {
  console.log('\n── 2. Login ──');

  const res = await api('POST', '/auth/login', {
    emailOrUsername: `smoke_alice_${NOW}`,
    password: 'TestPass123!',
  });
  assert(
    'Login User A',
    res.status === 200 && !!res.data?.accessToken,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.accessToken) userAToken = res.data.accessToken;
}

// ── 3. Profile ───────────────────────────────────────────────────────────────

async function testProfile() {
  console.log('\n── 3. Profile ──');

  const get = await api('GET', '/users/profile', undefined, userAToken);
  assert(
    'Get profile',
    get.status === 200 && !!get.data?.id,
    `status=${get.status}`
  );

  const update = await api(
    'PUT',
    '/users/profile',
    { locationCity: 'Austin', locationState: 'TX' },
    userAToken
  );
  assert(
    'Update profile',
    update.status === 200,
    `status=${update.status} ${update.data?.error || ''}`
  );
}

// ── 4. Create Facility ───────────────────────────────────────────────────────

async function testCreateFacility() {
  console.log('\n── 4. Create Facility ──');

  const res = await api(
    'POST',
    '/facilities',
    {
      name: `${PREFIX} Smoke Test Field`,
      description: 'Automated smoke test facility',
      street: '123 Test St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      latitude: 30.2672,
      longitude: -97.7431,
      sportTypes: ['soccer', 'flag_football'],
    },
    userAToken
  );
  assert(
    'Create facility',
    res.status === 201 && !!res.data?.id,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) facilityId = res.data.id;
}

// ── 5. Add Court ─────────────────────────────────────────────────────────────

async function testAddCourt() {
  console.log('\n── 5. Add Court ──');
  if (!facilityId) {
    assert('Add court', false, 'No facility ID — skipped');
    return;
  }

  const res = await api(
    'POST',
    `/facilities/${facilityId}/courts`,
    {
      name: `${PREFIX} Main Pitch`,
      sportType: 'soccer',
      capacity: 22,
      isIndoor: false,
      pricePerHour: 50,
    },
    userAToken
  );
  assert(
    'Add court',
    res.status === 201 && !!res.data?.id,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) courtId = res.data.id;
}

// ── 6. Create Event ──────────────────────────────────────────────────────────

async function testCreateEvent() {
  console.log('\n── 6. Create Event ──');

  const start = new Date();
  start.setDate(start.getDate() + 7); // 1 week from now
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  const res = await api(
    'POST',
    '/events',
    {
      title: `${PREFIX} Smoke Test Game`,
      description: 'Automated smoke test event',
      sportType: 'soccer',
      eventType: 'pickup',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      maxParticipants: 20,
      skillLevel: 'all_levels',
      organizerId: userAId,
      facilityId: facilityId || undefined,
      locationName: facilityId ? undefined : 'Zilker Park',
      locationAddress: facilityId ? undefined : 'Austin, TX',
      locationLat: 30.2672,
      locationLng: -97.7431,
    },
    userAToken
  );
  assert(
    'Create event',
    res.status === 201 && !!res.data?.id,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) eventId = res.data.id;
}

// ── 7. Book Event (User B joins) ─────────────────────────────────────────────

async function testBookEvent() {
  console.log('\n── 7. Book Event ──');
  if (!eventId || !userBId) {
    assert('Book event', false, 'No event or user B — skipped');
    return;
  }

  const res = await api(
    'POST',
    `/events/${eventId}/book`,
    { userId: userBId },
    userBToken
  );
  assert(
    'Book event (User B joins)',
    res.status === 201 || res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 8. Get Event Details ─────────────────────────────────────────────────────

async function testGetEvent() {
  console.log('\n── 8. Get Event Details ──');
  if (!eventId) {
    assert('Get event', false, 'No event ID — skipped');
    return;
  }

  const res = await api('GET', `/events/${eventId}`, undefined, userAToken);
  assert(
    'Get event details',
    res.status === 200 && res.data?.id === eventId,
    `status=${res.status}`
  );
  assert(
    'Event has participants',
    (res.data?.currentParticipants ?? 0) >= 1,
    `currentParticipants=${res.data?.currentParticipants}`
  );
}

// ── 9. Create Roster ─────────────────────────────────────────────────────────

async function testCreateTeam() {
  console.log('\n── 9. Create Roster ──');

  const res = await api(
    'POST',
    '/teams',
    {
      name: `${PREFIX} Smoke Roster`,
      description: 'Automated smoke test roster',
      sportType: 'soccer',
      skillLevel: 'intermediate',
      maxMembers: 15,
      isPublic: true,
    },
    userAToken
  );
  assert(
    'Create roster',
    res.status === 201 && !!res.data?.id,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) teamId = res.data.id;
}

// ── 10. User B joins Roster ──────────────────────────────────────────────────

async function testJoinTeam() {
  console.log('\n── 10. Join Roster ──');
  if (!teamId) {
    assert('Join roster', false, 'No team ID — skipped');
    return;
  }

  const res = await api('POST', `/teams/${teamId}/join`, {}, userBToken);
  assert(
    'User B joins roster',
    res.status === 201 || res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 11. Create League ────────────────────────────────────────────────────────

async function testCreateLeague() {
  console.log('\n── 11. Create League ──');

  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);

  const res = await api(
    'POST',
    '/leagues',
    {
      name: `${PREFIX} Smoke League ${NOW}`,
      sportType: 'soccer',
      skillLevel: 'intermediate',
      leagueType: 'team',
      visibility: 'public',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      trackStandings: true,
    },
    userAToken
  );
  assert(
    'Create league',
    res.status === 201 && !!res.data?.id,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) leagueId = res.data.id;
}

// ── 12. Get User Bookings ────────────────────────────────────────────────────

async function testGetBookings() {
  console.log('\n── 12. Get User Bookings ──');

  const res = await api(
    'GET',
    '/users/bookings?status=all&page=1&limit=10',
    undefined,
    userBToken
  );
  assert(
    'Get bookings for User B',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 13. Get User Teams ───────────────────────────────────────────────────────

async function testGetTeams() {
  console.log('\n── 13. Get User Teams ──');

  const res = await api(
    'GET',
    '/users/teams?page=1&limit=10',
    undefined,
    userAToken
  );
  assert(
    'Get teams for User A',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 14. Get User Leagues ─────────────────────────────────────────────────────

async function testGetLeagues() {
  console.log('\n── 14. Get User Leagues ──');

  const res = await api('GET', '/users/leagues', undefined, userAToken);
  assert(
    'Get leagues for User A',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 15. Conversations ────────────────────────────────────────────────────────

async function testConversations() {
  console.log('\n── 15. Conversations ──');

  // Create team chat (User A is captain of the roster)
  if (teamId) {
    const chat = await api(
      'POST',
      `/conversations/team/${teamId}`,
      {},
      userAToken
    );
    assert(
      'Create/get team chat',
      chat.status === 200 && !!chat.data?.id,
      `status=${chat.status} ${chat.data?.error || ''}`
    );
    if (chat.data?.id) conversationId = chat.data.id;
  }

  // List conversations
  const list = await api('GET', '/conversations', undefined, userAToken);
  assert(
    'List conversations',
    list.status === 200 && Array.isArray(list.data),
    `status=${list.status}`
  );

  // Send a message
  if (conversationId) {
    const msg = await api(
      'POST',
      `/conversations/${conversationId}/messages`,
      { content: `${PREFIX} Automated smoke test message` },
      userAToken
    );
    assert(
      'Send message',
      msg.status === 201 && !!msg.data?.id,
      `status=${msg.status} ${msg.data?.error || ''}`
    );

    // Get messages
    const msgs = await api(
      'GET',
      `/conversations/${conversationId}/messages`,
      undefined,
      userAToken
    );
    assert(
      'Get messages',
      msgs.status === 200 && msgs.data?.messages?.length > 0,
      `status=${msgs.status}`
    );
  }
}

// ── 16. Dashboard ────────────────────────────────────────────────────────────

async function testDashboard() {
  console.log('\n── 16. Dashboard ──');

  const res = await api('GET', '/users/dashboard', undefined, userAToken);
  assert(
    'Get dashboard',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 17. Invitations ──────────────────────────────────────────────────────────

async function testInvitations() {
  console.log('\n── 17. Invitations ──');

  const res = await api('GET', '/users/invitations', undefined, userAToken);
  assert(
    'Get invitations',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 18. Debrief ──────────────────────────────────────────────────────────────

async function testDebrief() {
  console.log('\n── 18. Debrief ──');

  const res = await api('GET', '/debrief', undefined, userAToken);
  assert(
    'Get debrief events',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 19. Search ───────────────────────────────────────────────────────────────

async function testSearch() {
  console.log('\n── 19. Search ──');

  const res = await api(
    'GET',
    '/search/teams?query=smoke&page=1&limit=5',
    undefined,
    userAToken
  );
  assert(
    'Search teams',
    res.status === 200,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 20. Health Check ─────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n── 20. Health Check ──');

  const res = await fetch(`${API.replace('/api', '')}/health`);
  const data: any = await res.json();
  assert(
    'Health check',
    res.status === 200 && data.status === 'ok',
    `status=${res.status} ${data.status}`
  );
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔥 Muster Smoke Test — ${API}`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);

  try {
    await testHealth();
    await testRegistration();
    await testLogin();
    await testProfile();
    await testCreateFacility();
    await testAddCourt();
    await testCreateEvent();
    await testBookEvent();
    await testGetEvent();
    await testCreateTeam();
    await testJoinTeam();
    await testCreateLeague();
    await testGetBookings();
    await testGetTeams();
    await testGetLeagues();
    await testConversations();
    await testDashboard();
    await testInvitations();
    await testDebrief();
    await testSearch();
  } catch (err) {
    console.error('\n💥 Unhandled error:', err);
    failed++;
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    failures.forEach(f => console.log(`    • ${f}`));
  }
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
