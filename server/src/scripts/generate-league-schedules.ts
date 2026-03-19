/**
 * Background job: Auto-generate league schedules
 * 
 * Finds leagues where:
 * - registrationCloseDate has passed
 * - scheduleGenerated is false
 * - Schedule config is complete (preferredGameDays + seasonGameCount)
 * - At least 2 active roster memberships
 * 
 * Run via cron: node -r ts-node/register src/scripts/generate-league-schedules.ts
 */

import { PrismaClient } from '@prisma/client';
import { ScheduleGeneratorService } from '../services/ScheduleGeneratorService';

const prisma = new PrismaClient();

async function generateLeagueSchedules() {
  console.log(`[${new Date().toISOString()}] Starting league schedule auto-generation...`);

  const now = new Date();

  // Find eligible leagues
  const leagues = await prisma.league.findMany({
    where: {
      scheduleGenerated: false,
      registrationCloseDate: { not: null, lt: now },
      seasonGameCount: { not: null },
      preferredGameDays: { isEmpty: false },
      isActive: true,
    },
    include: {
      memberships: {
        where: { status: 'active', memberType: 'roster' },
        select: { id: true }
      }
    }
  });

  const eligible = leagues.filter(l => l.memberships.length >= 2);

  console.log(`Found ${eligible.length} eligible league(s) for schedule generation.`);

  let successCount = 0;
  let failCount = 0;

  for (const league of eligible) {
    try {
      const result = await ScheduleGeneratorService.generateRoundRobin(league.id);
      console.log(`  ✓ League "${league.name}" (${league.id}): ${result.eventsCreated} events created`);
      successCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ League "${league.name}" (${league.id}): ${msg}`);
      failCount++;
    }
  }

  console.log(`\nSchedule generation complete. Success: ${successCount}, Failed: ${failCount}`);
}

generateLeagueSchedules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
