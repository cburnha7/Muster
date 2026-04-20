/**
 * Cancellation policy service.
 *
 * Handles snapshotting facility cancellation policy onto booking records
 * at confirmation time, and (future) cancellation enforcement logic.
 */

/**
 * Snapshot the facility's current cancellation policy fields onto a booking
 * record. This is a write-once operation — once snapshotted, the booking's
 * policy fields are immutable so that future facility policy changes never
 * affect existing confirmed bookings.
 *
 * @param bookingId  - The booking to snapshot onto
 * @param facilityId - The facility whose policy to copy
 * @param prismaClient - Prisma client instance (injected for testability)
 * @throws Error if the facility is not found
 * @throws Error if the facility has an incomplete policy
 * @throws Error if the booking is not found
 * @throws Error if the booking already has a snapshotted policy
 */
export async function snapshotPolicy(
  bookingId: string,
  facilityId: string,
  prismaClient: any
) {
  // 1. Fetch the facility's current cancellation policy fields
  const facility = await prismaClient.facility.findUnique({
    where: { id: facilityId },
    select: {
      noticeWindowHours: true,
      teamPenaltyPct: true,
      penaltyDestination: true,
      policyVersion: true,
    },
  });

  if (!facility) {
    throw new Error(`Facility ${facilityId} not found`);
  }

  // 2. Validate the facility has a complete policy set
  if (
    facility.noticeWindowHours == null ||
    facility.teamPenaltyPct == null ||
    !facility.penaltyDestination ||
    !facility.policyVersion
  ) {
    throw new Error(
      `Facility ${facilityId} does not have a complete cancellation policy`
    );
  }

  // 3. Fetch the booking to check for existing snapshot
  const booking = await prismaClient.booking.findUnique({
    where: { id: bookingId },
    select: {
      policyNoticeWindowHours: true,
      policyTeamPenaltyPct: true,
      policyPenaltyDestination: true,
      policyVersion: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // 4. Enforce write-once — reject if any policy field is already set
  if (
    booking.policyNoticeWindowHours != null ||
    booking.policyTeamPenaltyPct != null ||
    booking.policyPenaltyDestination != null ||
    booking.policyVersion != null
  ) {
    throw new Error(
      `Booking ${bookingId} already has a snapshotted cancellation policy`
    );
  }

  // 5. Write the snapshot onto the booking record
  await prismaClient.booking.update({
    where: { id: bookingId },
    data: {
      policyNoticeWindowHours: facility.noticeWindowHours,
      policyTeamPenaltyPct: facility.teamPenaltyPct,
      policyPenaltyDestination: facility.penaltyDestination,
      policyVersion: facility.policyVersion,
    },
  });
}
