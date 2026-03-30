import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

async function main() {
  console.log('Seeding test users with roles...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // Date of birth for a 14-year-old
  const childDob = new Date();
  childDob.setFullYear(childDob.getFullYear() - 14);

  // --- 1. Create Users ---

  const sarah = await prisma.user.upsert({
    where: { email: 'captain@muster.app' },
    update: {
      username: 'sarah_chen',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      displayName: 'Sarah Chen',
    },
    create: {
      email: 'captain@muster.app',
      username: 'sarah_chen',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      displayName: 'Sarah Chen',
      dateOfBirth: new Date('1992-03-15'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${sarah.firstName} ${sarah.lastName} (${sarah.email})`);

  const jake = await prisma.user.upsert({
    where: { email: 'member@muster.app' },
    update: {
      username: 'jake_torres',
      password: hashedPassword,
      firstName: 'Jake',
      lastName: 'Torres',
      displayName: 'Jake Torres',
    },
    create: {
      email: 'member@muster.app',
      username: 'jake_torres',
      password: hashedPassword,
      firstName: 'Jake',
      lastName: 'Torres',
      displayName: 'Jake Torres',
      dateOfBirth: new Date('1994-07-22'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${jake.firstName} ${jake.lastName} (${jake.email})`);

  const maria = await prisma.user.upsert({
    where: { email: 'commissioner@muster.app' },
    update: {
      username: 'maria_rod',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Rodriguez',
      displayName: 'Maria Rodriguez',
    },
    create: {
      email: 'commissioner@muster.app',
      username: 'maria_rod',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Rodriguez',
      displayName: 'Maria Rodriguez',
      dateOfBirth: new Date('1988-11-05'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${maria.firstName} ${maria.lastName} (${maria.email})`);

  const david = await prisma.user.upsert({
    where: { email: 'owner@muster.app' },
    update: {
      username: 'david_park',
      password: hashedPassword,
      firstName: 'David',
      lastName: 'Park',
      displayName: 'David Park',
    },
    create: {
      email: 'owner@muster.app',
      username: 'david_park',
      password: hashedPassword,
      firstName: 'David',
      lastName: 'Park',
      displayName: 'David Park',
      dateOfBirth: new Date('1985-06-10'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${david.firstName} ${david.lastName} (${david.email})`);

  const lisa = await prisma.user.upsert({
    where: { email: 'parent@muster.app' },
    update: {
      username: 'lisa_j',
      password: hashedPassword,
      firstName: 'Lisa',
      lastName: 'Johnson',
      displayName: 'Lisa Johnson',
    },
    create: {
      email: 'parent@muster.app',
      username: 'lisa_j',
      password: hashedPassword,
      firstName: 'Lisa',
      lastName: 'Johnson',
      displayName: 'Lisa Johnson',
      dateOfBirth: new Date('1980-09-20'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${lisa.firstName} ${lisa.lastName} (${lisa.email})`);

  const max = await prisma.user.upsert({
    where: { email: 'kid@muster.app' },
    update: {
      username: 'max_j',
      password: hashedPassword,
      firstName: 'Max',
      lastName: 'Johnson',
      displayName: 'Max Johnson',
      isDependent: true,
      guardianId: lisa.id,
      dateOfBirth: childDob,
    },
    create: {
      email: 'kid@muster.app',
      username: 'max_j',
      password: hashedPassword,
      firstName: 'Max',
      lastName: 'Johnson',
      displayName: 'Max Johnson',
      dateOfBirth: childDob,
      membershipTier: 'standard',
      role: 'member',
      isDependent: true,
      guardianId: lisa.id,
    },
  });
  console.log(`User: ${max.firstName} ${max.lastName} (${max.email}) [dependent of ${lisa.firstName}]`);

  const chris = await prisma.user.upsert({
    where: { email: 'renter@muster.app' },
    update: {
      username: 'chris_b',
      password: hashedPassword,
      firstName: 'Chris',
      lastName: 'Brown',
      displayName: 'Chris Brown',
    },
    create: {
      email: 'renter@muster.app',
      username: 'chris_b',
      password: hashedPassword,
      firstName: 'Chris',
      lastName: 'Brown',
      displayName: 'Chris Brown',
      dateOfBirth: new Date('1991-02-14'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${chris.firstName} ${chris.lastName} (${chris.email})`);

  const alex = await prisma.user.upsert({
    where: { email: 'player@muster.app' },
    update: {
      username: 'alex_kim',
      password: hashedPassword,
      firstName: 'Alex',
      lastName: 'Kim',
      displayName: 'Alex Kim',
    },
    create: {
      email: 'player@muster.app',
      username: 'alex_kim',
      password: hashedPassword,
      firstName: 'Alex',
      lastName: 'Kim',
      displayName: 'Alex Kim',
      dateOfBirth: new Date('1996-12-01'),
      membershipTier: 'standard',
      role: 'member',
    },
  });
  console.log(`User: ${alex.firstName} ${alex.lastName} (${alex.email})`);

  // --- 2. Create Team "Test Squad" (soccer) ---

  console.log('\nSetting up roles...\n');

  // Find or create the team by name (no unique on name, so use findFirst + create/update)
  let team = await prisma.team.findFirst({ where: { name: 'Test Squad' } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Test Squad',
        description: 'Test team for development',
        sportType: 'soccer',
        sportTypes: ['soccer'],
        skillLevel: 'intermediate',
        maxMembers: 20,
      },
    });
    console.log(`Created team: ${team.name}`);
  } else {
    console.log(`Team already exists: ${team.name}`);
  }

  // Sarah = captain
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: sarah.id, teamId: team.id } },
    update: { role: 'captain', status: 'active' },
    create: { userId: sarah.id, teamId: team.id, role: 'captain', status: 'active' },
  });
  console.log(`  Sarah Chen -> captain of ${team.name}`);

  // Jake = member
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: jake.id, teamId: team.id } },
    update: { role: 'member', status: 'active' },
    create: { userId: jake.id, teamId: team.id, role: 'member', status: 'active' },
  });
  console.log(`  Jake Torres -> member of ${team.name}`);

  // Alex = member
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: alex.id, teamId: team.id } },
    update: { role: 'member', status: 'active' },
    create: { userId: alex.id, teamId: team.id, role: 'member', status: 'active' },
  });
  console.log(`  Alex Kim -> member of ${team.name}`);

  // --- 3. Create League "Test League" (basketball), Maria as organizer ---

  let league = await prisma.league.findFirst({ where: { name: 'Test League', organizerId: maria.id } });
  if (!league) {
    league = await prisma.league.create({
      data: {
        name: 'Test League',
        description: 'Test league for development',
        sportType: 'basketball',
        skillLevel: 'intermediate',
        organizerId: maria.id,
        leagueType: 'team',
        visibility: 'public',
      },
    });
    console.log(`Created league: ${league.name} (organizer: Maria Rodriguez)`);
  } else {
    console.log(`League already exists: ${league.name}`);
  }

  // --- 4. Create Facility "Test Courts" (tennis/basketball), David as owner ---

  let facility = await prisma.facility.findFirst({ where: { name: 'Test Courts', ownerId: david.id } });
  if (!facility) {
    facility = await prisma.facility.create({
      data: {
        name: 'Test Courts',
        description: 'Test facility for development with tennis and basketball courts',
        sportTypes: ['tennis', 'basketball'],
        pricePerHour: 25.0,
        ownerId: david.id,
        street: '123 Test Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA',
        latitude: 37.7749,
        longitude: -122.4194,
        isActive: true,
      },
    });
    console.log(`Created facility: ${facility.name} (owner: David Park)`);
  } else {
    console.log(`Facility already exists: ${facility.name}`);
  }

  // --- Summary ---

  console.log('\n========================================');
  console.log('  Test Users Seeded Successfully');
  console.log('========================================');
  console.log('  All passwords: password123');
  console.log('----------------------------------------');
  console.log('  captain@muster.app      / sarah_chen   -> Team Captain');
  console.log('  member@muster.app       / jake_torres  -> Team Member');
  console.log('  commissioner@muster.app / maria_rod    -> League Commissioner');
  console.log('  owner@muster.app        / david_park   -> Facility Owner');
  console.log('  parent@muster.app       / lisa_j       -> Guardian (Parent)');
  console.log('  kid@muster.app          / max_j        -> Dependent (Child, age 14)');
  console.log('  renter@muster.app       / chris_b      -> Renter');
  console.log('  player@muster.app       / alex_kim     -> Basic Player');
  console.log('----------------------------------------');
  console.log('  Team:     "Test Squad" (soccer)');
  console.log('  League:   "Test League" (basketball)');
  console.log('  Facility: "Test Courts" (tennis/basketball)');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
