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
import { colors, fonts } from '../../theme';
import { ConversationRow } from '../../components/messages/ConversationRow';
import { conversationService } from '../../services/api/ConversationService';
import { setConversations, setLoadingConversations, setError, setUnreadCount } from '../../store/slices/messagingSlice';
import type { RootState } from '../../store/store';
import type { Conversation } from '../../types/messaging';
import type { MessagesStackParamList } from '../../navigation/types';

type FilterType = 'ALL' | 'TEAM_CHAT' | 'GAME_THREAD' | 'LEAGUE_CHANNEL' | 'DIRECT_MESSAGE';

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'TEAM_CHAT', label: 'Teams' },
  { key: 'GAME_THREAD', label: 'Games' },
  { key: 'LEAGUE_CHANNEL', label: 'Leagues' },
  { key: 'DIRECT_MESSAGE', label: 'DMs' },
];

type Nav = NativeStackNavigationProp<MessagesStackParamList>;

export function ConversationListScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch();
  const conversations = useSelector((state: RootState) => state.messaging?.conversations ?? []);
  const isLoading = useSelector((state: RootState) => state.messaging?.isLoadingConversations ?? false);

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    dispatch(setLoadingConversations(true));
    try {
      const data = await conversationService.getConversations(activeFilter);
      dispatch(setConversations(data));
      const total = data.reduce((sum, c) => sum + (c.myParticipant?.isMuted ? 0 : c.unreadCount), 0);
      dispatch(setUnreadCount(total));
    } catch (err: any) {
      dispatch(setError(err.message ?? 'Failed to load conversations'));
    }
  }, [dispatch, activeFilter]);

  useEffect(() => {
    loadConversations();
    // Polling: refresh conversation list every 30 seconds
    // TODO: replace with Socket.IO subscription when WebSocket layer is added
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handlePress = (conversation: Conversation) => {
    let title = conversation.name ?? 'Chat';
    if (conversation.type === 'DIRECT_MESSAGE') {
      const other = conversation.participants.find((p) => p.userId !== conversation.myParticipant?.userId);
      if (other) title = `${other.user.firstName} ${other.user.lastName}`;
    }
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      title,
      type: conversation.type,
    });
  };

  const filtered = conversations.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (c.name ?? '').toLowerCase();
      const lastMsg = c.messages[0]?.content.toLowerCase() ?? '';
      if (!name.includes(q) && !lastMsg.includes(q)) return false;
    }
    return true;
  });

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations"
          placeholderTextColor={colors.onSurfaceVariant}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, activeFilter === f.key && styles.chipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Conversation list */}
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationRow conversation={item} onPress={handlePress} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Your conversations will show up here as you join teams and games.
            </Text>
          </View>
        }
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.label, fontSize: 13, color: colors.onSurfaceVariant },
  chipTextActive: { color: '#FFFFFF' },
  separator: { height: 1, backgroundColor: colors.outlineVariant + '50', marginLeft: 76 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontFamily: fonts.headingSemi, fontSize: 18, color: colors.onSurface, textAlign: 'center' },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
});
