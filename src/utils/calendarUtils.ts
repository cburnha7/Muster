import { colors } from '../theme';

/**
 * Calendar theme configuration for react-native-calendars
 * Matches Muster brand colors
 */
export const calendarTheme = {
  backgroundColor: '#FFFFFF',
  calendarBackground: '#FFFFFF',
  textSectionTitleColor: colors.ink,
  selectedDayBackgroundColor: colors.pine,
  selectedDayTextColor: '#FFFFFF',
  todayTextColor: colors.gold,
  dayTextColor: colors.ink,
  textDisabledColor: colors.inkFaint,
  dotColor: colors.pine,
  selectedDotColor: '#FFFFFF',
  arrowColor: colors.pine,
  monthTextColor: colors.ink,
  indicatorColor: colors.pine,
  textDayFontFamily: 'System',
  textMonthFontFamily: 'System',
  textDayHeaderFontFamily: 'System',
  textDayFontWeight: '400' as const,
  textMonthFontWeight: '600' as const,
  textDayHeaderFontWeight: '600' as const,
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 14,
};

/**
 * Marking colors for calendar dates
 */
export const calendarMarkingColors = {
  available: colors.pine,      // Green dot for available dates
  blocked: colors.heart,         // Red dot for blocked dates
  rented: colors.navy,            // Blue dot for rented dates
  selected: colors.pine,        // Green circle for selected date
};

/**
 * Format date to YYYY-MM-DD for calendar
 * Uses UTC to avoid timezone shifts when dates come from database
 */
export function formatDateForCalendar(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse calendar date string (YYYY-MM-DD) to Date object
 */
export function parseCalendarDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format time to HH:MM (24-hour format)
 */
export function formatTime24(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format time to 12-hour format with AM/PM
 */
export function formatTime12(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Generate time slots for a day (15-minute increments)
 */
export function generateTimeSlots(
  startHour: number = 6,
  endHour: number = 22,
  incrementMinutes: number = 15
): string[] {
  const slots: string[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += incrementMinutes) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  
  return slots;
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Check if a time slot is in the past
 */
export function isPastTimeSlot(date: Date, time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, minutes, 0, 0);
  return slotDateTime < new Date();
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Get short day name from day of week number
 */
export function getShortDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek];
}

/**
 * Create marked dates object for react-native-calendars
 */
export interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  disabled?: boolean;
  disableTouchEvent?: boolean;
}

export function createMarkedDates(
  availableDates: string[],
  blockedDates: string[],
  rentedDates: string[],
  selectedDate?: string
): { [date: string]: MarkedDate } {
  const marked: { [date: string]: MarkedDate } = {};
  
  // Mark available dates
  availableDates.forEach(date => {
    marked[date] = {
      marked: true,
      dotColor: calendarMarkingColors.available,
    };
  });
  
  // Mark blocked dates
  blockedDates.forEach(date => {
    marked[date] = {
      marked: true,
      dotColor: calendarMarkingColors.blocked,
      disabled: true,
      disableTouchEvent: true,
    };
  });
  
  // Mark rented dates
  rentedDates.forEach(date => {
    marked[date] = {
      marked: true,
      dotColor: calendarMarkingColors.rented,
    };
  });
  
  // Mark selected date
  if (selectedDate) {
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: calendarMarkingColors.selected,
    };
  }
  
  return marked;
}

/**
 * Get minimum date for calendar (today)
 */
export function getMinDate(): string {
  return formatDateForCalendar(new Date());
}

/**
 * Get maximum date for calendar (3 months from now)
 */
export function getMaxDate(monthsAhead: number = 3): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  return formatDateForCalendar(date);
}
