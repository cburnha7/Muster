import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const testUsers = [
  {
    email: 'player@muster.app',
    username: 'player',
    password: '1234',
    firstName: 'Player',
    lastName: 'Account',
    displayName: 'Player',
    tierTag: 'player',
    dateOfBirth: new Date('1995-01-01'),
  },
  {
    email: 'host@muster.app',
    username: 'host',
    password: '1234',
    firstName: 'Host',
    lastName: 'Account',
    displayName: 'Host',
    tierTag: 'host',
    dateOfBirth: new Date('1995-01-01'),
  },
  {
    email: 'owner@muster.app',
    username: 'owner',
    password: '1234',
    firstName: 'Owner',
    lastName: 'Account',
    displayName: 'Owner',
    tierTag: 'owner',
    dateOfBirth: new Date('1995-01-01'),
  },
  {
    email: 'playerplus@muster.app',
    username: 'playerplus',
    password: '1234',
    firstName: 'Player+',
    lastName: 'Account',
    displayName: 'Player+',
    tierTag: 'player+',
    dateOfBirth: new Date('1995-01-01'),
  },
];

async function main() {
  console.log('🌱 Seeding test users...\n');

  for (const userData of testUsers) {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username },
        ],
      },
    });

    if (existing) {
      console.log(`⏭️  User ${userData.username} already exists, skipping...`);
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        tierTag: userData.tierTag,
        dateOfBirth: userData.dateOfBirth,
        membershipTier: 'standard',
        role: 'member',
      },
    });

    console.log(`✅ Created user: ${user.username} (${user.email})`);
  }

  console.log('\n✨ Test users seeded successfully!');
  console.log('\nTest Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Username: player    | Password: 1234');
  console.log('Username: host      | Password: 1234');
  console.log('Username: owner     | Password: 1234');
  console.log('Username: playerplus| Password: 1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
