/**
 * recurring-bookings.ts — generates occurrence dates for a recurring booking series.
 */

export type RecurringFrequency = 'weekly' | 'monthly';

export interface RecurringPattern {
  frequency: RecurringFrequency;
  startDate: Date;   // First occurrence (already selected by user)
  endDate: Date;     // Repeat-until date (inclusive)
}

/**
 * Generate all occurrence dates for a recurring pattern.
 * The startDate itself is always the first occurrence.
 */
export function generateOccurrences(pattern: RecurringPattern): Date[] {
  const { frequency, startDate, endDate } = pattern;
  const dates: Date[] = [];

  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  while (current <= end) {
    dates.push(new Date(current));

    if (frequency === 'weekly') {
      current.setUTCDate(current.getUTCDate() + 7);
    } else {
      // Monthly: same day-of-month. If the month doesn't have that day, skip to last day.
      const targetDay = startDate.getUTCDate();
      current.setUTCMonth(current.getUTCMonth() + 1);
      // Clamp to last day of month if needed
      const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
      current.setUTCDate(Math.min(targetDay, lastDay));
    }
  }

  return dates;
}
