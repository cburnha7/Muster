import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EventCard } from '../../components/ui/EventCard';
import { colors, fonts, Spacing } from '../../theme';
import { useLazySearchEventsQuery } from '../../store/api/eventsApi';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { Event } from '../../types';
import { HomeStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'EventSearchResults'>;
type RoutePropType = RouteProp<HomeStackParamList, 'EventSearchResults'>;

export function EventSearchResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const user = useSelector(selectUser);

  const {
    sportTypes = [],
    locationQuery = '',
    latitude,
    longitude,
    radiusMiles = 25,
  } = route.params;

  const [trigger, { data, isLoading, isFetching }] = useLazySearchEventsQuery();

  // Trigger search on mount
  React.useEffect(() => {
    trigger({
      sportTypes,
      ...(latitude != null ? { latitude } : {}),
      ...(longitude != null ? { longitude } : {}),
      ...(latitude != null && longitude != null ? { radiusMiles } : {}),
      ...(locationQuery ? { locationQuery } : {}),
      ...(user?.id ? { userId: user.id } : {}),
      limit: 50,
    });
  }, []);

  const events = useMemo(() => {
    const raw = data?.data ?? [];
    const now = new Date();
    return raw
      .filter((e) => new Date(e.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [data]);

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (sportTypes.length > 0) parts.push(sportTypes.length === 1 ? sportTypes[0]! : `${sportTypes.length} sports`);
    if (locationQuery) parts.push(locationQuery);
    else if (latitude != null) parts.push('Near you');
    parts.push(`${radiusMiles} mi`);
    return parts.join(' · ');
  }, [sportTypes, locationQuery, latitude, radiusMiles]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Search Results</Text>
          <Text style={styles.filterSummary} numberOfLines={1}>{filterSummary}</Text>
        </View>
      </View>

      {isLoading || isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.pine} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={56} color={colors.inkFaint} />
          <Text style={styles.emptyTitle}>No games found</Text>
          <Text style={styles.emptySubtitle}>Try broadening your search or increasing the distance</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.backButtonText}>Adjust Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={handleEventPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  backBtn: {
    padding: 4,
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  filterSummary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  backButton: {
    marginTop: Spacing.xl,
    backgroundColor: colors.pine,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
});
