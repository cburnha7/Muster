import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { SportRatingsSection } from '../../components/profile/SportRatingsSection';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { DependentProfile } from '../../types/dependent';

/**
 * DependentProfileScreen
 *
 * Displays a dependent's full profile: stats, sport ratings, event history,
 * Salutes, Roster memberships, and League memberships. Provides edit and
 * transfer actions.
 *
 * Requirements: 3.1, 3.2, 3.3, 4.1, 8.1
 */

/**
 * Returns true if the person with the given DOB is 18 or older.
 */
function isAge18OrOlder(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return dob <= cutoff;
}

export function DependentProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user: authUser } = useAuth();

  const params = (route.params as { dependentId: string }) || {};
  const { dependentId } = params;

  const [profile, setProfile] = useState<DependentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id || !dependentId) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/dependents/${dependentId}`,
        { headers: { 'X-User-Id': authUser.id } }
      );
      if (!response.ok) throw new Error('Failed to fetch dependent profile');
      const data: DependentProfile = await response.json();
      setProfile(data);
    } catch {
      Alert.alert('Error', 'Could not load dependent profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authUser?.id, dependentId]);

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

  const handleEdit = () => {
    (navigation as any).navigate('DependentForm', { dependentId });
  };

  const handleTransfer = () => {
    (navigation as any).navigate('TransferAccount', { dependentId });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Dependent Profile"
          showBack
          onBackPress={() => (navigation as any).goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.grass} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Dependent Profile"
          showBack
          onBackPress={() => (navigation as any).goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Could not load profile.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={`${profile.firstName} ${profile.lastName}`}
        showBack
        onBackPress={() => (navigation as any).goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grass} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRow}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color={colors.inkFaint} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.profileDob}>
                Born {new Date(profile.dateOfBirth).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit dependent profile"
            >
              <Ionicons name="create-outline" size={18} color={colors.grass} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.transferButton, !canTransfer && styles.transferButtonDisabled]}
              onPress={handleTransfer}
              disabled={!canTransfer}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Transfer account to independent"
              accessibilityState={{ disabled: !canTransfer }}
            >
              <Ionicons
                name="arrow-forward-circle-outline"
                size={18}
                color={canTransfer ? colors.sky : colors.inkFaint}
              />
              <Text style={[styles.transferButtonText, !canTransfer && styles.transferButtonTextDisabled]}>
                Transfer
              </Text>
            </TouchableOpacity>
          </View>
          {!canTransfer && (
            <Text style={styles.transferHint}>
              Transfer available when dependent turns 18
            </Text>
          )}
        </View>

        {/* Sport Ratings — reuses the same component as the guardian's profile */}
        <SportRatingsSection userId={dependentId} />

        {/* Salutes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salutes Received</Text>
          <View style={styles.statCard}>
            <Ionicons name="hand-left-outline" size={24} color={colors.court} />
            <Text style={styles.statValue}>{profile.salutesReceived}</Text>
            <Text style={styles.statLabel}>
              {profile.salutesReceived === 1 ? 'Salute' : 'Salutes'}
            </Text>
          </View>
        </View>

        {/* Event History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event History</Text>
          {profile.eventHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color={colors.inkFaint} />
              <Text style={styles.emptyCardText}>No events yet</Text>
            </View>
          ) : (
            profile.eventHistory.map((event: any, index: number) => (
              <View key={event.id ?? index} style={styles.listItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.grass} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {event.title ?? event.name ?? `Event ${index + 1}`}
                </Text>
                {event.date && (
                  <Text style={styles.listItemDate}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Roster Memberships */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roster Memberships</Text>
          {profile.rosterMemberships.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={24} color={colors.inkFaint} />
              <Text style={styles.emptyCardText}>Not a member of any Rosters</Text>
            </View>
          ) : (
            profile.rosterMemberships.map((roster: any, index: number) => (
              <View key={roster.id ?? index} style={styles.listItem}>
                <Ionicons name="people-outline" size={18} color={colors.grass} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {roster.name ?? `Roster ${index + 1}`}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* League Memberships */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Memberships</Text>
          {profile.leagueMemberships.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={24} color={colors.inkFaint} />
              <Text style={styles.emptyCardText}>Not a member of any Leagues</Text>
            </View>
          ) : (
            profile.leagueMemberships.map((league: any, index: number) => (
              <View key={league.id ?? index} style={styles.listItem}>
                <Ionicons name="trophy-outline" size={18} color={colors.grass} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {league.name ?? `League ${index + 1}`}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
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
  profileDob: {
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
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.sky,
  },
  transferButtonDisabled: {
    borderColor: colors.inkFaint + '40',
    opacity: 0.6,
  },
  transferButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.sky,
    marginLeft: 4,
  },
  transferButtonTextDisabled: {
    color: colors.inkFaint,
  },
  transferHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
    fontStyle: 'italic',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.court,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyCardText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: Spacing.sm,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  listItemText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  listItemDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
});
