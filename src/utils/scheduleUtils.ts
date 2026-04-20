/**
 * Schedule date calculation utilities.
 *
 * Pure functions — no side effects, no state dependencies.
 * Used by the Schedule Preview screen to compute suggested dates per round.
 */

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Calculate the suggested dates for a specific round.
 *
 * @param startDate  - The league start date selected by the user
 * @param gameDays   - Selected game days (e.g. ['Mon', 'Wed'])
 * @param frequency  - 'weekly' | 'biweekly' | 'monthly'
 * @param roundIndex - Zero-based round index (0 = Round 1)
 * @returns Array of Date objects representing the suggested dates for this round
 */
export function calculateRoundDates(
  startDate: Date,
  gameDays: string[],
  frequency: string,
  roundIndex: number
): Date[] {
  if (!startDate || gameDays.length === 0 || !frequency) return [];

  const dayIndices = gameDays
    .map(d => DAY_NAME_TO_INDEX[d])
    .filter((d): d is number => d !== undefined)
    .sort((a, b) => a - b);

  if (dayIndices.length === 0) return [];

  if (frequency === 'monthly') {
    return calculateMonthlyRoundDates(startDate, dayIndices, roundIndex);
  }

  // Weekly or bi-weekly
  const weekMultiplier = frequency === 'biweekly' ? 2 : 1;

  // Find the first occurrence of each game day on or after startDate
  const round1Dates = findFirstOccurrences(startDate, dayIndices);

  // Advance by (roundIndex * weekMultiplier) weeks
  const offsetDays = roundIndex * weekMultiplier * 7;

  return round1Dates.map(d => {
    const result = new Date(d);
    result.setDate(result.getDate() + offsetDays);
    return result;
  });
}

/**
 * Find the first occurrence of each game day on or after the start date.
 */
function findFirstOccurrences(startDate: Date, dayIndices: number[]): Date[] {
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const startDow = start.getDay();

  return dayIndices.map(dayIdx => {
    const diff = (dayIdx - startDow + 7) % 7;
    const d = new Date(start);
    d.setDate(d.getDate() + diff);
    return d;
  });
}

/**
 * Monthly frequency: same positional day each month.
 * E.g. if Round 1 falls on the 3rd Monday, every subsequent round
 * uses the 3rd Monday of the next month.
 */
function calculateMonthlyRoundDates(
  startDate: Date,
  dayIndices: number[],
  roundIndex: number
): Date[] {
  const round1Dates = findFirstOccurrences(startDate, dayIndices);

  return round1Dates.map(baseDate => {
    // Determine the positional identity: which occurrence of this weekday in the month?
    const dow = baseDate.getDay();
    const dayOfMonth = baseDate.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7); // 1st, 2nd, 3rd, 4th, 5th

    // Target month = base month + roundIndex
    const targetMonth = baseDate.getMonth() + roundIndex;
    const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
    const targetMon = targetMonth % 12;

    return getNthWeekdayOfMonth(targetYear, targetMon, dow, weekOfMonth);
  });
}

/**
 * Get the Nth occurrence of a weekday in a given month.
 * If the Nth occurrence doesn't exist, returns the last occurrence.
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  n: number
): Date {
  // Find the first occurrence of this weekday in the month
  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const diff = (dayOfWeek - firstDow + 7) % 7;
  const firstOccurrence = 1 + diff;

  // The Nth occurrence
  const targetDay = firstOccurrence + (n - 1) * 7;

  // Check if it's still in the same month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (targetDay <= daysInMonth) {
    return new Date(year, month, targetDay);
  }

  // Fall back to the last occurrence of this weekday in the month
  let lastDay = firstOccurrence;
  while (lastDay + 7 <= daysInMonth) {
    lastDay += 7;
  }
  return new Date(year, month, lastDay);
}

/**
 * Calculate all round dates for all rounds at once.
 * Useful for pre-computing the full schedule.
 */
export function calculateAllRoundDates(
  startDate: Date,
  gameDays: string[],
  frequency: string,
  totalRounds: number
): Date[][] {
  const result: Date[][] = [];
  for (let i = 0; i < totalRounds; i++) {
    result.push(calculateRoundDates(startDate, gameDays, frequency, i));
  }
  return result;
}

/**
 * Format a date as abbreviated: "Mon Apr 20"
 */
export function formatDateAbbrev(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as full human-readable: "Monday, April 20, 2026"
 */
export function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
