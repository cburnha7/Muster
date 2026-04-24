/**
 * Smoke Test — exercises every critical user flow against the live API.
 *
 * Creates real data: users, facilities, courts, events, bookings,
 * rosters, leagues, conversations, messages, photo uploads.
 * Verifies each step returns the expected status code and shape.
 * Reports response times for every call.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 *   npx tsx scripts/smoke-test.ts https://muster-production.up.railway.app/api
 *
 * All test entities are prefixed with "[SMOKE]" so they can be
 * identified and swept later.
 */

const API = process.argv[2] || 'https://muster-production.up.railway.app/api';
const NOW = Date.now();
const PREFIX = '[SMOKE]';

let passed = 0;
let failed = 0;
let slowCount = 0;
const SLOW_THRESHOLD = 1000; // ms — flag anything over 1s
const failures: string[] = [];
const timings: Array<{ label: string; ms: number }> = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; ms: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const t0 = Date.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const ms = Date.now() - t0;

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, ms };
}

function assert(
  label: string,
  condition: boolean,
  ms: number,
  detail?: string
): void {
  const slow = ms > SLOW_THRESHOLD;
  const timeStr = slow ? `⚠️ ${ms}ms` : `${ms}ms`;
  if (slow) slowCount++;
  timings.push({ label, ms });

  if (condition) {
    console.log(`  ✅ ${label} (${timeStr})`);
    passed++;
  } else {
    const msg = detail ? `${label} — ${detail}` : label;
    console.log(`  ❌ ${msg} (${timeStr})`);
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
let courtId = '';
let eventId = '';
let teamId = '';
let leagueId = '';
let conversationId = '';

// ── 1. Health Check ──────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n── 1. Health Check ──');
  const t0 = Date.now();
  const res = await fetch(`${API.replace('/api', '')}/health`);
  const ms = Date.now() - t0;
  const data: any = await res.json();
  assert('Health check', res.status === 200 && data.status === 'ok', ms);
}

// ── 2. Register two users ────────────────────────────────────────────────────

async function testRegistration() {
  console.log('\n── 2. Registration ──');

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
    userA.ms,
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
    userB.ms,
    `status=${userB.status} ${userB.data?.error || ''}`
  );
  if (userB.data?.accessToken) {
    userBToken = userB.data.accessToken;
    userBId = userB.data.user?.id;
  }
}

// ── 3. Login ─────────────────────────────────────────────────────────────────

async function testLogin() {
  console.log('\n── 3. Login ──');
  const res = await api('POST', '/auth/login', {
    emailOrUsername: `smoke_alice_${NOW}`,
    password: 'TestPass123!',
  });
  assert(
    'Login User A',
    res.status === 200 && !!res.data?.accessToken,
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.accessToken) userAToken = res.data.accessToken;
}

// ── 4. Profile ───────────────────────────────────────────────────────────────

async function testProfile() {
  console.log('\n── 4. Profile ──');

  const get = await api('GET', '/users/profile', undefined, userAToken);
  assert('Get profile', get.status === 200 && !!get.data?.id, get.ms);

  const update = await api(
    'PUT',
    '/users/profile',
    { locationCity: 'Austin', locationState: 'TX' },
    userAToken
  );
  assert(
    'Update profile',
    update.status === 200,
    update.ms,
    `status=${update.status} ${update.data?.error || ''}`
  );
}

// ── 5. Upload Profile Photo ──────────────────────────────────────────────────

async function testProfilePhoto() {
  console.log('\n── 5. Upload Profile Photo ──');

  // Get a presigned URL for profile photo upload
  const presign = await api(
    'POST',
    '/uploads/presign',
    {
      context: 'profiles',
      fileName: `smoke-test-${NOW}.jpg`,
      contentType: 'image/jpeg',
    },
    userAToken
  );
  assert(
    'Get presigned upload URL',
    presign.status === 200 && !!presign.data?.uploadUrl,
    presign.ms,
    `status=${presign.status} ${presign.data?.error || ''}`
  );

  if (presign.data?.publicUrl) {
    // Set the profile image URL (skip actual S3 upload — just verify the URL flow)
    const setPhoto = await api(
      'POST',
      '/users/profile/image',
      { imageUrl: presign.data.publicUrl },
      userAToken
    );
    assert(
      'Set profile image URL',
      setPhoto.status === 200,
      setPhoto.ms,
      `status=${setPhoto.status} ${setPhoto.data?.error || ''}`
    );
  }
}

