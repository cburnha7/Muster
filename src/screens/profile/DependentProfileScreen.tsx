import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ProfileCard } from '../../components/profile/ProfileCard';
import { PressableCard } from '../../components/ui/PressableCard';
import { SkeletonRow } from '../../components/ui/SkeletonBox';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api/config';
import { getSportEmoji } from '../../constants/sports';
import { getSportColor } from '../../constants/sportColors';
import { colors, fonts, useTheme } from '../../theme';
import { formatSportType } from '../../utils/formatters';
import { DependentProfile } from '../../types/dependent';

function isAge18OrOlder(dateOfBirth: string): boolean {
  const dateOnly = dateOfBirth.split('T')[0];
  const dob = new Date(dateOnly + 'T00:00:00Z');
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear() - 18,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  return dob <= cutoff;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DependentProfileScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user: authUser } = useAuth();
  const { width } = useWindowDimensions();

  const params = (route.params as { dependentId: string }) || {};
  const { dependentId } = params;

  const [profile, setProfile] = useState<DependentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id || !dependentId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/dependents/${dependentId}`,
        { headers: { 'X-User-Id': authUser.id } }
      );
      if (!response.ok) throw new Error('Failed to fetch dependent profile');
      const data: DependentProfile = await response.json();
      setProfile(data);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser?.id, dependentId]);

  useEffect(() => {
    if (profile) {
      navigation.setOptions({
        headerTitle: `${profile.firstName} ${profile.lastName}`,
      });
    }
  }, [navigation, profile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const canTransfer = profile ? isAge18OrOlder(profile.dateOfBirth) : false;
  const contentMaxWidth = width > 600 ? 540 : undefined;

  const recentGames = profile?.eventHistory ?? [];
  const rosterMemberships = profile?.rosterMemberships ?? [];
  const leagueMemberships = profile?.leagueMemberships ?? [];

  if (loading) {
    return (
      <ScrollView
        style={styles.container}
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
      >
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </ScrollView>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Ionicons
          name="person-outline"
          size={48}
          color={colors.outlineVariant}
        />
        <Text style={styles.emptyText}>Could not load profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
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
      {/* ── Profile Card ── */}
      <ProfileCard
        userId={dependentId}
        profileImage={profile.profileImage}
        firstName={profile.firstName}
        lastName={profile.lastName}
        dateOfBirth={profile.dateOfBirth}
        gender={(profile as any).gender}
      />

      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            (navigation as any).navigate('EditProfile', { dependentId })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnCobalt]}
          onPress={() =>
            (navigation as any).navigate('AvailabilityCalendar', {
              userId: dependentId,
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.cobalt} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextCobalt]}>
            Availability
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnTransfer,
            !canTransfer && styles.actionBtnDisabled,
          ]}
          onPress={() =>
            (navigation as any).navigate('TransferAccount', { dependentId })
          }
          disabled={!canTransfer}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color={canTransfer ? colors.onSurface : colors.outlineVariant}
          />
          <Text
            style={[
              styles.actionBtnText,
              styles.actionBtnTextTransfer,
              !canTransfer && styles.actionBtnTextDisabled,
            ]}
          >
            Transfer
          </Text>
        </TouchableOpacity>
      </View>
      {!canTransfer && (
        <Text style={styles.transferHint}>
          Transfer available when dependent turns 18
        </Text>
      )}

      {/* ── Recent Games ── */}
      <Text style={styles.sectionTitle}>Recent Games</Text>
      <View style={styles.sectionCard}>
        {recentGames.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>No games played yet</Text>
          </View>
        ) : (
          recentGames.map((booking: any, idx: number) => {
            const event = booking.event ?? booking;
            const sport = event.sportType ?? '';
            const sportColor = getSportColor(sport);
            return (
              <PressableCard
                key={booking.id ?? idx}
                style={[
                  styles.gameRow,
                  idx === recentGames.length - 1 && styles.gameRowLast,
                ]}
                onPress={() =>
                  (navigation as any).navigate('Home', {
                    screen: 'EventDetails',
                    params: { eventId: event.id ?? booking.eventId },
                  })
                }
              >
                <View
                  style={[styles.sportDot, { backgroundColor: sportColor }]}
                />
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName} numberOfLines={1}>
                    {event.title ?? `Event ${idx + 1}`}
                  </Text>
                  {event.startTime && (
                    <Text style={styles.gameMeta} numberOfLines={1}>
                      {formatEventDate(event.startTime)}{' '}
                      {event.facility?.name ? `· ${event.facility.name}` : ''}
                    </Text>
                  )}
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

      {/* ── Teams ── */}
      <Text style={styles.sectionTitle}>Teams</Text>
      <View style={styles.sectionCard}>
        {rosterMemberships.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="people-outline"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>Not a member of any Rosters</Text>
          </View>
        ) : (
          rosterMemberships.map((member: any, idx: number) => {
            const team = member.team ?? {};
            const sport = (team.sportTypes?.[0] ??
              team.sportType ??
              '') as string;
            return (
              <PressableCard
                key={member.id ?? idx}
                style={[
                  styles.gameRow,
                  idx === rosterMemberships.length - 1 && styles.gameRowLast,
                ]}
                onPress={() =>
                  (navigation as any).getParent()?.navigate('Teams', {
                    screen: 'TeamDetails',
                    params: { teamId: team.id ?? member.teamId },
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
                  <Text style={styles.gameName} numberOfLines={1}>
                    {team.name ?? `Roster ${idx + 1}`}
                  </Text>
                  <Text style={styles.gameMeta}>
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

      {/* ── League Memberships ── */}
      <Text style={styles.sectionTitle}>League Memberships</Text>
      <View style={styles.sectionCard}>
        {leagueMemberships.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="trophy-outline"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>Not a member of any Leagues</Text>
          </View>
        ) : (
          leagueMemberships.map((membership: any, idx: number) => {
            const league = membership.league ?? {};
            const sport = (league.sportType ?? '') as string;
            return (
              <PressableCard
                key={membership.id ?? idx}
                style={[
                  styles.gameRow,
                  idx === leagueMemberships.length - 1 && styles.gameRowLast,
                ]}
                onPress={() =>
                  (navigation as any).getParent()?.navigate('Leagues', {
                    screen: 'LeagueDetails',
                    params: { leagueId: league.id ?? membership.leagueId },
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
                  <Text style={styles.gameName} numberOfLines={1}>
                    {league.name ?? `League ${idx + 1}`}
                  </Text>
                  <Text style={styles.gameMeta}>
                    {sport ? formatSportType(sport) : ''}
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
    borderColor: colors.primary,
    gap: 4,
  },
  actionBtnCobalt: {
    borderColor: colors.cobalt,
  },
  actionBtnTransfer: {
    borderColor: colors.onSurface,
  },
  actionBtnDisabled: {
    borderColor: colors.outlineVariant,
    opacity: 0.6,
  },
  actionBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.primary,
  },
  actionBtnTextCobalt: {
    color: colors.cobalt,
  },
  actionBtnTextTransfer: {
    color: colors.onSurface,
  },
  actionBtnTextDisabled: {
    color: colors.outlineVariant,
  },
  transferHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.outlineVariant,
    marginTop: 6,
    fontStyle: 'italic',
  },
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
});
