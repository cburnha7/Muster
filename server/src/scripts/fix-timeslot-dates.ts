import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing time slot dates...\n');

  // Get all time slots
  const allSlots = await prisma.facilityTimeSlot.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`📊 Found ${allSlots.length} time slots to fix\n`);

  let fixed = 0;
  const uniqueDates = new Set<string>();

  for (const slot of allSlots) {
    // Normalize the date to midnight UTC
    const normalizedDate = new Date(slot.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Only update if different
    if (slot.date.getTime() !== normalizedDate.getTime()) {
      await prisma.facilityTimeSlot.update({
        where: { id: slot.id },
        data: { date: normalizedDate },
      });
      fixed++;
    }

    uniqueDates.add(normalizedDate.toISOString().split('T')[0]);
  }

  console.log(`✅ Fixed ${fixed} time slots`);
  console.log(`📅 Date range: ${Array.from(uniqueDates).sort()[0]} to ${Array.from(uniqueDates).sort().pop()}`);
  console.log(`\n✨ All dates normalized to midnight UTC!`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
