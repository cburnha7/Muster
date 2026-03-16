import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { facilityService } from '../../services/api/FacilityService';
import { eventService } from '../../services/api/EventService';
import { userService } from '../../services/api/UserService';
import { leagueService } from '../../services/api/LeagueService';
import { Facility, Event, Team } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { MyReservationsSection } from '../../components/profile/MyReservationsSection';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';

interface UserLeague {
  id: string;
  name: string;
  sportType: string;
  isActive: boolean;
  imageUrl?: string;
  memberCount: number;
  role: 'commissioner' | 'player';
}

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();

  const [myGrounds, setMyGrounds] = useState<Facility[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myLeagues, setMyLeagues] = useState<UserLeague[]>([]);
  const [ownedRosters, setOwnedRosters] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapsible state — all start expanded
  const [eventsExpanded, setEventsExpanded] = useState(true);
  const [groundsExpanded, setGroundsExpanded] = useState(true);
  const [rostersExpanded, setRostersExpanded] = useState(true);
  const [leaguesExpanded, setLeaguesExpanded] = useState(true);

  const loadData = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const [groundsRes, eventsRes, leaguesRes, rostersRes] = await Promise.allSettled([
        facilityService.getFacilitiesByOwner(authUser.id),
        userService.getUserEvents(),
        userService.getUserLeagues(),
        userService.getUserTeams(),
      ]);

      if (groundsRes.status === 'fulfilled') {
        setMyGrounds(groundsRes.value?.data ?? []);
      }
      if (eventsRes.status === 'fulfilled') {
        setMyEvents(eventsRes.value?.data ?? []);
      }
      if (leaguesRes.status === 'fulfilled') {
        setMyLeagues(leaguesRes.value ?? []);
      }
      if (rostersRes.status === 'fulfilled') {
        // Only show rosters the user owns (captainId matches)
        const allRosters = rostersRes.value?.data ?? [];
        setOwnedRosters(
          allRosters.filter((r: Team) => r.captainId === authUser.id)
        );
      }
    } catch (err) {
      console.error('Profile load error:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadData} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grass} />}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarRow}>
          {authUser?.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={36} color={colors.inkFaint} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {authUser?.firstName} {authUser?.lastName}
            </Text>
            {authUser?.email && (
              <Text style={styles.profileEmail}>{authUser.email}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => (navigation as any).navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.grass} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => (navigation as any).navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Reservations */}
      {authUser?.id && <MyReservationsSection userId={authUser.id} />}

      {/* My Events */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setEventsExpanded(!eventsExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="football" size={24} color={colors.grass} />
            <Text style={styles.sectionTitle}>My Events</Text>
            {myEvents.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myEvents.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={eventsExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.inkFaint}
          />
        </TouchableOpacity>
        {eventsExpanded && (
          myEvents.length > 0 ? (
            myEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.listItem}
                onPress={() => (navigation as any).navigate('Events', {
                  screen: 'EventDetails',
                  params: { eventId: event.id },
                })}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.listItemSubtitle} numberOfLines={1}>
                    {event.sportType} • {new Date(event.startTime).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events yet</Text>
            </View>
          )
        )}
      </View>

      {/* My Grounds */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setGroundsExpanded(!groundsExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="location" size={24} color={colors.grass} />
            <Text style={styles.sectionTitle}>My Grounds</Text>
            {myGrounds.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myGrounds.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={groundsExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.inkFaint}
          />
        </TouchableOpacity>
        {groundsExpanded && (
          myGrounds.length > 0 ? (
            myGrounds.map((facility) => (
              <TouchableOpacity
                key={facility.id}
                style={styles.listItem}
                onPress={() => (navigation as any).navigate('FacilityDetails', {
                  facilityId: facility.id,
                })}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>{facility.name}</Text>
                  <Text style={styles.listItemSubtitle} numberOfLines={1}>
                    {facility.sportTypes?.join(', ') || 'Multi-sport'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No grounds yet</Text>
            </View>
          )
        )}
      </View>

      {/* My Rosters */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setRostersExpanded(!rostersExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="people" size={24} color={colors.grass} />
            <Text style={styles.sectionTitle}>My Rosters</Text>
            {ownedRosters.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{ownedRosters.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={rostersExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.inkFaint}
          />
        </TouchableOpacity>
        {rostersExpanded && (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={colors.sky} />
              <Text style={styles.infoBannerText}>Only rosters you own are shown here</Text>
            </View>
            {ownedRosters.length > 0 ? (
              ownedRosters.map((roster) => (
                <TouchableOpacity
                  key={roster.id}
                  style={styles.listItem}
                  onPress={() => (navigation as any).navigate('Teams', {
                    screen: 'TeamDetails',
                    params: { teamId: roster.id },
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>{roster.name}</Text>
                    <Text style={styles.listItemSubtitle} numberOfLines={1}>
                      {roster.sportType} • {roster.members?.length ?? 0} players
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>You don't own any rosters yet</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* My Leagues */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setLeaguesExpanded(!leaguesExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="trophy" size={24} color={colors.grass} />
            <Text style={styles.sectionTitle}>My Leagues</Text>
            {myLeagues.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myLeagues.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={leaguesExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.inkFaint}
          />
        </TouchableOpacity>
        {leaguesExpanded && (
          myLeagues.length > 0 ? (
            myLeagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={styles.listItem}
                onPress={() => (navigation as any).navigate('Leagues', {
                  screen: 'LeagueDetails',
                  params: { leagueId: league.id },
                })}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <View style={styles.listItemTitleRow}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>{league.name}</Text>
                    {league.role === 'commissioner' && (
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Commissioner</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.listItemSubtitle} numberOfLines={1}>
                    {league.sportType} • {league.memberCount ?? 0} rosters
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No leagues yet</Text>
            </View>
          )
        )}
      </View>

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.track} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  content: {
    paddingBottom: 24,
  },
  // Profile header
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: colors.chalk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontFamily: fonts.heading,
    ...typeScale.h3,
    color: colors.ink,
  },
  profileEmail: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grass,
  },
  editButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.grass,
    marginLeft: 4,
  },
  settingsButton: {
    padding: 6,
  },
  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: `${colors.grass}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  countBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.grass,
  },
  // List items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemContent: {
    flex: 1,
    marginRight: 8,
  },
  listItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: `${colors.court}20`,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.court,
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${colors.sky}12`,
    gap: 6,
  },
  infoBannerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.sky,
    flex: 1,
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.track}30`,
  },
  logoutText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.track,
    marginLeft: 8,
  },
});
