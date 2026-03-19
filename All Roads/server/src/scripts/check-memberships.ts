import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const memberships = await prisma.leagueMembership.findMany({
    where: { memberType: 'roster' },
    include: {
      team: { select: { name: true } },
      league: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${memberships.length} roster membership(s):\n`);
  for (const m of memberships) {
    console.log(`  [${m.status.toUpperCase().padEnd(9)}] "${m.team?.name || m.memberId}" in "${m.league?.name}" (id: ${m.id.substring(0,8)}..., seasonId: ${m.seasonId || 'NULL'})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
