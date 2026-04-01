import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


import { ProfileCard } from '../../components/profile/ProfileCard';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api/config';
import { colors, fonts, Spacing } from '../../theme';
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
        `${API_BASE_URL}/dependents/${dependentId}`,
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

  // Update nav header with dependent's name
  useEffect(() => {
    if (profile) {
      navigation.setOptions({ headerTitle: `${profile.firstName} ${profile.lastName}` });
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

  const handleEdit = () => {
    (navigation as any).navigate('DependentForm', { dependentId });
  };

  const handleTransfer = () => {
    (navigation as any).navigate('TransferAccount', { dependentId });
  };

  const handleAvailability = () => {
    (navigation as any).navigate('AvailabilityCalendar', { userId: dependentId });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Could not load profile.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <ProfileCard
            userId={dependentId}
            profileImage={profile.profileImage}
            firstName={profile.firstName}
            lastName={profile.lastName}
            dateOfBirth={profile.dateOfBirth}
            gender={(profile as any).gender}
            email={(profile as any).email}
            phone={(profile as any).phoneNumber}
          />
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
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.availabilityButton}
            onPress={handleAvailability}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Update availability"
          >
            <Ionicons name="calendar-outline" size={18} color={colors.cobalt} />
            <Text style={styles.availabilityButtonText}>Availability</Text>
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
              color={canTransfer ? colors.onSurface : colors.outline}
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

        {/* Event History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event History</Text>
          {profile.eventHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color={colors.outline} />
              <Text style={styles.emptyCardText}>No events yet</Text>
            </View>
          ) : (
            profile.eventHistory.map((booking: any, index: number) => (
              <View key={booking.id ?? index} style={styles.listItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {booking.event?.title ?? `Event ${index + 1}`}
                </Text>
                {booking.event?.startTime && (
                  <Text style={styles.listItemDate}>
                    {new Date(booking.event.startTime).toLocaleDateString()}
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
              <Ionicons name="people-outline" size={24} color={colors.outline} />
              <Text style={styles.emptyCardText}>Not a member of any Rosters</Text>
            </View>
          ) : (
            profile.rosterMemberships.map((member: any, index: number) => (
              <View key={member.id ?? index} style={styles.listItem}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {member.team?.name ?? `Roster ${index + 1}`}
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
              <Ionicons name="trophy-outline" size={24} color={colors.outline} />
              <Text style={styles.emptyCardText}>Not a member of any Leagues</Text>
            </View>
          ) : (
            profile.leagueMemberships.map((membership: any, index: number) => (
              <View key={membership.id ?? index} style={styles.listItem}>
                <Ionicons name="trophy-outline" size={18} color={colors.primary} />
                <Text style={styles.listItemText} numberOfLines={1}>
                  {membership.league?.name ?? `League ${index + 1}`}
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
    backgroundColor: colors.surfaceContainerLowest,
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
    color: colors.outline,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.primary,
    marginLeft: 4,
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cobalt,
  },
  availabilityButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.cobalt,
    marginLeft: 4,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.onSurface,
  },
  transferButtonDisabled: {
    borderColor: colors.outline + '40',
    opacity: 0.6,
  },
  transferButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.onSurface,
    marginLeft: 4,
  },
  transferButtonTextDisabled: {
    color: colors.outline,
  },
  transferHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.outline,
    marginTop: 8,
    marginHorizontal: 16,
    fontStyle: 'italic',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: Spacing.sm,
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
    color: colors.outline,
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
    color: colors.onSurface,
    flex: 1,
  },
  listItemDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.outline,
  },
});
