import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

interface ScheduleCalendarProps {
  /** The year/month to display */
  year: number;
  month: number; // 0-indexed
  /** Dates to highlight (gray bubble) */
  highlightedDates: Date[];
  /** Navigate to previous month */
  onPrevMonth: () => void;
  /** Navigate to next month */
  onNextMonth: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ScheduleCalendar({
  year,
  month,
  highlightedDates,
  onPrevMonth,
  onNextMonth,
}: ScheduleCalendarProps) {
  const { colors } = useTheme();

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Build a set of highlighted day-of-month for fast lookup
  const highlightedSet = useMemo(() => {
    const set = new Set<number>();
    for (const d of highlightedDates) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [highlightedDates, year, month]);

  // Build the calendar grid
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[][] = [];
    let week: (number | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) week.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Trailing blanks
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      grid.push(week);
    }

    return grid;
  }, [year, month]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Month header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onPrevMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.ink }]}>
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={onNextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.dayHeaderRow}>
        {DAY_LABELS.map(d => (
          <View key={d} style={styles.dayCell}>
            <Text style={[styles.dayHeaderText, { color: colors.inkMuted }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={styles.dayCell} />;
            }
            const highlighted = highlightedSet.has(day);
            const todayMatch = isToday(day);
            return (
              <View key={di} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayCircle,
                    highlighted && { backgroundColor: colors.border },
                    todayMatch &&
                      !highlighted && {
                        borderWidth: 1.5,
                        borderColor: colors.cobalt,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.ink },
                      highlighted && { fontFamily: fonts.bodyBold },
                      todayMatch && !highlighted && { color: colors.cobalt },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: fonts.heading,
    fontSize: 17,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
