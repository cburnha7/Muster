import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableCard } from '../../components/ui/PressableCard';
import { SkeletonRow } from '../../components/ui/SkeletonBox';
import { ProfileCard } from '../../components/profile/ProfileCard';
import { fonts, useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useDispatch } from 'react-redux';
import { setUser as setReduxUser } from '../../store/slices/authSlice';
import { userService } from '../../services/api/UserService';
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
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: authUser, logout } = useAuth();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    games: number;
    salutes: number;
    teams: number;
  } | null>(null);
  const [recentGames, setRecentGames] = useState<Event[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Set header title to user's name
  useEffect(() => {
    if (authUser) {
      navigation.setOptions({
        headerTitle: `${authUser.firstName} ${authUser.lastName}`,
      });
    }
  }, [navigation, authUser]);

  const loadProfileData = useCallback(async () => {
    try {
      // Fetch fresh profile data and update Redux
      try {
        const freshProfile = await userService.getProfile();
        dispatch(setReduxUser(freshProfile as any));
      } catch {
        // Non-critical — use cached data
      }

      const [statsData, teamsData, eventsData] = await Promise.all([
        userService.getUserStats().catch(e => {
          console.warn('Stats fetch failed:', e);
          return null;
        }),
        userService.getUserTeams().catch(e => {
          console.warn('Teams fetch failed:', e);
          return { data: [] };
        }),
        userService.getUserEvents('completed', { limit: 5 }).catch(e => {
          console.warn('Events fetch failed:', e);
          return { data: [] };
        }),
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

  // Refresh when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  }, [loadProfileData]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        logout();
      }
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      style={[styles.container, { backgroundColor: colors.background }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={[
        styles.content,
        contentMaxWidth
          ? {
              maxWidth: contentMaxWidth,
              alignSelf: 'center' as const,
              width: '100%' as unknown as number,
            }
          : undefined,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Card ──────────────────────────── */}
      <ProfileCard
        userId={authUser.id}
        profileImage={authUser.profileImage}
        firstName={authUser.firstName}
        lastName={authUser.lastName}
        dateOfBirth={(authUser as any).dateOfBirth ?? ''}
        gender={(authUser as any).gender}
        email={authUser.email}
        phone={(authUser as any).phoneNumber}
        address={
          (authUser as any)?.locationCity
            ? `${(authUser as any).locationCity}, ${(authUser as any).locationState}`
            : undefined
        }
      />

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.primary }]}
          onPress={() => (navigation as any).navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.primary }, styles.actionBtnCobalt, { borderColor: colors.cobalt }]}
          onPress={() =>
            (navigation as any).navigate('AvailabilityCalendar', {
              userId: authUser.id,
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.cobalt} />
          <Text style={[styles.actionBtnText, { color: colors.primary }, styles.actionBtnTextCobalt, { color: colors.cobalt }]}>
            Availability
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Recent Games ───────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.pine }]}>Recent Games</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loadingStats ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : recentGames.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No games played yet</Text>
            <TouchableOpacity
              onPress={() =>
                (navigation as any)
                  .getParent()
                  ?.navigate('Home', { screen: 'HomeScreen' })
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyAction, { color: colors.pine }]}>Find one nearby</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentGames.map((event, idx) => {
            const sport = (event as any).sportType ?? '';
            const sportColor = getSportColor(sport);
            return (
              <PressableCard
                key={event.id}
                style={[
                  styles.gameRow, { borderBottomColor: colors.outlineVariant + '50' },
                  idx === recentGames.length - 1 && styles.gameRowLast]}
                onPress={() =>
                  (navigation as any).navigate('Home', {
                    screen: 'EventDetails',
                    params: { eventId: event.id },
                  })
                }
              >
                <View
                  style={[styles.sportDot, { backgroundColor: sportColor }]}
                />
                <View style={styles.gameInfo}>
                  <Text style={[styles.gameName, { color: colors.onSurface }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.gameMeta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                    {formatEventDate(event.startTime as any)}{' '}
                    {(event as any).facility?.name
                      ? `· ${(event as any).facility.name}`
                      : ''}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.outlineVariant}
                />
              </PressableCard>
            );
          })
        )}
      </View>

      {/* ── Teams ──────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.pine }]}>Teams</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loadingStats ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)
        ) : myTeams.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="people-outline"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No teams yet</Text>
            <TouchableOpacity
              onPress={() =>
                (navigation as any)
                  .getParent()
                  ?.navigate('Teams', { screen: 'TeamsList' })
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyAction, { color: colors.pine }]}>Join or create one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myTeams.map((team, idx) => {
            const sport = (team.sportTypes?.[0] ??
              (team as any).sportType ??
              '') as string;
            return (
              <PressableCard
                key={team.id}
                style={[
                  styles.gameRow, { borderBottomColor: colors.outlineVariant + '50' },
                  idx === myTeams.length - 1 && styles.gameRowLast]}
                onPress={() =>
                  (navigation as any).getParent()?.navigate('Teams', {
                    screen: 'TeamDetails',
                    params: { teamId: team.id },
                  })
                }
              >
                <View
                  style={[
                    styles.teamIconCircle,
                    { backgroundColor: getSportColor(sport) + '18' },
                  ]}
                >
                  <Text style={styles.teamEmoji}>{getSportEmoji(sport)}</Text>
                </View>
                <View style={styles.gameInfo}>
                  <Text style={[styles.gameName, { color: colors.onSurface }]} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <Text style={[styles.gameMeta, { color: colors.onSurfaceVariant }]}>
                    {team.members?.length ?? 0} players
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.outlineVariant}
                />
              </PressableCard>
            );
          })
        )}
      </View>

      {/* ── Log Out ────────────────────────────────── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Action Buttons ───────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnCobalt: {},
  actionBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
  actionBtnTextCobalt: {},

  // ── Section ────────────────────────────────────
  sectionTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // ── Game / Team Rows ───────────────────────────
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
  gameMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
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
  },
  emptyAction: {
    fontFamily: fonts.ui,
    fontSize: 14,
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
  },
});
