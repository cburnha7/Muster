import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';

interface ScheduleRental {
  id: string;
  status: string;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: { id: string; name: string; sportType: string };
  };
  user: { id: string; firstName: string; lastName: string };
}

interface OwnerScheduleTabProps {
  facilityId: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM – 9 PM

export function OwnerScheduleTab({ facilityId }: OwnerScheduleTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rentals, setRentals] = useState<ScheduleRental[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(
    async (date: Date) => {
      try {
        setLoading(true);
        const dateStr = date.toISOString().split('T')[0];
        const url = `${API_BASE_URL}/rentals/facilities/${facilityId}/rentals?status=confirmed&startDate=${dateStr}&endDate=${dateStr}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data: ScheduleRental[] = await res.json();
        data.sort((a, b) =>
          a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)
        );
        setRentals(data);
      } catch {
        setRentals([]);
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);
  useFocusEffect(
    useCallback(() => {
      loadDay(selectedDate);
    }, [selectedDate, loadDay])
  );

  // Build calendar weeks for the current month
  const buildCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Pad start
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++)
      days.push(new Date(year, month, d));
    return days;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();
  const calendarDays = buildCalendarDays();

  const changeMonth = (delta: number) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + delta, 1);
    setSelectedDate(d);
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h!, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const monthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Month nav */}
      <View style={st.monthNav}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={st.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={st.weekRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={st.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={st.calendarGrid}>
        {calendarDays.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={st.dayCell} />;
          const selected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <TouchableOpacity
              key={i}
              style={[st.dayCell, selected && st.dayCellSelected]}
              onPress={() => setSelectedDate(new Date(day))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  st.dayText,
                  isToday && st.dayTextToday,
                  selected && st.dayTextSelected,
                ]}
              >
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day schedule */}
      <Text style={st.sectionLabel}>
        {selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.cobalt} />
      ) : rentals.length === 0 ? (
        <View style={st.emptyState}>
          <Ionicons name="calendar-outline" size={32} color={colors.inkFaint} />
          <Text style={st.emptyText}>No reservations this day</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {rentals.map(r => (
            <View key={r.id} style={st.block}>
              <View style={st.blockTime}>
                <Text style={st.blockTimeText}>
                  {formatTime(r.timeSlot.startTime)}
                </Text>
                <Text style={st.blockTimeSep}>–</Text>
                <Text style={st.blockTimeText}>
                  {formatTime(r.timeSlot.endTime)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.blockName} numberOfLines={1}>
                  {r.user.firstName} {r.user.lastName}
                </Text>
                <Text style={st.blockCourt} numberOfLines={1}>
                  {r.timeSlot.court.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  monthLabel: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkSoft,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.cobalt,
    borderRadius: 20,
  },
  dayText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  dayTextToday: { color: colors.cobalt, fontWeight: '700' },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 8,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  blockTime: { alignItems: 'center', minWidth: 64 },
  blockTimeText: { fontFamily: fonts.ui, fontSize: 12, color: colors.cobalt },
  blockTimeSep: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  blockName: { fontFamily: fonts.label, fontSize: 14, color: colors.ink },
  blockCourt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
});
