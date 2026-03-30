import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { conversationService } from '../../services/api/ConversationService';
import { teamService } from '../../services/api/TeamService';
import type { RootState } from '../../store/store';
import type { Team } from '../../types';

interface RecentPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
}

export function NewConversationScreen() {
  const navigation = useNavigation();
  const currentUserId = useSelector((state: RootState) => state.auth?.user?.id);

  const [query, setQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsRes] = await Promise.all([
        teamService.getTeams(),
      ]);
      setTeams(teamsRes.data ?? []);
      // Recent players would come from a dedicated endpoint;
      // for now we leave the list empty until the API is wired.
      setRecentPlayers([]);
    } catch {
      // Silently handle -- sections will just be empty
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ────────────────────────────────────
  const lowerQ = query.toLowerCase();

  const filteredTeams = query
    ? teams.filter((t) => t.name.toLowerCase().includes(lowerQ))
    : teams;

  const filteredPlayers = query
    ? recentPlayers.filter((p) => p.name.toLowerCase().includes(lowerQ))
    : recentPlayers;

  // ── Navigation helpers ───────────────────────────
  const openDM = useCallback(
    async (userId: string, userName: string) => {
      if (navigating) return;
      try {
        setNavigating(true);
        const conv = await conversationService.getDM(userId);
        (navigation as any).navigate('Chat', {
          conversationId: conv.id,
          title: userName,
          type: 'DIRECT_MESSAGE',
        });
      } catch {
        // TODO: surface error toast
      } finally {
        setNavigating(false);
      }
    },
    [navigation, navigating],
  );

  const openTeamChat = useCallback(
    async (teamId: string, teamName: string) => {
      if (navigating) return;
      try {
        setNavigating(true);
        const conv = await conversationService.getOrCreateTeamChat(teamId);
        (navigation as any).navigate('Chat', {
          conversationId: conv.id,
          title: teamName,
          type: 'TEAM_CHAT',
        });
      } catch {
        // TODO: surface error toast
      } finally {
        setNavigating(false);
      }
    },
    [navigation, navigating],
  );

  // ── Section data ─────────────────────────────────
  const sections: { title: string; data: any[] }[] = [];

  if (filteredTeams.length > 0) {
    sections.push({ title: 'YOUR TEAMS', data: filteredTeams.map((t) => ({ ...t, _kind: 'team' as const })) });
  }
  if (filteredPlayers.length > 0) {
    sections.push({ title: 'RECENT PLAYERS', data: filteredPlayers.map((p) => ({ ...p, _kind: 'player' as const })) });
  }

  // ── Render helpers ───────────────────────────────
  const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : '?');

  const renderItem = ({ item }: { item: any }) => {
    if (item._kind === 'team') {
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.6}
          onPress={() => openTeamChat(item.id, item.name)}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryFixed }]}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.outline} />
        </TouchableOpacity>
      );
    }

    // player
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.6}
        onPress={() => openDM(item.id, item.name)}
      >
        <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
        </View>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.outline} />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  // ── Main render ──────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people or teams..."
            placeholderTextColor={colors.outline}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={colors.outline} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>
            {query ? 'No results' : 'No contacts yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {query
              ? 'Try a different search term.'
              : 'Join a team or play in a game to see contacts here.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {navigating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    padding: 0,
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontFamily: fonts.headingSemi,
    fontSize: 18,
    color: colors.onSurface,
  },
  rowName: {
    flex: 1,
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    color: colors.onSurface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: colors.onSurface,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
