import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableCard } from '../../components/ui/PressableCard';
import { SkeletonRow } from '../../components/ui/SkeletonBox';
import { colors, fonts } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/api/UserService';
import { teamService } from '../../services/api/TeamService';
import { getSportEmoji } from '../../constants/sports';
import { getSportColor } from '../../constants/sportColors';
import type { Team, Event } from '../../types';

// ── Helpers ──

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Screen ──

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ games: number; salutes: number; teams: number } | null>(null);
  const [recentGames, setRecentGames] = useState<Event[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadProfileData = useCallback(async () => {
    try {
      const [statsData, teamsData, eventsData] = await Promise.all([
        userService.getUserStats().catch((e) => { console.warn('Stats fetch failed:', e); return null; }),
        userService.getUserTeams().catch((e) => { console.warn('Teams fetch failed:', e); return { data: [] }; }),
        userService.getUserEvents('completed', { limit: 5 }).catch((e) => { console.warn('Events fetch failed:', e); return { data: [] }; }),
      ]);

      const teams: Team[] = (teamsData as any)?.data ?? [];
      const events: Event[] = (eventsData as any)?.data ?? [];

      setMyTeams(teams);
      setRecentGames(events);
      setStats({
        games: statsData?.totalBookings ?? events.length,
        salutes: 0, // Debrief salutes not yet wired
        teams: teams.length, // Use actual team count, not stats endpoint
      });
    } catch {
      // Silently fail — show zeros
      setStats({ games: 0, salutes: 0, teams: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  }, [loadProfileData]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) { logout(); }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const contentMaxWidth = width > 600 ? 540 : undefined;

  if (!authUser) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="person-outline"
          title="Profile Unavailable"
          subtitle="Unable to load your profile. Please try logging in again."
        />
      </View>
    );
  }

  const sportPrefs = authUser?.sportPreferences ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Identity Card ──────────────────────────── */}
      <View style={styles.identityCard}>
        <View style={styles.identityTop}>
          {authUser.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {authUser.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.identityInfo}>
            <Text style={styles.profileName}>{authUser.firstName} {authUser.lastName}</Text>
            {(authUser as any)?.address && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.onSurfaceVariant} />
                <Text style={styles.locationText} numberOfLines={1}>{(authUser as any).address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sport badges */}
        {sportPrefs.length > 0 && (
          <View style={styles.sportBadges}>
            {sportPrefs.map((key) => (
              <View key={key} style={styles.sportBadge}>
                <Text style={styles.sportBadgeEmoji}>{getSportEmoji(key)}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.editLink}
          onPress={() => (navigation as any).navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
          <Text style={styles.editLinkText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ──────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{loadingStats ? '-' : stats?.games ?? 0}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{loadingStats ? '-' : stats?.salutes ?? 0}</Text>
          <Text style={styles.statLabel}>Salutes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{loadingStats ? '-' : stats?.teams ?? 0}</Text>
          <Text style={styles.statLabel}>Teams</Text>
        </View>
      </View>

      {/* ── Recent Games ───────────────────────────── */}
      <Text style={styles.sectionTitle}>Recent Games</Text>
      <View style={styles.sectionCard}>
        {loadingStats ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : recentGames.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="calendar-outline" size={32} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>No games played yet</Text>
            <TouchableOpacity onPress={() => (navigation as any).getParent()?.navigate('Home', { screen: 'HomeScreen' })} activeOpacity={0.7}>
              <Text style={styles.emptyAction}>Find one nearby</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentGames.map((event, idx) => {
            const sport = (event as any).sportType ?? '';
            const sportColor = getSportColor(sport);
            return (
              <PressableCard
                key={event.id}
                style={[styles.gameRow, idx === recentGames.length - 1 && styles.gameRowLast]}
                onPress={() => (navigation as any).navigate('Home', { screen: 'EventDetails', params: { eventId: event.id } })}
              >
                <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.gameMeta} numberOfLines={1}>
                    {formatEventDate(event.startTime as any)} {(event as any).facility?.name ? `· ${(event as any).facility.name}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.outlineVariant} />
              </PressableCard>
            );
          })
        )}
      </View>

      {/* ── Teams ──────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Teams</Text>
      <View style={styles.sectionCard}>
        {loadingStats ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)
        ) : myTeams.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="people-outline" size={32} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>No teams yet</Text>
            <TouchableOpacity onPress={() => (navigation as any).getParent()?.navigate('Teams', { screen: 'TeamsList' })} activeOpacity={0.7}>
              <Text style={styles.emptyAction}>Join or create one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myTeams.map((team, idx) => {
            const sport = (team.sportTypes?.[0] ?? (team as any).sportType ?? '') as string;
            return (
              <PressableCard
                key={team.id}
                style={[styles.gameRow, idx === myTeams.length - 1 && styles.gameRowLast]}
                onPress={() => (navigation as any).getParent()?.navigate('Teams', { screen: 'TeamDetails', params: { teamId: team.id } })}
              >
                <View style={[styles.teamIconCircle, { backgroundColor: getSportColor(sport) + '18' }]}>
                  <Text style={styles.teamEmoji}>{getSportEmoji(sport)}</Text>
                </View>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName} numberOfLines={1}>{team.name}</Text>
                  <Text style={styles.gameMeta}>{team.members?.length ?? 0} players</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.outlineVariant} />
              </PressableCard>
            );
          })
        )}
      </View>

      {/* ── Log Out ────────────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Identity Card ──────────────────────────────
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 28,
    color: '#FFFFFF',
  },
  identityInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  profileName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  sportBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  sportBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportBadgeEmoji: {
    fontSize: 16,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  editLinkText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.primary,
  },

  // ── Stats Row ──────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Section ────────────────────────────────────
  sectionTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    color: colors.onSurface,
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },

  // ── Game / Team Rows ───────────────────────────
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant + '50',
  },
  gameRowLast: {
    borderBottomWidth: 0,
  },
  sportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamEmoji: {
    fontSize: 18,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  gameMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // ── Empty States ───────────────────────────────
  emptySection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  emptyAction: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
  },

  // ── Log Out ────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
  },
});
