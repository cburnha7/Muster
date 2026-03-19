import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types';
import { PersonFilter, MultiDotMarking } from '../../types/eventsCalendar';
import { EventCard } from '../ui/EventCard';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { EventsCalendar } from './EventsCalendar';
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
  // Calendar props — rendered inside My Events section
  markedDates: Record<string, MultiDotMarking>;
  onDateSelect: (dateString: string) => void;
  onMonthChange: (month: { year: number; month: number }) => void;
}

interface EventSection {
  title: string;
  data: Event[];
}

/**
 * Get the color indicator for an event based on ownership and person colors.
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
  markedDates,
  onDateSelect,
  onMonthChange,
}) => {
  const { myEvents, publicEvents } = useMemo(() => {
    const dayEvents = events.filter((event) => {
      const eventDate = formatDateForCalendar(new Date(event.startTime));
      return eventDate === selectedDate;
    });

    const my: Event[] = [];
    const pub: Event[] = [];

    for (const event of dayEvents) {
      const isOrganizer = event.organizerId === currentUserId;
      const isParticipant = event.participants?.some(
        (p) => p.userId === currentUserId,
      );
      if (isOrganizer || isParticipant) {
        my.push(event);
      } else {
        pub.push(event);
      }
    }

    return { myEvents: my, publicEvents: pub };
  }, [events, selectedDate, currentUserId]);

  const isEmpty = myEvents.length === 0 && publicEvents.length === 0;

  const renderEventCard = (item: Event) => {
    const colorIndicator = getEventColorIndicator(item, familyUserIds, personColors);
    return (
      <EventCard
        key={item.id}
        event={item}
        onPress={() => onEventPress(item)}
        colorIndicator={colorIndicator}
        isHost={item.organizerId === currentUserId ? true : undefined}
      />
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.pine}
          colors={[colors.pine]}
        />
      }
    >
      {/* My Events — calendar + event cards inside */}
      <CollapsibleSection title="My Events" count={myEvents.length}>
        <EventsCalendar
          selectedDate={selectedDate}
          markedDates={markedDates}
          onDateSelect={onDateSelect}
          onMonthChange={onMonthChange}
        />
        {myEvents.length > 0
          ? myEvents.map(renderEventCard)
          : !isLoading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No events on this day</Text>
              </View>
            )}
      </CollapsibleSection>

      {/* Public Events */}
      <CollapsibleSection title="Public Events" count={publicEvents.length}>
        {publicEvents.length > 0
          ? publicEvents.map(renderEventCard)
          : !isLoading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No public events on this day</Text>
              </View>
            )}
      </CollapsibleSection>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  listContent: {
    flexGrow: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
});
