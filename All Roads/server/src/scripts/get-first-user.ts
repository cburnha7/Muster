import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  
  if (user) {
    console.log('First user ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
  } else {
    console.log('No users found');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
