import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, useTheme } from '../../theme';
import { MyCrewRow } from '../../components/home/MyCrewRow';
import { useCrewSelector } from '../../hooks/useCrewSelector';
import { SkeletonConversationRow } from '../../components/ui/SkeletonBox';
import { ConversationRow } from '../../components/messages/ConversationRow';
import { FloatingActionButton } from '../../components/navigation/FloatingActionButton';
import { conversationService } from '../../services/api/ConversationService';
import {
  setConversations,
  setLoadingConversations,
  setError,
  setUnreadCount,
} from '../../store/slices/messagingSlice';
import type { RootState } from '../../store/store';
import type { Conversation } from '../../types/messaging';
import type { MessagesStackParamList } from '../../navigation/types';

type FilterType =
  | 'ALL'
  | 'TEAM_CHAT'
  | 'GAME_THREAD'
  | 'LEAGUE_CHANNEL'
  | 'DIRECT_MESSAGE';

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'TEAM_CHAT', label: 'Teams' },
  { key: 'GAME_THREAD', label: 'Games' },
  { key: 'LEAGUE_CHANNEL', label: 'Leagues' },
  { key: 'DIRECT_MESSAGE', label: 'DMs' },
];

const EMPTY_STATES: Record<
  FilterType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    targetTab?: string;
    targetScreen?: string;
  }
> = {
  ALL: {
    icon: 'chatbubble-outline',
    title: 'No conversations yet',
    subtitle:
      'Your conversations will show up here as you join teams and games.',
  },
  TEAM_CHAT: {
    icon: 'people-outline',
    title: 'No team chats',
    subtitle: 'Join a team to start chatting with teammates.',
    actionLabel: 'Browse Teams',
    targetTab: 'Teams',
    targetScreen: 'TeamsList',
  },
  GAME_THREAD: {
    icon: 'calendar-outline',
    title: 'No game threads',
    subtitle: 'RSVP to a game to get the game thread.',
    actionLabel: 'Find Games',
    targetTab: 'Home',
    targetScreen: 'HomeScreen',
  },
  LEAGUE_CHANNEL: {
    icon: 'trophy-outline',
    title: 'No league chats',
    subtitle: 'Register for a league to access league chat.',
    actionLabel: 'Browse Leagues',
    targetTab: 'Leagues',
    targetScreen: 'LeaguesBrowser',
  },
  DIRECT_MESSAGE: {
    icon: 'person-outline',
    title: 'No direct messages',
    subtitle: "Tap a player's profile to start a conversation.",
  },
};

type Nav = NativeStackNavigationProp<MessagesStackParamList>;

export function ConversationListScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch();
  const conversations = useSelector(
    (state: RootState) => state.messaging?.conversations ?? []
  );
  const isLoading = useSelector(
    (state: RootState) => state.messaging?.isLoadingConversations ?? false
  );

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { crewMembers, selectedCrewId, onSelectCrew, hasDependents } =
    useCrewSelector();

  const loadConversations = useCallback(async () => {
    dispatch(setLoadingConversations(true));
    try {
      const data = await conversationService.getConversations(activeFilter);
      dispatch(setConversations(data));
      const total = data.reduce(
        (sum, c) => sum + (c.myParticipant?.isMuted ? 0 : c.unreadCount),
        0
      );
      dispatch(setUnreadCount(total));
    } catch (err: any) {
      dispatch(setError(err.message ?? 'Failed to load conversations'));
    }
  }, [dispatch, activeFilter]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleMute = async (conversation: Conversation) => {
    try {
      const newMuted = !conversation.myParticipant?.isMuted;
      await conversationService.setMuted(conversation.id, newMuted);
      await loadConversations();
    } catch (err: any) {
      console.error('Mute error:', err);
    }
  };

  const handlePress = (conversation: Conversation) => {
    let title = conversation.name ?? 'Chat';
    if (conversation.type === 'DIRECT_MESSAGE') {
      const other = conversation.participants.find(
        p => p.userId !== conversation.myParticipant?.userId
      );
      if (other) title = `${other.user.firstName} ${other.user.lastName}`;
    }
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      title,
      type: conversation.type,
    });
  };

  // Filter by search query
  const filtered = conversations.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (c.name ?? '').toLowerCase();
      const lastMsg = c.messages?.[0]?.content?.toLowerCase() ?? '';
      if (!name.includes(q) && !lastMsg.includes(q)) return false;
    }
    return true;
  });

  // Sort: unreads (non-muted) first, then by most recent message/update
  const sorted = [...filtered].sort((a, b) => {
    const aUnread = a.unreadCount > 0 && !a.myParticipant?.isMuted ? 1 : 0;
    const bUnread = b.unreadCount > 0 && !b.myParticipant?.isMuted ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aTime = a.messages?.[0]?.createdAt ?? a.updatedAt;
    const bTime = b.messages?.[0]?.createdAt ?? b.updatedAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const handleEmptyAction = () => {
    const emptyState = EMPTY_STATES[activeFilter];
    if (emptyState.targetTab && emptyState.targetScreen) {
      (navigation as any)
        .getParent()
        ?.navigate(emptyState.targetTab, { screen: emptyState.targetScreen });
    }
  };

  const renderEmptyState = () => {
    const emptyState = EMPTY_STATES[activeFilter];
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={emptyState.icon}
          size={56}
          color={colors.outlineVariant}
        />
        <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
          {emptyState.title}
        </Text>
        <Text
          style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}
        >
          {emptyState.subtitle}
        </Text>
        {emptyState.actionLabel && (
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={handleEmptyAction}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyActionText}>{emptyState.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonConversationRow key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bgScreen }]}>
      {/* Family crew selector */}
      {hasDependents && (
        <MyCrewRow
          members={crewMembers}
          selectedId={selectedCrewId}
          onSelect={onSelectCrew}
        />
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.chip,
              activeFilter === f.key && styles.chipActive,
              activeFilter !== f.key && { backgroundColor: themeColors.bgCard },
            ]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Conversation list */}
      <FlatList
        style={styles.list}
        data={sorted}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={handlePress}
            onMute={handleMute}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Compose FAB — must be after FlatList so it renders on top */}
      <FloatingActionButton
        icon="create-outline"
        onPress={() => navigation.navigate('NewConversation')}
        backgroundColor={colors.primary}
        iconColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
  },
  chipActive: { backgroundColor: colors.cobalt },
  chipText: {
    fontFamily: fonts.headingSemi,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: { color: '#FFFFFF' },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant + '50',
    marginLeft: 76,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: colors.primary,
  },
  emptyActionText: { fontFamily: fonts.ui, fontSize: 15, color: '#FFFFFF' },
});
