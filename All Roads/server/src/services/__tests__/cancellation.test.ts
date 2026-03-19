/**
 * Unit tests for cancellation policy service.
 *
 * Tests snapshotPolicy — the write-once operation that copies a facility's
 * current cancellation policy fields onto a booking record at confirmation.
 */

import { snapshotPolicy } from '../cancellation';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function buildMockPrisma() {
  return {
    facility: { findUnique: jest.fn() },
    booking: { findUnique: jest.fn(), update: jest.fn() },
  };
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// snapshotPolicy
// ---------------------------------------------------------------------------

describe('snapshotPolicy', () => {
  const completeFacility = {
    noticeWindowHours: 24,
    teamPenaltyPct: 50,
    penaltyDestination: 'facility',
    policyVersion: '2024-01-15T00:00:00.000Z',
  };

  const blankBooking = {
    policyNoticeWindowHours: null,
    policyTeamPenaltyPct: null,
    policyPenaltyDestination: null,
    policyVersion: null,
  };

  it('copies facility policy fields onto the booking record', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue(completeFacility);
    prisma.booking.findUnique.mockResolvedValue(blankBooking);
    prisma.booking.update.mockResolvedValue({});

    await snapshotPolicy('booking-1', 'facility-1', prisma);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        policyNoticeWindowHours: 24,
        policyTeamPenaltyPct: 50,
        policyPenaltyDestination: 'facility',
        policyVersion: '2024-01-15T00:00:00.000Z',
      },
    });
  });

  it('throws when the facility is not found', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue(null);

    await expect(
      snapshotPolicy('booking-1', 'missing-facility', prisma),
    ).rejects.toThrow('Facility missing-facility not found');
  });

  it('throws when the facility has no noticeWindowHours', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({
      ...completeFacility,
      noticeWindowHours: null,
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('does not have a complete cancellation policy');
  });

  it('throws when the facility has no teamPenaltyPct', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({
      ...completeFacility,
      teamPenaltyPct: null,
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('does not have a complete cancellation policy');
  });

  it('throws when the facility has no penaltyDestination', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({
      ...completeFacility,
      penaltyDestination: null,
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('does not have a complete cancellation policy');
  });

  it('throws when the facility has no policyVersion', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({
      ...completeFacility,
      policyVersion: null,
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('does not have a complete cancellation policy');
  });

  it('throws when the booking is not found', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue(completeFacility);
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      snapshotPolicy('missing-booking', 'facility-1', prisma),
    ).rejects.toThrow('Booking missing-booking not found');
  });

  it('throws when the booking already has a snapshotted policy', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue(completeFacility);
    prisma.booking.findUnique.mockResolvedValue({
      policyNoticeWindowHours: 24,
      policyTeamPenaltyPct: 50,
      policyPenaltyDestination: 'facility',
      policyVersion: '2024-01-15T00:00:00.000Z',
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('already has a snapshotted cancellation policy');
  });

  it('rejects write when only one policy field is already set', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue(completeFacility);
    prisma.booking.findUnique.mockResolvedValue({
      ...blankBooking,
      policyVersion: '2024-01-01T00:00:00.000Z',
    });

    await expect(
      snapshotPolicy('booking-1', 'facility-1', prisma),
    ).rejects.toThrow('already has a snapshotted cancellation policy');
  });

  it('accepts teamPenaltyPct of 0 as a valid complete policy', async () => {
    const prisma = buildMockPrisma();
    prisma.facility.findUnique.mockResolvedValue({
      ...completeFacility,
      teamPenaltyPct: 0,
    });
    prisma.booking.findUnique.mockResolvedValue(blankBooking);
    prisma.booking.update.mockResolvedValue({});

    await snapshotPolicy('booking-1', 'facility-1', prisma);

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({ policyTeamPenaltyPct: 0 }),
    });
  });

  it('snapshots all three penalty destination variants correctly', async () => {
    const destinations = ['facility', 'opposing_team', 'split'];

    for (const dest of destinations) {
      const prisma = buildMockPrisma();
      prisma.facility.findUnique.mockResolvedValue({
        ...completeFacility,
        penaltyDestination: dest,
      });
      prisma.booking.findUnique.mockResolvedValue(blankBooking);
      prisma.booking.update.mockResolvedValue({});

      await snapshotPolicy('booking-1', 'facility-1', prisma);

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ policyPenaltyDestination: dest }),
        }),
      );
    }
  });
});
