import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LeagueForm } from '../../components/league/LeagueForm';
import { DocumentUploadForm } from '../../components/league/DocumentUploadForm';
import { CertificationForm } from '../../components/league/CertificationForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { leagueService } from '../../services/api/LeagueService';
import { teamService } from '../../services/api/TeamService';
import { selectUser } from '../../store/slices/authSlice';
import { League, UpdateLeagueData, DocumentType, BoardMember, LeagueMembership, ConflictResult } from '../../types/league';
import { Team } from '../../types';
import { colors, fonts } from '../../theme';

export const ManageLeagueScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = (route.params as any) || {};
  const user = useSelector(selectUser);

  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Event scheduling state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventFacility, setEventFacility] = useState('');
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [conflictError, setConflictError] = useState<ConflictResult | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);

  // Roster search and invitation state (private Team Leagues)
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<Team[]>([]);
  const [isSearchingRosters, setIsSearchingRosters] = useState(false);
  const [invitingRosterId, setInvitingRosterId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const isTeamLeague = league?.leagueType === 'team';
  const isPrivateTeamLeague = isTeamLeague && league?.visibility === 'private';
  const activeRosters = members.filter((m) => m.status === 'active' && m.memberType === 'roster');

  // Get roster IDs already in the league (any status) to filter search results
  const existingRosterIds = members.map((m) => m.memberId);

  const getInvitationStatus = useCallback(
    (rosterId: string): string | null => {
      const membership = members.find((m) => m.memberId === rosterId && m.memberType === 'roster');
      if (!membership) return null;
      return membership.status;
    },
    [members]
  );

  const handleSearchRosters = async () => {
    const query = rosterSearchQuery.trim();
    if (!query) return;

    setIsSearchingRosters(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const result = await teamService.searchTeams(query);
      setRosterSearchResults(result.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search rosters';
      setInviteError(message);
      setRosterSearchResults([]);
    } finally {
      setIsSearchingRosters(false);
    }
  };

  const handleInviteRoster = async (rosterId: string, rosterName: string) => {
    if (!user?.id || !league) return;

    setInvitingRosterId(rosterId);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await leagueService.inviteRoster(leagueId, rosterId, user.id);
      setInviteSuccess(`Invitation sent to ${rosterName}`);
      // Refresh members to show updated invitation status
      loadMembers();
    } catch (err: any) {
      if (err?.status === 409) {
        setInviteError(`${rosterName} is already in this league`);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to send invitation';
        setInviteError(message);
      }
    } finally {
      setInvitingRosterId(null);
    }
  };

  const toggleRosterSelection = useCallback((memberId: string) => {
    setSelectedRosterIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
    setConflictError(null);
    setEventError(null);
  }, []);

  const handleCreateEvent = async () => {
    if (!user?.id || !league) return;

    // Validate required fields
    if (!eventTitle.trim()) {
      setEventError('Event title is required');
      return;
    }
    if (!eventStartTime.trim() || !eventEndTime.trim()) {
      setEventError('Start time and end time are required');
      return;
    }

    const startTime = new Date(eventStartTime);
    const endTime = new Date(eventEndTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      setEventError('Invalid date format. Use YYYY-MM-DDTHH:MM (e.g. 2025-03-15T14:00)');
      return;
    }
    if (endTime <= startTime) {
      setEventError('End time must be after start time');
      return;
    }

    // Team League: require minimum 2 rosters
    if (isTeamLeague && selectedRosterIds.length < 2) {
      setEventError('League events require at least 2 rosters');
      return;
    }

    setIsCreatingEvent(true);
    setConflictError(null);
    setEventError(null);

    try {
      // Check scheduling conflicts for Team Leagues
      if (isTeamLeague && selectedRosterIds.length > 0) {
        const conflicts = await leagueService.checkSchedulingConflicts(
          leagueId,
          selectedRosterIds,
          startTime,
          endTime
        );
        if (conflicts.hasConflicts) {
          setConflictError(conflicts);
          setIsCreatingEvent(false);
          return;
        }
      }

      await leagueService.createLeagueEvent(leagueId, {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        startTime,
        endTime,
        facilityId: eventFacility.trim() || undefined,
        rosterIds: isTeamLeague ? selectedRosterIds : undefined,
        userId: user.id,
      });

      Alert.alert('Success', 'League event created successfully!');

      // Reset form
      setEventTitle('');
      setEventDescription('');
      setEventStartTime('');
      setEventEndTime('');
      setEventFacility('');
      setSelectedRosterIds([]);
      setConflictError(null);
      setEventError(null);
    } catch (err: any) {
      if (err?.status === 409 && err?.conflicts) {
        setConflictError({ hasConflicts: true, conflicts: err.conflicts });
      } else {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        setEventError(message);
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };

  useEffect(() => {
    if (leagueId) {
      loadLeague();
      loadMembers();
    }
  }, [leagueId]);

  const loadLeague = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await leagueService.getLeagueById(leagueId);
      setLeague(data);

      // Verify user is the league operator
      if (user?.id && data.organizerId !== user.id) {
        setError('You do not have permission to manage this league');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await leagueService.getMembers(leagueId);
      setMembers(response.data || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleUpdateLeague = async (data: UpdateLeagueData) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to update the league');
      return;
    }

    try {
      setIsUpdating(true);

      const updatedLeague = await leagueService.updateLeague(leagueId, data, user.id);
      setLeague(updatedLeague);

      Alert.alert('Success', 'League updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to LeagueDetailsScreen with leagueType context
            (navigation as any).navigate('LeagueDetails', {
              leagueId,
              leagueType: updatedLeague.leagueType,
            });
          },
        },
      ]);
    } catch (error) {
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadDocument = async (file: File, documentType: DocumentType) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to upload documents');
      return;
    }

    try {
      await leagueService.uploadDocument(leagueId, file, documentType, user.id);

      Alert.alert('Success', 'Document uploaded successfully!');
      loadLeague();
    } catch (error) {
      throw error;
    }
  };

  const handleCertify = async (bylawsFile: File, boardMembers: BoardMember[]) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to certify the league');
      return;
    }

    try {
      await leagueService.certifyLeague(leagueId, bylawsFile, boardMembers, user.id);

      Alert.alert(
        'Success',
        'League certification submitted successfully!',
        [{ text: 'OK', onPress: () => loadLeague() }]
      );
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveTeam = (teamId: string, teamName: string) => {
    Alert.alert(
      'Remove Roster',
      `Are you sure you want to remove ${teamName} from this league?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              await leagueService.leaveLeague(leagueId, teamId, user.id);
              Alert.alert('Success', 'Roster removed from league');
              loadMembers();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove roster');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Update League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Update League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message={error} onRetry={loadLeague} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Update League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message="League not found" onRetry={loadLeague} />
      </View>
    );
  }

  // Check if user is the operator
  if (user?.id && league.organizerId !== user.id) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Update League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay 
          title="Access Denied"
          message="Only the league commissioner can manage this league" 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Update League"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Edit League Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Information</Text>
          <LeagueForm
            initialData={league}
            onSubmit={handleUpdateLeague}
            isEdit={true}
            loading={isUpdating}
          />
        </View>

        {/* Manage Teams */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>League Rosters</Text>
            <Text style={styles.memberCount}>
              {members.length} {members.length === 1 ? 'roster' : 'rosters'}
            </Text>
          </View>
          
          {isLoadingMembers ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="small" message="Loading rosters..." />
            </View>
          ) : members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.inkFaint} />
              <Text style={styles.emptyStateText}>No rosters have joined yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Rosters can join from the league details page
              </Text>
            </View>
          ) : (
            <View style={styles.teamsList}>
              {members.map((membership) => (
                <View key={membership.id} style={styles.teamItem}>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>
                      {(membership as any).team?.name || 'Unknown Roster'}
                    </Text>
                    <Text style={styles.teamStats}>
                      {membership.matchesPlayed} matches • {membership.points} points
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveTeam(
                      membership.teamId,
                      (membership as any).team?.name || 'this roster'
                    )}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.track} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Roster Search & Invitation — Private Team Leagues only */}
        {isPrivateTeamLeague && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Rosters</Text>
            <Text style={styles.sectionDescription}>
              Search for rosters by name and send league invitations
            </Text>

            <View style={styles.rosterSearchContainer}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={rosterSearchQuery}
                  onChangeText={(text) => {
                    setRosterSearchQuery(text);
                    setInviteError(null);
                    setInviteSuccess(null);
                  }}
                  placeholder="Search rosters by name"
                  placeholderTextColor={colors.inkFaint}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchRosters}
                  accessibilityLabel="Search rosters by name"
                />
                <TouchableOpacity
                  style={[
                    styles.searchButton,
                    (!rosterSearchQuery.trim() || isSearchingRosters) && styles.searchButtonDisabled,
                  ]}
                  onPress={handleSearchRosters}
                  disabled={!rosterSearchQuery.trim() || isSearchingRosters}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                >
                  {isSearchingRosters ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Success feedback */}
              {inviteSuccess && (
                <View style={styles.inviteSuccessContainer}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.grass} />
                  <Text style={styles.inviteSuccessText}>{inviteSuccess}</Text>
                </View>
              )}

              {/* Error feedback */}
              {inviteError && (
                <View style={styles.inviteErrorContainer}>
                  <Ionicons name="alert-circle" size={18} color={colors.track} />
                  <Text style={styles.inviteErrorText}>{inviteError}</Text>
                </View>
              )}

              {/* Search results */}
              {rosterSearchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {rosterSearchResults.map((roster) => {
                    const status = getInvitationStatus(roster.id);
                    const isAlreadyInLeague = existingRosterIds.includes(roster.id);
                    const isInviting = invitingRosterId === roster.id;

                    return (
                      <View key={roster.id} style={styles.searchResultItem}>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{roster.name}</Text>
                          {roster.sportType && (
                            <Text style={styles.searchResultMeta}>
                              {roster.sportType} • {roster.members?.length ?? 0} players
                            </Text>
                          )}
                        </View>

                        {status === 'pending' ? (
                          <View style={styles.statusBadgePending}>
                            <Text style={styles.statusBadgeText}>Pending</Text>
                          </View>
                        ) : status === 'active' ? (
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusBadgeTextActive}>Accepted</Text>
                          </View>
                        ) : status === 'withdrawn' ? (
                          <View style={styles.statusBadgeDeclined}>
                            <Text style={styles.statusBadgeText}>Declined</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.inviteButton,
                              isInviting && styles.inviteButtonDisabled,
                            ]}
                            onPress={() => handleInviteRoster(roster.id, roster.name)}
                            disabled={isInviting || isAlreadyInLeague}
                            accessibilityRole="button"
                            accessibilityLabel={`Invite ${roster.name}`}
                          >
                            {isInviting ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.inviteButtonText}>Invite</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Empty search state */}
              {rosterSearchResults.length === 0 && rosterSearchQuery.trim() && !isSearchingRosters && !inviteError && (
                <Text style={styles.noSearchResults}>
                  No rosters found matching "{rosterSearchQuery.trim()}"
                </Text>
              )}
            </View>

            {/* Pending invitations from members list */}
            {members.filter((m) => m.status === 'pending' && m.memberType === 'roster').length > 0 && (
              <View style={styles.pendingInvitations}>
                <Text style={styles.pendingInvitationsTitle}>Pending Invitations</Text>
                {members
                  .filter((m) => m.status === 'pending' && m.memberType === 'roster')
                  .map((membership) => (
                    <View key={membership.id} style={styles.pendingInvitationItem}>
                      <Ionicons name="time-outline" size={18} color={colors.court} />
                      <Text style={styles.pendingInvitationName}>
                        {(membership as any).team?.name || 'Unknown Roster'}
                      </Text>
                      <View style={styles.statusBadgePending}>
                        <Text style={styles.statusBadgeText}>Pending</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Event Scheduling */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Scheduling</Text>
          <Text style={styles.sectionDescription}>
            {isTeamLeague
              ? 'Create league events and assign rosters'
              : 'Create open events for league players'}
          </Text>

          <View style={styles.eventForm}>
            <Text style={styles.inputLabel}>Event Title</Text>
            <TextInput
              style={styles.textInput}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Enter event title"
              placeholderTextColor={colors.inkFaint}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={eventDescription}
              onChangeText={setEventDescription}
              placeholder="Enter event description"
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Start Time</Text>
            <TextInput
              style={styles.textInput}
              value={eventStartTime}
              onChangeText={setEventStartTime}
              placeholder="YYYY-MM-DDTHH:MM"
              placeholderTextColor={colors.inkFaint}
            />

            <Text style={styles.inputLabel}>End Time</Text>
            <TextInput
              style={styles.textInput}
              value={eventEndTime}
              onChangeText={setEventEndTime}
              placeholder="YYYY-MM-DDTHH:MM"
              placeholderTextColor={colors.inkFaint}
            />

            <Text style={styles.inputLabel}>Facility (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={eventFacility}
              onChangeText={setEventFacility}
              placeholder="Enter facility name or ID"
              placeholderTextColor={colors.inkFaint}
            />

            {/* Roster Assignment — Team League only */}
            {isTeamLeague && (
              <View style={styles.rosterAssignment}>
                <Text style={styles.inputLabel}>
                  Assign Rosters (minimum 2)
                </Text>
                {activeRosters.length === 0 ? (
                  <Text style={styles.noRostersText}>
                    No active rosters in this league
                  </Text>
                ) : (
                  activeRosters.map((membership) => {
                    const isSelected = selectedRosterIds.includes(membership.memberId);
                    return (
                      <TouchableOpacity
                        key={membership.id}
                        style={[
                          styles.rosterCheckItem,
                          isSelected && styles.rosterCheckItemSelected,
                        ]}
                        onPress={() => toggleRosterSelection(membership.memberId)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`${(membership as any).team?.name || 'Roster'}`}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? colors.grass : colors.inkFaint}
                        />
                        <Text
                          style={[
                            styles.rosterCheckName,
                            isSelected && styles.rosterCheckNameSelected,
                          ]}
                        >
                          {(membership as any).team?.name || 'Unknown Roster'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
                {selectedRosterIds.length > 0 && selectedRosterIds.length < 2 && (
                  <Text style={styles.rosterHint}>
                    Select at least 2 rosters for a league event
                  </Text>
                )}
              </View>
            )}

            {/* Conflict Error Display */}
            {conflictError?.hasConflicts && (
              <View style={styles.conflictContainer}>
                <View style={styles.conflictHeader}>
                  <Ionicons name="warning" size={20} color={colors.track} />
                  <Text style={styles.conflictTitle}>Scheduling Conflict</Text>
                </View>
                {conflictError.conflicts.map((conflict, index) => (
                  <View key={index} style={styles.conflictItem}>
                    <Text style={styles.conflictRoster}>
                      {conflict.rosterName}
                    </Text>
                    <Text style={styles.conflictDetail}>
                      Already assigned to "{conflict.conflictingEventTitle}" at{' '}
                      {new Date(conflict.startTime).toLocaleString()} –{' '}
                      {new Date(conflict.endTime).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* General Event Error */}
            {eventError && (
              <View style={styles.eventErrorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.track} />
                <Text style={styles.eventErrorText}>{eventError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.createEventButton,
                isCreatingEvent && styles.createEventButtonDisabled,
              ]}
              onPress={handleCreateEvent}
              disabled={isCreatingEvent}
              accessibilityRole="button"
              accessibilityLabel="Create Event"
            >
              {isCreatingEvent ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.createEventButtonText}>Create Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Upload Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <Text style={styles.sectionDescription}>
            Upload league rules, schedules, or other important documents
          </Text>
          <DocumentUploadForm
            onSubmit={handleUploadDocument}
            loading={isUpdating}
          />
        </View>

        {/* Certification */}
        {!league.isCertified && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>League Certification</Text>
            <Text style={styles.sectionDescription}>
              Certify your league to receive a certification badge and increase visibility
            </Text>
            <CertificationForm
              onSubmit={handleCertify}
              loading={isUpdating}
            />
          </View>
        )}

        {league.isCertified && (
          <View style={styles.section}>
            <View style={styles.certifiedBadge}>
              <Ionicons name="checkmark-circle" size={48} color={colors.grass} />
              <Text style={styles.certifiedTitle}>League Certified</Text>
              <Text style={styles.certifiedText}>
                This league has been certified with official documentation
              </Text>
              {league.certifiedAt && (
                <Text style={styles.certifiedDate}>
                  Certified on {new Date(league.certifiedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.inkFaint,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 20,
  },
  memberCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grass,
  },
  loadingContainer: {
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inkFaint,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 8,
    textAlign: 'center',
  },
  teamsList: {
    padding: 16,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  teamStats: {
    fontSize: 14,
    color: colors.inkFaint,
  },
  removeButton: {
    padding: 8,
  },
  certifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    margin: 16,
    backgroundColor: '#F0F9F4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.grass,
  },
  certifiedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.grass,
    marginTop: 16,
    marginBottom: 8,
  },
  certifiedText: {
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
  certifiedDate: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 8,
  },
  // Event Scheduling styles
  eventForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inputLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.ink,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  rosterAssignment: {
    marginTop: 8,
  },
  noRostersText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    paddingVertical: 8,
  },
  rosterCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#F8F9FA',
  },
  rosterCheckItemSelected: {
    backgroundColor: '#EDF7F0',
    borderWidth: 1,
    borderColor: colors.grassLight,
  },
  rosterCheckName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    marginLeft: 10,
  },
  rosterCheckNameSelected: {
    fontFamily: fonts.semibold,
    color: colors.grass,
  },
  rosterHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.court,
    marginTop: 6,
  },
  conflictContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.track,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.track,
    marginLeft: 6,
  },
  conflictItem: {
    marginTop: 6,
    paddingLeft: 26,
  },
  conflictRoster: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  conflictDetail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  eventErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  eventErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.track,
    marginLeft: 6,
    flex: 1,
  },
  createEventButton: {
    marginTop: 16,
    backgroundColor: colors.grass,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createEventButtonDisabled: {
    opacity: 0.6,
  },
  createEventButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Roster search & invitation styles
  rosterSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: '#FAFAFA',
  },
  searchButton: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  inviteSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#EDF7F0',
    borderRadius: 8,
  },
  inviteSuccessText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.grass,
    marginLeft: 6,
    flex: 1,
  },
  inviteErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  inviteErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.track,
    marginLeft: 6,
    flex: 1,
  },
  searchResults: {
    marginTop: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 6,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  searchResultMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },
  statusBadgePending: {
    backgroundColor: colors.courtLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#EDF7F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeDeclined: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.grass,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noSearchResults: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  pendingInvitations: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
    paddingTop: 12,
  },
  pendingInvitationsTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pendingInvitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  pendingInvitationName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
});
