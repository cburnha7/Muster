import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    console.log('\n📋 Users in database:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.firstName} ${user.lastName})`);
      console.log(`  ID: ${user.id}`);
    });
    console.log(`\nTotal: ${users.length} users\n`);
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
