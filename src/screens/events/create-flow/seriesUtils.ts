import { DayOfWeek, DAY_INDEX_MAP } from './types';

const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Compute the series of occurrence dates given a start date, frequency,
 * selected days of week, and number of events.
 */
export function computeSeriesDates(
  startDate: Date,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  days: DayOfWeek[],
  count: number,
): string[] {
  if (days.length === 0 || count <= 0) return [];

  const dayIndices = new Set(days.map((d) => DAY_TO_INDEX[d]));
  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  if (frequency === 'monthly') {
    // Monthly: same day-of-month each time
    for (let i = 0; i < count; i++) {
      const d = new Date(cursor);
      d.setMonth(cursor.getMonth() + i);
      dates.push(formatDate(d));
    }
    return dates;
  }

  // Weekly / biweekly: iterate day by day within each week window
  const weekStep = frequency === 'biweekly' ? 2 : 1;
  let weekStart = new Date(cursor);
  // Align weekStart to the Monday of the start date's week
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  while (dates.length < count) {
    for (let d = 0; d < 7 && dates.length < count; d++) {
      const candidate = new Date(weekStart);
      candidate.setDate(weekStart.getDate() + d);
      if (candidate >= cursor && dayIndices.has(candidate.getDay())) {
        dates.push(formatDate(candidate));
      }
    }
    weekStart.setDate(weekStart.getDate() + 7 * weekStep);
  }

  return dates;
}

/**
 * Check if a date falls on one of the selected days of week.
 */
export function dateMatchesDays(date: Date, days: DayOfWeek[]): boolean {
  const dayName = DAY_INDEX_MAP[date.getDay()];
  return dayName ? days.includes(dayName) : false;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
