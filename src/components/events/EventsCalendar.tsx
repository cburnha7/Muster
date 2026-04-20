import React from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { calendarTheme } from '../../utils/calendarUtils';
import { MultiDotMarking } from '../../types/eventsCalendar';
import { useTheme } from '../../theme';

/**
 * EventsCalendar — thin wrapper around react-native-calendars Calendar
 * configured with the shared calendarTheme and multi-dot marking type.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

interface EventsCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  markedDates: Record<string, MultiDotMarking>;
  onDateSelect: (dateString: string) => void;
  onMonthChange: (month: { year: number; month: number }) => void;
}

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  selectedDate,
  markedDates,
  onDateSelect,
  onMonthChange,
}) => {
  const { colors } = useTheme();
  // Merge selected date highlighting into markedDates
  const mergedMarkedDates: Record<string, MultiDotMarking> = {
    ...markedDates,
    [selectedDate]: {
      dots: markedDates[selectedDate]?.dots ?? [],
      selected: true,
      selectedColor: colors.cobalt,
    },
  };

  const handleDayPress = (day: DateData) => {
    onDateSelect(day.dateString);
  };

  const handleMonthChange = (month: DateData) => {
    onMonthChange({ year: month.year, month: month.month });
  };

  return (
    <Calendar
      current={selectedDate}
      markedDates={mergedMarkedDates}
      markingType="multi-dot"
      onDayPress={handleDayPress}
      onMonthChange={handleMonthChange}
      theme={calendarTheme}
    />
  );
};

export default EventsCalendar;
