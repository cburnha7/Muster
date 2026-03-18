/**
 * One-time script to promote a user to admin with facility tier.
 * 
 * Usage:
 *   npx ts-node src/scripts/promote-admin.ts
 * 
 * Or on Railway:
 *   railway run npx ts-node src/scripts/promote-admin.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = 'cburnham';

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email: { contains: username, mode: 'insensitive' } },
      ],
    },
  });

  if (!user) {
    console.error(`❌ User "${username}" not found`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'admin',
      membershipTier: 'facility',
    },
  });

  console.log(`✅ User "${updated.username || updated.email}" promoted:`);
  console.log(`   Role: ${updated.role}`);
  console.log(`   Tier: ${updated.membershipTier}`);

  // Create TESTER promo code
  const existing = await prisma.promoCode.findUnique({ where: { code: 'TESTER' } });
  if (existing) {
    console.log(`ℹ️  Promo code "TESTER" already exists`);
  } else {
    await prisma.promoCode.create({
      data: {
        code: 'TESTER',
        trialDurationDays: 30,
        createdByAdminId: user.id,
      },
    });
    console.log(`✅ Promo code "TESTER" created (30-day trial)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
