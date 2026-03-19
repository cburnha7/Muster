/**
 * Backfill script: Add a captain to rosters that have no captain member.
 * 
 * Usage:
 *   npx ts-node src/scripts/backfill-roster-captains.ts <userId>
 * 
 * This will find all rosters with no captain and add the given user as captain.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx ts-node src/scripts/backfill-roster-captains.ts <userId>');
    console.error('\nTo find your user ID, check the users table or your profile.');
    process.exit(1);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }

  console.log(`\nBackfilling captains for user: ${user.firstName} ${user.lastName} (${user.email})\n`);

  // Find all rosters that have no captain
  const teams = await prisma.team.findMany({
    include: {
      members: true,
    },
  });

  let updated = 0;

  for (const team of teams) {
    const hasCaptain = team.members.some(m => m.role === 'captain' && m.status === 'active');

    if (!hasCaptain) {
      // Check if user is already a member
      const existingMember = team.members.find(m => m.userId === userId);

      if (existingMember) {
        // Promote to captain
        await prisma.teamMember.update({
          where: { id: existingMember.id },
          data: { role: 'captain', status: 'active' },
        });
        console.log(`  ✅ Promoted to captain on: ${team.name}`);
      } else {
        // Add as captain
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId,
            role: 'captain',
            status: 'active',
            joinedAt: new Date(),
          },
        });
        console.log(`  ✅ Added as captain on: ${team.name}`);
      }
      updated++;
    } else {
      console.log(`  ⏭️  Already has captain: ${team.name}`);
    }
  }

  console.log(`\nDone. Updated ${updated} roster(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