// ── 6. Create Facility ───────────────────────────────────────────────────────

async function testCreateFacility() {
  console.log('\n── 6. Create Facility ──');
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) facilityId = res.data.id;
}

// ── 7. Upload Facility Cover Photo ───────────────────────────────────────────

async function testFacilityCoverPhoto() {
  console.log('\n── 7. Upload Facility Cover Photo ──');
  if (!facilityId) {
    assert('Facility cover photo', false, 0, 'No facility — skipped');
    return;
  }

  const presign = await api(
    'POST',
    '/uploads/presign',
    {
      context: 'grounds',
      fileName: `smoke-cover-${NOW}.jpg`,
      contentType: 'image/jpeg',
    },
    userAToken
  );
  assert(
    'Get facility cover presign URL',
    presign.status === 200 && !!presign.data?.uploadUrl,
    presign.ms,
    `status=${presign.status} ${presign.data?.error || ''}`
  );

  if (presign.data?.publicUrl) {
    const update = await api(
      'PUT',
      `/facilities/${facilityId}`,
      { coverImageUrl: presign.data.publicUrl },
      userAToken
    );
    assert(
      'Set facility cover image',
      update.status === 200,
      update.ms,
      `status=${update.status} ${update.data?.error || ''}`
    );
  }
}

// ── 8. Add Court ─────────────────────────────────────────────────────────────

async function testAddCourt() {
  console.log('\n── 8. Add Court ──');
  if (!facilityId) {
    assert('Add court', false, 0, 'No facility — skipped');
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) courtId = res.data.id;
}

// ── 9. Create Event ──────────────────────────────────────────────────────────

async function testCreateEvent() {
  console.log('\n── 9. Create Event ──');
  const start = new Date();
  start.setDate(start.getDate() + 7);
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) eventId = res.data.id;
}

// ── 10. Book Event ───────────────────────────────────────────────────────────

async function testBookEvent() {
  console.log('\n── 10. Book Event ──');
  if (!eventId || !userBId) {
    assert('Book event', false, 0, 'No event or user B — skipped');
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 11. Get Event Details ────────────────────────────────────────────────────

async function testGetEvent() {
  console.log('\n── 11. Get Event Details ──');
  if (!eventId) {
    assert('Get event', false, 0, 'No event — skipped');
    return;
  }

  const res = await api('GET', `/events/${eventId}`, undefined, userAToken);
  assert(
    'Get event details',
    res.status === 200 && res.data?.id === eventId,
    res.ms
  );
  assert(
    'Event has participants',
    (res.data?.currentParticipants ?? 0) >= 1,
    0,
    `currentParticipants=${res.data?.currentParticipants}`
  );
}

// ── 12. Create Roster ────────────────────────────────────────────────────────

async function testCreateTeam() {
  console.log('\n── 12. Create Roster ──');
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) teamId = res.data.id;
}

// ── 13. Join Roster ──────────────────────────────────────────────────────────

async function testJoinTeam() {
  console.log('\n── 13. Join Roster ──');
  if (!teamId) {
    assert('Join roster', false, 0, 'No team — skipped');
    return;
  }

  const res = await api('POST', `/teams/${teamId}/join`, {}, userBToken);
  assert(
    'User B joins roster',
    res.status === 201 || res.status === 200,
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
}

// ── 14. Create League ────────────────────────────────────────────────────────

async function testCreateLeague() {
  console.log('\n── 14. Create League ──');
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
    res.ms,
    `status=${res.status} ${res.data?.error || ''}`
  );
  if (res.data?.id) leagueId = res.data.id;
}

// ── 15. Get User Data ────────────────────────────────────────────────────────

async function testGetUserData() {
  console.log('\n── 15. Get User Data ──');

  const bookings = await api(
    'GET',
    '/users/bookings?status=all&page=1&limit=10',
    undefined,
    userBToken
  );
  assert('Get bookings', bookings.status === 200, bookings.ms);

  const teams = await api(
    'GET',
    '/users/teams?page=1&limit=10',
    undefined,
    userAToken
  );
  assert('Get teams', teams.status === 200, teams.ms);

  const leagues = await api('GET', '/users/leagues', undefined, userAToken);
  assert('Get leagues', leagues.status === 200, leagues.ms);

  const events = await api(
    'GET',
    '/users/events?page=1&limit=10',
    undefined,
    userAToken
  );
  assert('Get events', events.status === 200, events.ms);
}

// ── 16. Conversations ────────────────────────────────────────────────────────

async function testConversations() {
  console.log('\n── 16. Conversations ──');

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
      chat.ms,
      `status=${chat.status} ${chat.data?.error || ''}`
    );
    if (chat.data?.id) conversationId = chat.data.id;
  }

  const list = await api('GET', '/conversations', undefined, userAToken);
  assert(
    'List conversations',
    list.status === 200 && Array.isArray(list.data),
    list.ms
  );

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
      msg.ms,
      `status=${msg.status} ${msg.data?.error || ''}`
    );

    const msgs = await api(
      'GET',
      `/conversations/${conversationId}/messages`,
      undefined,
      userAToken
    );
    assert(
      'Get messages',
      msgs.status === 200 && msgs.data?.messages?.length > 0,
      msgs.ms
    );
  }
}

