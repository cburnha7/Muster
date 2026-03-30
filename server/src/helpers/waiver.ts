import { prisma } from '../lib/prisma';

export async function hasValidWaiver(userId: string, facilityId: string): Promise<boolean> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { waiverRequired: true, waiverVersion: true },
  });

  if (!facility || !facility.waiverRequired || !facility.waiverVersion) return true;

  const signature = await prisma.waiverSignature.findUnique({
    where: {
      userId_facilityId_waiverVersion: {
        userId,
        facilityId,
        waiverVersion: facility.waiverVersion,
      },
    },
  });

  return !!signature;
}
