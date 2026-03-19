/**
 * One-time cleanup script to remove duplicate LeagueMembership rows
 * caused by NULL seasonId in the unique constraint.
 *
 * Run with: npx ts-node src/scripts/cleanup-duplicate-memberships.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Scanning for duplicate league memberships...\n');

  // Find all league memberships grouped by leagueId + memberType + memberId
  const allMemberships = await prisma.leagueMembership.findMany({
    where: { memberType: 'roster' },
    orderBy: [{ leagueId: 'asc' }, { memberId: 'asc' }, { status: 'asc' }, { createdAt: 'asc' }],
    include: {
      team: { select: { name: true } },
      league: { select: { name: true } },
    },
  });

  // Group by leagueId + memberId
  const groups = new Map<string, typeof allMemberships>();
  for (const m of allMemberships) {
    const key = `${m.leagueId}:${m.memberId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const toDelete: string[] = [];

  for (const [key, memberships] of groups) {
    if (memberships.length <= 1) continue;

    const leagueName = memberships[0].league?.name || key.split(':')[0];
    const rosterName = memberships[0].team?.name || key.split(':')[1];

    console.log(`Duplicates for roster "${rosterName}" in league "${leagueName}":`);
    for (const m of memberships) {
      console.log(`  - id=${m.id} status=${m.status} seasonId=${m.seasonId} created=${m.createdAt.toISOString()}`);
    }

    // Keep the active one if it exists, otherwise keep the oldest
    const active = memberships.find((m) => m.status === 'active');
    const keep = active || memberships[0];
    const duplicates = memberships.filter((m) => m.id !== keep.id);

    console.log(`  → Keeping: ${keep.id} (${keep.status})`);
    console.log(`  → Deleting: ${duplicates.map((d) => `${d.id} (${d.status})`).join(', ')}\n`);

    toDelete.push(...duplicates.map((d) => d.id));
  }

  if (toDelete.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`\nDeleting ${toDelete.length} duplicate membership(s)...`);
  const result = await prisma.leagueMembership.deleteMany({
    where: { id: { in: toDelete } },
  });
  console.log(`Deleted ${result.count} row(s).`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
