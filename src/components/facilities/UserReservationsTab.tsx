import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { fonts, useTheme } from '../../theme';
import { selectUser } from '../../store/slices/authSlice';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';

interface UserRental {
  id: string;
  status: string;
  totalPrice: number;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: {
      id: string;
      name: string;
      sportType: string;
      facility?: { id: string; name: string };
    };
  };
}

interface UserReservationsTabProps {
  facilityId: string;
  facilityName: string;
}

export function UserReservationsTab({
  facilityId,
  facilityName,
}: UserReservationsTabProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const currentUser = useSelector(selectUser);
  const [rentals, setRentals] = useState<UserRental[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRentals = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/rentals/my-rentals?userId=${currentUser.id}&status=confirmed&upcoming=true`;
      const token = await TokenStorage.getAccessToken();
      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Failed');
      const data: UserRental[] = await res.json();

      // Filter to this facility only and truly upcoming
      const now = new Date();
      const filtered = data.filter(r => {
        const courtFacilityId =
          r.timeSlot?.court?.facility?.id ??
          (r.timeSlot?.court as any)?.facilityId;
        if (courtFacilityId !== facilityId) return false;

        const parts = r.timeSlot.date.split('T')[0]!.split('-');
        const slotDate = new Date(
          parseInt(parts[0]!, 10),
          parseInt(parts[1]!, 10) - 1,
          parseInt(parts[2]!, 10)
        );
        if (
          slotDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())
        )
          return false;

        if (
          slotDate.getTime() ===
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        ) {
          const [h, m] = (r.timeSlot.endTime || '').split(':').map(Number);
          if (
            (h || 0) * 60 + (m || 0) <=
            now.getHours() * 60 + now.getMinutes()
          )
            return false;
        }
        return true;
      });

      filtered.sort((a, b) => {
        const da = new Date(a.timeSlot.date).getTime();
        const db = new Date(b.timeSlot.date).getTime();
        if (da !== db) return da - db;
        return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
      });

      setRentals(filtered);
    } catch {
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, currentUser?.id]);

  useEffect(() => {
    loadRentals();
  }, [loadRentals]);
  useFocusEffect(
    useCallback(() => {
      loadRentals();
    }, [loadRentals])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    if (!h || !m) return t;
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (rentals.length === 0) {
    return (
      <View style={st.centered}>
        <Ionicons name="calendar-outline" size={40} color={colors.inkFaint} />
        <Text style={[st.emptyTitle, { color: colors.ink }]}>
          No upcoming reservations
        </Text>
        <Text style={[st.emptySubtitle, { color: colors.inkSoft }]}>
          You don't have any upcoming court time at {facilityName}.
        </Text>
        <TouchableOpacity
          style={[st.bookBtn, { backgroundColor: colors.cobalt }]}
          activeOpacity={0.7}
          onPress={() =>
            (navigation as any).navigate('CourtAvailability', {
              facilityId,
              facilityName,
            })
          }
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.white} />
          <Text style={[st.bookBtnText, { color: colors.white }]}>
            Book Court Time
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
      <Text style={[st.sectionLabel, { color: colors.inkSoft }]}>
        YOUR UPCOMING RESERVATIONS
      </Text>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {rentals.map(r => (
          <View
            key={r.id}
            style={[
              st.card,
              { backgroundColor: colors.white, shadowColor: colors.black },
            ]}
          >
            <Text
              style={[st.courtName, { color: colors.ink }]}
              numberOfLines={1}
            >
              {r.timeSlot.court.name}
            </Text>
            <Text style={[st.dateTime, { color: colors.inkSoft }]}>
              {formatDate(r.timeSlot.date)}
            </Text>
            <Text style={[st.timeRange, { color: colors.cobalt }]}>
              {formatTime(r.timeSlot.startTime)} –{' '}
              {formatTime(r.timeSlot.endTime)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  bookBtnText: { fontFamily: fonts.ui, fontSize: 14 },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  courtName: {
    fontFamily: fonts.label,
    fontSize: 15,
    marginBottom: 4,
  },
  dateTime: { fontFamily: fonts.body, fontSize: 13 },
  timeRange: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginTop: 2,
  },
});
