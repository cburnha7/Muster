/**
 * Events Calendar Utility Functions
 *
 * Pure utility functions for the calendar-driven events view:
 * color assignment, event ownership resolution, marked dates
 * computation, and month date range calculation.
 *
 * Requirements: 1.5, 1.6, 4.1, 4.3, 4.4, 5.2, 7.1, 7.2, 7.3
 */

import {
  PersonFilter,
  EventOwnership,
  MultiDotMarking,
  PERSON_COLORS,
} from '../types/eventsCalendar';
import { formatDateForCalendar } from './calendarUtils';

// Hex values used directly to avoid circular dependency with theme
const NEUTRAL_DOT_COLOR = '#6B7A96'; // colors.inkFaint
const SELECTED_DATE_COLOR = '#2040E0'; // colors.cobalt

/**
 * Assign a distinct color to each family member.
 * Guardian always gets PERSON_COLORS[0] (grass).
 * Dependents are assigned sequentially with wrap.
 *
 * Requirements: 4.1
 */
export function assignPersonColors(
  guardianId: string,
  dependents: Array<{ id: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  map.set(guardianId, PERSON_COLORS[0]);
  dependents.forEach((dep, index) => {
    map.set(dep.id, PERSON_COLORS[(index + 1) % PERSON_COLORS.length]);
  });
  return map;
}

/**
 * Determine which family members are associated with an event
 * by checking organizerId and participants[].userId.
 *
 * Requirements: 7.1, 7.2
 */
export function resolveEventOwnership(
  event: {
    organizerId?: string;
    participants?: Array<{ userId: string }>;
  },
  familyUserIds: string[]
): EventOwnership {
  const ownerUserIds: string[] = [];
  for (const userId of familyUserIds) {
    const isOrganizer = event.organizerId === userId;
    const isParticipant =
      event.participants?.some((p) => p.userId === userId) ?? false;
    if (isOrganizer || isParticipant) {
      ownerUserIds.push(userId);
    }
  }
  return { ownerUserIds };
}


/**
 * Build the multi-dot marked dates object for react-native-calendars.
 *
 * For each event:
 * - Resolve ownership against the family
 * - In 'wholeCrew' mode: add dots for all owning family members
 * - In 'individual' mode: add dot only if that person owns the event
 * - Public events (no family ownership) get a neutral inkFaint dot
 * - The selected date gets selected: true with grass color
 *
 * Requirements: 1.5, 1.6, 4.3, 4.4
 */
export function buildMarkedDates(
  events: Array<{
    startTime: string | Date;
    organizerId?: string;
    participants?: Array<{ userId: string }>;
  }>,
  activeFilter: PersonFilter,
  familyUserIds: string[],
  personColors: Map<string, string>,
  selectedDate: string
): Record<string, MultiDotMarking> {
  // dateKey → Set of dot keys (userId or '__public__')
  const dateMap: Record<string, Set<string>> = {};

  for (const event of events) {
    const dateKey = formatDateForCalendar(new Date(event.startTime));
    const ownership = resolveEventOwnership(event, familyUserIds);

    if (ownership.ownerUserIds.length === 0) {
      // Public event — no family ownership
      if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
      dateMap[dateKey].add('__public__');
    } else if (activeFilter.type === 'wholeCrew') {
      if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
      ownership.ownerUserIds.forEach((id) => dateMap[dateKey].add(id));
    } else {
      // Individual filter
      if (ownership.ownerUserIds.includes(activeFilter.userId)) {
        if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
        dateMap[dateKey].add(activeFilter.userId);
      }
      // Still show public-style dot if event has no family ownership
      // (already handled above)
    }
  }

  const marked: Record<string, MultiDotMarking> = {};
  for (const [date, userIds] of Object.entries(dateMap)) {
    const dots = Array.from(userIds).map((uid) => ({
      key: uid,
      color:
        uid === '__public__'
          ? NEUTRAL_DOT_COLOR
          : personColors.get(uid) || NEUTRAL_DOT_COLOR,
    }));
    marked[date] = {
      dots,
      ...(date === selectedDate
        ? { selected: true, selectedColor: SELECTED_DATE_COLOR }
        : {}),
    };
  }

  // Ensure the selected date always has an entry (even with no events)
  if (!marked[selectedDate]) {
    marked[selectedDate] = {
      dots: [],
      selected: true,
      selectedColor: SELECTED_DATE_COLOR,
    };
  } else if (!marked[selectedDate].selected) {
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = SELECTED_DATE_COLOR;
  }

  return marked;
}

/**
 * Get the start and end dates for a given month.
 * Month is 1-indexed (1 = January, 12 = December).
 *
 * startDate: first day of month at 00:00:00
 * endDate: last day of month at 23:59:59
 *
 * Requirements: 5.2
 */
export function getMonthDateRange(
  year: number,
  month: number
): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
}