import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { facilityService } from '../../services/api/FacilityService';
import { eventService } from '../../services/api/EventService';
import { Facility, Event, FacilityWithVerification } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { MyReservationsSection } from '../../components/profile/MyReservationsSection';
import { colors, Spacing, TextStyles } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();
  const [myGrounds, setMyGrounds] = useState<Facility[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingGrounds, setLoadingGrounds] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [groundsExpanded, setGroundsExpanded] = useState(true);
  const [eventsExpanded, setEventsExpanded] = useState(true);

  useEffect(() => {
    if (authUser) {
      loadProfile();
    }
  }, [authUser]);

  const loadProfile = async () => {
    if (!authUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load owned grounds and events
      loadMyGrounds(authUser.id);
      loadMyEvents(authUser.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMyGrounds = async (userId: string) => {
    try {
      setLoadingGrounds(true);
      console.log('🏟️ ProfileScreen: Loading grounds for user:', userId);
      const response = await facilityService.getFacilitiesByOwner(userId, {
        page: 1,
        limit: 10,
      });
      console.log('🏟️ ProfileScreen: Received grounds:', response);
      console.log('🏟️ ProfileScreen: Number of grounds:', response.data?.length || 0);
      setMyGrounds(response.data);
    } catch (err: any) {
      console.error('Failed to load owned grounds:', err);
    } finally {
      setLoadingGrounds(false);
    }
  };

  const loadMyEvents = async (userId: string) => {
    try {
      setLoadingEvents(true);
      const response = await eventService.getEventsByOrganizer(userId, {}, {
        page: 1,
        limit: 10,
      });
      setMyEvents(response.data);
    } catch (err: any) {
      console.error('Failed to load organized events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleEditProfile = () => {
    (navigation as any).navigate('EditProfile');
  };

  const handleSettings = () => {
    (navigation as any).navigate('Settings');
  };

  const handleNotificationPreferences = () => {
    (navigation as any).navigate('NotificationPreferences');
  };

  const handleLogout = async () => {
    try {
      console.log('Logout button pressed');
      await logout();
      
      // Force navigation to auth screen
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleFacilityPress = (facility: Facility) => {
    // If user is the owner, navigate to EditFacility screen
    if (authUser && facility.ownerId === authUser.id) {
      (navigation as any).navigate('Facilities', {
        screen: 'EditFacility',
        params: { facilityId: facility.id }
      });
    } else {
      // Otherwise, navigate to FacilityDetails screen
      (navigation as any).navigate('Facilities', {
        screen: 'FacilityDetails',
        params: { facilityId: facility.id }
      });
    }
  };

  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const handleCreateGround = () => {
    (navigation as any).navigate('CreateFacility');
  };

  const handleCreateEvent = () => {
    (navigation as any).navigate('CreateEvent');
  };

  const getEventStatusColor = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    if (event.status === 'cancelled') return colors.track;
    if (startTime <= now && endTime >= now) return colors.court;
    return colors.grass;
  };

  const getEventStatusText = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    if (event.status === 'cancelled') return 'Cancelled';
    if (startTime <= now && endTime >= now) return 'In Progress';
    return 'Upcoming';
  };

  const getVerificationStatusColor = (facility: Facility) => {
    const facilityWithVerification = facility as FacilityWithVerification;
    if (!facilityWithVerification.isVerified) return colors.soft;
    return colors.grass;
  };

  const getVerificationStatusText = (facility: Facility) => {
    const facilityWithVerification = facility as FacilityWithVerification;
    if (!facilityWithVerification.isVerified) return 'Pending Verification';
    return 'Verified';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadProfile} />;
  }

  if (!authUser) {
    return <ErrorDisplay message="User not found" onRetry={loadProfile} />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {authUser.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {authUser.firstName?.[0]?.toUpperCase() || 'U'}
                {authUser.lastName?.[0]?.toUpperCase() || ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>
          {authUser.firstName} {authUser.lastName}
        </Text>
        <Text style={styles.email}>{authUser.email}</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* My Reservations Section */}
      {authUser.id && <MyReservationsSection userId={authUser.id} />}

      {/* My Grounds Section */}
      {(myGrounds.length > 0 || loadingGrounds) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setGroundsExpanded(!groundsExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>My Grounds</Text>
              {myGrounds.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{myGrounds.length}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={groundsExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.soft}
            />
          </TouchableOpacity>
          
          {groundsExpanded && (
            <>
              {loadingGrounds ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.grass} />
                </View>
              ) : (
                <>
                  {myGrounds.map((facility) => (
                    <TouchableOpacity
                      key={facility.id}
                      style={styles.compactCard}
                      onPress={() => handleFacilityPress(facility)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.compactCardContent}>
                        <View style={styles.compactCardHeader}>
                          <Ionicons name="location" size={20} color={colors.grass} />
                          <Text style={styles.compactCardTitle} numberOfLines={1}>
                            {facility.name}
                          </Text>
                        </View>
                        <Text style={styles.compactCardSubtitle} numberOfLines={1}>
                          {facility.city}, {facility.state}
                        </Text>
                        <View style={styles.compactCardFooter}>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getVerificationStatusColor(facility) + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: getVerificationStatusColor(facility) },
                              ]}
                            >
                              {getVerificationStatusText(facility)}
                            </Text>
                          </View>
                          {facility.rating > 0 && (
                            <View style={styles.ratingContainer}>
                              <Ionicons name="star" size={14} color={colors.court} />
                              <Text style={styles.ratingText}>{facility.rating.toFixed(1)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.soft} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* My Events Section */}
      {(myEvents.length > 0 || loadingEvents) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setEventsExpanded(!eventsExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>My Events</Text>
              {myEvents.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{myEvents.length}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={eventsExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.soft}
            />
          </TouchableOpacity>
          
          {eventsExpanded && (
            <>
              {loadingEvents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.grass} />
                </View>
              ) : (
                <>
                  {myEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.compactCard}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.compactCardContent}>
                        <View style={styles.compactCardHeader}>
                          <Ionicons name="calendar" size={20} color={colors.grass} />
                          <Text style={styles.compactCardTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                        </View>
                        <Text style={styles.compactCardSubtitle} numberOfLines={1}>
                          {new Date(event.startTime).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                        <View style={styles.compactCardFooter}>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getEventStatusColor(event) + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: getEventStatusColor(event) },
                              ]}
                            >
                              {getEventStatusText(event)}
                            </Text>
                          </View>
                          <Text style={styles.participantsText}>
                            {event.currentParticipants}/{event.maxParticipants} joined
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.soft} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate('UserStats')}
        >
          <Text style={styles.menuItemText}>Statistics & Achievements</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
          <Text style={styles.menuItemText}>Settings</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleNotificationPreferences}>
          <Text style={styles.menuItemText}>Notification Preferences</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate('BookingHistory')}
        >
          <Text style={styles.menuItemText}>Booking History</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutMenuItem]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.track} />
          <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Preferred Sports - Commented out until User type includes preferredSports */}
      {/* {authUser.preferredSports && authUser.preferredSports.length > 0 && (
        <View style={styles.sportsContainer}>
          <Text style={styles.sectionTitle}>Preferred Sports</Text>
          <View style={styles.sportsList}>
            {authUser.preferredSports.map((sport: string, index: number) => (
              <View key={index} style={styles.sportTag}>
                <Text style={styles.sportTagText}>{sport}</Text>
              </View>
            ))}
          </View>
        </View>
      )} */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileImageContainer: {
    marginBottom: Spacing.lg,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 36,
    color: colors.chalk,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  editButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: colors.chalk,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  countBadge: {
    backgroundColor: colors.grass + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.sm,
  },
  countBadgeText: {
    fontSize: 11,
    color: colors.grass,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 16,
    color: colors.grass,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  compactCardContent: {
    flex: 1,
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  compactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  compactCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: Spacing.sm,
  },
  compactCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
    fontWeight: '600',
  },
  participantsText: {
    fontSize: 12,
    color: '#666',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#999',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
    gap: Spacing.sm,
  },
  logoutText: {
    color: colors.track,
    flex: 1,
  },
  sportsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sportTag: {
    backgroundColor: colors.grass + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  sportTagText: {
    fontSize: 14,
    color: colors.grass,
    fontWeight: '500',
  },
});