// ── 17. Dashboard + Inbox ────────────────────────────────────────────────────

async function testDashboardAndInbox() {
  console.log('\n── 17. Dashboard + Inbox ──');

  const dash = await api('GET', '/users/dashboard', undefined, userAToken);
  assert('Get dashboard', dash.status === 200, dash.ms);

  const inv = await api('GET', '/users/invitations', undefined, userAToken);
  assert('Get invitations', inv.status === 200, inv.ms);

  const debrief = await api('GET', '/debrief', undefined, userAToken);
  assert('Get debrief events', debrief.status === 200, debrief.ms);

  const search = await api(
    'GET',
    '/search/teams?query=smoke&page=1&limit=5',
    undefined,
    userAToken
  );
  assert('Search teams', search.status === 200, search.ms);
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔥 Muster Smoke Test — ${API}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   Slow threshold: ${SLOW_THRESHOLD}ms\n`);

  try {
    await testHealth();
    await testRegistration();
    await testLogin();
    await testProfile();
    await testProfilePhoto();
    await testCreateFacility();
    await testFacilityCoverPhoto();
    await testAddCourt();
    await testCreateEvent();
    await testBookEvent();
    await testGetEvent();
    await testCreateTeam();
    await testJoinTeam();
    await testCreateLeague();
    await testGetUserData();
    await testConversations();
    await testDashboardAndInbox();
  } catch (err) {
    console.error('\n💥 Unhandled error:', err);
    failed++;
  }

  // Performance summary
  const sorted = [...timings].sort((a, b) => b.ms - a.ms);
  const avg = Math.round(
    timings.reduce((s, t) => s + t.ms, 0) / timings.length
  );

  console.log(`\n${'═'.repeat(56)}`);
  console.log(
    `  ✅ Passed: ${passed}   ❌ Failed: ${failed}   ⚠️ Slow: ${slowCount}`
  );
  console.log(`  📊 Avg response: ${avg}ms`);
  console.log(`\n  🐢 Slowest endpoints:`);
  sorted.slice(0, 5).forEach(t => {
    const flag = t.ms > SLOW_THRESHOLD ? ' ⚠️' : '';
    console.log(`     ${t.ms.toString().padStart(5)}ms  ${t.label}${flag}`);
  });
  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    failures.forEach(f => console.log(`    • ${f}`));
  }
  console.log(`${'═'.repeat(56)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
