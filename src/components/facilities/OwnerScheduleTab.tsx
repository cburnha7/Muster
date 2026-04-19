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
import { Calendar, DateData } from 'react-native-calendars';
import { colors, fonts, Spacing } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';
import { VisualDaySchedule, ScheduleBlock } from './VisualDaySchedule';
import {
  calendarTheme,
  formatDateForCalendar,
} from '../../utils/calendarUtils';

interface Court {
  id: string;
  name: string;
  sportType: string;
  isIndoor: boolean;
}

interface OwnerScheduleTabProps {
  facilityId: string;
}

export function OwnerScheduleTab({ facilityId }: OwnerScheduleTabProps) {
  const [selectedDate, setSelectedDate] = useState(
    formatDateForCalendar(new Date())
  );
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Load courts on mount
  useEffect(() => {
    loadCourts();
  }, [facilityId]);

  // Load schedule when court or date changes
  useEffect(() => {
    if (selectedCourt) {
      loadSchedule(selectedCourt.id, selectedDate);
    }
  }, [selectedCourt, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      if (selectedCourt) {
        loadSchedule(selectedCourt.id, selectedDate);
      }
    }, [selectedCourt, selectedDate])
  );

  const loadCourts = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/facilities/${facilityId}/courts`
      );
      if (!res.ok) throw new Error('Failed');
      const data: Court[] = await res.json();
      setCourts(data);
      if (data.length > 0) {
        setSelectedCourt(data[0]!);
      }
    } catch {
      setCourts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (courtId: string, date: string) => {
    try {
      setLoadingSchedule(true);
      const res = await fetch(
        `${API_BASE_URL}/facilities/${facilityId}/courts/${courtId}/schedule?date=${date}`
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const markedDates: any = {
    [selectedDate]: {
      selected: true,
      selectedColor: colors.cobalt,
    },
  };

  if (loading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color={colors.cobalt} />
      </View>
    );
  }

  if (courts.length === 0) {
    return (
      <View style={st.centered}>
        <Ionicons name="calendar-outline" size={48} color={colors.inkFaint} />
        <Text style={st.emptyText}>No courts set up yet</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Court selector chips */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Court</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.courtRow}
        >
          {courts.map(court => {
            const isSelected = selectedCourt?.id === court.id;
            return (
              <TouchableOpacity
                key={court.id}
                style={[st.courtChip, isSelected && st.courtChipSelected]}
                onPress={() => setSelectedCourt(court)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={court.isIndoor ? 'home' : 'sunny'}
                  size={16}
                  color={isSelected ? colors.white : colors.cobalt}
                />
                <Text
                  style={[
                    st.courtChipText,
                    isSelected && st.courtChipTextSelected,
                  ]}
                >
                  {court.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Calendar */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Select Date</Text>
        <Calendar
          current={selectedDate}
          onDayPress={handleDateSelect}
          markedDates={markedDates}
          theme={calendarTheme}
          style={st.calendar}
        />
      </View>

      {/* Day schedule */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          {selectedCourt ? ` · ${selectedCourt.name}` : ''}
        </Text>

        {loadingSchedule ? (
          <View style={st.centered}>
            <ActivityIndicator size="small" color={colors.cobalt} />
            <Text style={st.loadingText}>Loading schedule...</Text>
          </View>
        ) : schedule.length > 0 ? (
          <VisualDaySchedule
            schedule={schedule}
            proposedStart={null}
            proposedEnd={null}
            slotIncrementMinutes={60}
          />
        ) : (
          <View style={st.centered}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color={colors.inkFaint}
            />
            <Text style={st.emptyText}>No schedule for this date</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  courtRow: {
    flexDirection: 'row',
    gap: 8,
  },
  courtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  courtChipSelected: {
    borderColor: colors.cobalt,
    backgroundColor: colors.cobalt,
  },
  courtChipText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
  },
  courtChipTextSelected: {
    color: colors.white,
  },
  calendar: {
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
