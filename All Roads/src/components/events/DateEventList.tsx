import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { PersonFilter } from '../../types/eventsCalendar';
import { EventCard } from '../ui/EventCard';
import { resolveEventOwnership } from '../../utils/eventsCalendarUtils';
import { formatDateForCalendar } from '../../utils/calendarUtils';
import { colors, fonts, Spacing } from '../../theme';

interface DateEventListProps {
  events: Event[];
  selectedDate: string; // YYYY-MM-DD
  currentUserId: string;
  activeFilter: PersonFilter;
  personColors: Map<string, string>;
  familyUserIds: string[];
  onEventPress: (event: Event) => void;
  isLoading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

interface EventSection {
  title: string;
  data: Event[];
}

/**
 * Get the color indicator for an event based on ownership and person colors.
 * Returns the first owner's color from personColors, or undefined if no owner.
 */
function getEventColorIndicator(
  event: Event,
  familyUserIds: string[],
  personColors: Map<string, string>,
): string | undefined {
  const ownership = resolveEventOwnership(event, familyUserIds);
  if (ownership.ownerUserIds.length > 0) {
    return personColors.get(ownership.ownerUserIds[0]);
  }
  return undefined;
}

export const DateEventList: React.FC<DateEventListProps> = ({
  events,
  selectedDate,
  currentUserId,
  activeFilter,
  personColors,
  familyUserIds,
  onEventPress,
  isLoading,
  onRefresh,
  refreshing,
}) => {
  const sections = useMemo<EventSection[]>(() => {
    // Filter events to the selected date
    const dayEvents = events.filter((event) => {
      const eventDate = formatDateForCalendar(new Date(event.startTime));
      return eventDate === selectedDate;
    });

    // Split into "My Events" and "Public Events"
    const myEvents: Event[] = [];
    const publicEvents: Event[] = [];

    for (const event of dayEvents) {
      const isOrganizer = event.organizerId === currentUserId;
      const isParticipant = event.participants?.some(
        (p) => p.userId === currentUserId,
      );
      if (isOrganizer || isParticipant) {
        myEvents.push(event);
      } else {
        publicEvents.push(event);
      }
    }

    const result: EventSection[] = [];
    if (myEvents.length > 0) {
      result.push({ title: 'My Events', data: myEvents });
    }
    if (publicEvents.length > 0) {
      result.push({ title: 'Public Events', data: publicEvents });
    }
    return result;
  }, [events, selectedDate, currentUserId]);

  const isEmpty = sections.length === 0;

  const renderSectionHeader = ({ section }: { section: EventSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Event }) => {
    const colorIndicator = getEventColorIndicator(
      item,
      familyUserIds,
      personColors,
    );
    return (
      <EventCard
        event={item}
        onPress={() => onEventPress(item)}
        colorIndicator={colorIndicator}
      />
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="calendar-outline"
          size={48}
          color={colors.inkFaint}
        />
        <Text style={styles.emptyText}>No events on this day</Text>
      </View>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.grass}
          colors={[colors.grass]}
        />
      }
      contentContainerStyle={isEmpty ? styles.emptyList : undefined}
      stickySectionHeadersEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.massive,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    marginTop: Spacing.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
