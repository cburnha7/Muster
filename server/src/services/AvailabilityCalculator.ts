import { prisma } from '../lib/prisma';

/**
 * On-the-fly availability calculator.
 *
 * Instead of pre-generating 365 days of time slot rows, this service
 * calculates available slots for a court on a given date by:
 *   1. Reading the court's operating hours (FacilityCourtAvailability)
 *   2. Falling back to facility-level hours (FacilityAvailability)
 *   3. Falling back to default hours (06:00–22:00)
 *   4. Subtracting any existing rentals or blocked slots for that date
 *
 * Slots are only persisted when a rental is confirmed or a slot is blocked.
 */

export interface CalculatedSlot {
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  price: number;
  status: 'available' | 'blocked' | 'rented';
  /** If rented, the rental ID */
  rentalId?: string;
  /** If blocked, the reason */
  blockReason?: string;
  /** If a persisted slot exists, its ID */
  slotId?: string;
}

const DEFAULT_START = '06:00';
const DEFAULT_END = '22:00';

/**
 * Get available time slots for a court on a specific date.
 * Calculates on-the-fly from operating hours minus existing bookings.
 */
export async function getAvailableSlots(
  courtId: string,
  date: string // YYYY-MM-DD
): Promise<CalculatedSlot[]> {
  // 1. Load court + facility
  const court = await prisma.facilityCourt.findUnique({
    where: { id: courtId },
    include: {
      facility: {
        select: { id: true, pricePerHour: true, slotIncrementMinutes: true },
      },
    },
  });
  if (!court) return [];

  const facilityId = court.facilityId;
  const price = court.pricePerHour ?? court.facility.pricePerHour ?? 50;
  const incrementMinutes = court.facility.slotIncrementMinutes ?? 60;

  // 2. Determine operating hours for this day of week
  const dateObj = new Date(date + 'T00:00:00Z');
  const dayOfWeek = dateObj.getUTCDay(); // 0=Sun, 6=Sat

  const operatingWindows = await getOperatingWindows(
    courtId,
    facilityId,
    dayOfWeek,
    date
  );
  if (operatingWindows.length === 0) return [];

  // 3. Generate all possible slots from operating windows
  const allSlots: CalculatedSlot[] = [];
  for (const window of operatingWindows) {
    const slots = generateSlotsForWindow(
      courtId,
      date,
      window.start,
      window.end,
      incrementMinutes,
      price
    );
    allSlots.push(...slots);
  }

  if (allSlots.length === 0) return [];

  // 4. Load existing persisted slots (rented or blocked) for this court+date
  const dateStart = new Date(date + 'T00:00:00Z');
  const dateEnd = new Date(date + 'T23:59:59Z');

  const persistedSlots = await prisma.facilityTimeSlot.findMany({
    where: {
      courtId,
      date: { gte: dateStart, lte: dateEnd },
    },
    include: {
      rental: { select: { id: true, status: true } },
    },
  });

  // Build a map of startTime → persisted slot
  const persistedMap = new Map<string, (typeof persistedSlots)[number]>();
  for (const ps of persistedSlots) {
    persistedMap.set(ps.startTime, ps);
  }

  // 5. Merge: overlay persisted status onto calculated slots
  const result: CalculatedSlot[] = allSlots.map(slot => {
    const persisted = persistedMap.get(slot.startTime);
    if (!persisted) return slot; // No persisted record → available

    if (persisted.status === 'blocked') {
      return {
        ...slot,
        status: 'blocked' as const,
        blockReason: persisted.blockReason ?? undefined,
        slotId: persisted.id,
      };
    }

    if (
      persisted.status === 'rented' &&
      persisted.rental &&
      persisted.rental.status !== 'cancelled'
    ) {
      return {
        ...slot,
        status: 'rented' as const,
        rentalId: persisted.rental.id,
        slotId: persisted.id,
      };
    }

    // Persisted but available (e.g. cancelled rental) → treat as available
    return { ...slot, slotId: persisted.id };
  });

  return result;
}

/**
 * Get available slots for a court across a date range.
 */
export async function getAvailableSlotsForRange(
  courtId: string,
  startDate: string,
  endDate: string
): Promise<CalculatedSlot[]> {
  const slots: CalculatedSlot[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]!;
    const daySlots = await getAvailableSlots(courtId, dateStr);
    slots.push(...daySlots);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return slots;
}

/**
 * Get dates with available slots for a court within a range.
 * Returns just the dates (for calendar display), not full slot details.
 */
export async function getDatesWithAvailability(
  courtId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; availableCount: number }[]> {
  const result: { date: string; availableCount: number }[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]!;
    const daySlots = await getAvailableSlots(courtId, dateStr);
    const available = daySlots.filter(s => s.status === 'available').length;
    if (available > 0) {
      result.push({ date: dateStr, availableCount: available });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getOperatingWindows(
  courtId: string,
  facilityId: string,
  dayOfWeek: number,
  dateStr: string
): Promise<{ start: string; end: string }[]> {
  // 1. Check court-specific availability first
  const courtAvail = await prisma.facilityCourtAvailability.findMany({
    where: {
      courtId,
      OR: [
        { isRecurring: true, dayOfWeek },
        { isRecurring: false, specificDate: new Date(dateStr + 'T00:00:00Z') },
      ],
    },
  });

  // If there's a specific-date block, the court is closed
  const specificBlock = courtAvail.find(a => !a.isRecurring && a.isBlocked);
  if (specificBlock) return [];

  // If there are court-specific recurring rules, use them
  const courtRecurring = courtAvail.filter(a => a.isRecurring && !a.isBlocked);
  if (courtRecurring.length > 0) {
    return courtRecurring.map(a => ({ start: a.startTime, end: a.endTime }));
  }

  // 2. Fall back to facility-level availability
  const facilityAvail = await prisma.facilityAvailability.findMany({
    where: {
      facilityId,
      OR: [
        { isRecurring: true, dayOfWeek },
        { isRecurring: false, specificDate: new Date(dateStr + 'T00:00:00Z') },
      ],
    },
  });

  const facilityBlock = facilityAvail.find(a => !a.isRecurring && a.isBlocked);
  if (facilityBlock) return [];

  const facilityRecurring = facilityAvail.filter(
    a => a.isRecurring && !a.isBlocked
  );
  if (facilityRecurring.length > 0) {
    return facilityRecurring.map(a => ({ start: a.startTime, end: a.endTime }));
  }

  // 3. Default: 06:00–22:00 every day
  return [{ start: DEFAULT_START, end: DEFAULT_END }];
}

function generateSlotsForWindow(
  courtId: string,
  date: string,
  windowStart: string,
  windowEnd: string,
  incrementMinutes: number,
  price: number
): CalculatedSlot[] {
  const slots: CalculatedSlot[] = [];
  const [startH, startM] = windowStart.split(':').map(Number) as [
    number,
    number,
  ];
  const [endH, endM] = windowEnd.split(':').map(Number) as [number, number];

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + incrementMinutes <= endMinutes) {
    const slotStart = minutesToHHMM(currentMinutes);
    const slotEnd = minutesToHHMM(currentMinutes + incrementMinutes);

    slots.push({
      courtId,
      date,
      startTime: slotStart,
      endTime: slotEnd,
      price,
      status: 'available',
    });

    currentMinutes += incrementMinutes;
  }

  return slots;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
