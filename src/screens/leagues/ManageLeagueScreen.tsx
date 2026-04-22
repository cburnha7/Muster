import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LeagueForm } from '../../components/league/LeagueForm';
import { DocumentUploadForm } from '../../components/league/DocumentUploadForm';
import { StrikeIndicator } from '../../components/league/StrikeIndicator';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormButton } from '../../components/forms/FormButton';

import { leagueService } from '../../services/api/LeagueService';
import { RosterStrikeData } from '../../services/api/LeagueService';
import { teamService } from '../../services/api/TeamService';
import { selectUser } from '../../store/slices/authSlice';
import {
  League,
  UpdateLeagueData,
  DocumentType,
  LeagueMembership,
} from '../../types/league';
import { Team } from '../../types';
import { fonts, useTheme } from '../../theme';

export const ManageLeagueScreen: React.FC = () => {
  const { colors } = useTheme();
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

  // Roster search and invitation state (private Team Leagues)
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<Team[]>([]);
  const [isSearchingRosters, setIsSearchingRosters] = useState(false);
  const [invitingRosterId, setInvitingRosterId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Strike data for the active season
  const [strikeData, setStrikeData] = useState<Map<string, number>>(new Map());

  // All leagues are now visible to all users
  const isPrivateLeague = false;

  // Get roster IDs already in the league (any status) to filter search results
  const existingRosterIds = members.map(m => m.memberId);

  const getInvitationStatus = useCallback(
    (rosterId: string): string | null => {
      const membership = members.find(
        m => m.memberId === rosterId && m.memberType === 'roster'
      );
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
      const message =
        err instanceof Error ? err.message : 'Failed to search rosters';
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
        const message =
          err instanceof Error ? err.message : 'Failed to send invitation';
        setInviteError(message);
      }
    } finally {
      setInvitingRosterId(null);
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
      } else {
        // Load strike data for the active season
        loadStrikes(data);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load league';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await leagueService.getMembers(leagueId, 1, 100, true);
      setMembers(response.data || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadStrikes = async (leagueData?: League | null) => {
    try {
      const target = leagueData ?? league;
      if (!target) return;

      // Find the active season for this league
      const seasons = (target as any).seasons as
        | Array<{ id: string; isActive: boolean }>
        | undefined;
      const activeSeason = seasons?.find(s => s.isActive);
      if (!activeSeason) return;

      const strikes = await leagueService.getSeasonStrikes(
        leagueId,
        activeSeason.id,
        user?.id
      );

      const map = new Map<string, number>();
      for (const s of strikes) {
        map.set(s.rosterId, s.strikeCount);
      }
      setStrikeData(map);
    } catch (err) {
      console.error('Failed to load strike data:', err);
    }
  };

  const handleUpdateLeague = async (data: UpdateLeagueData) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to update the league');
      return;
    }

    try {
      setIsUpdating(true);

      const updatedLeague = await leagueService.updateLeague(
        leagueId,
        data,
        user.id
      );
      setLeague(updatedLeague);

      (navigation as any).replace('LeaguesBrowser');
    } catch (error) {
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadDocument = async (
    file: File,
    documentType: DocumentType
  ) => {
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
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to remove roster'
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading && !league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
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
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
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
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
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
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
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
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Update League"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Edit League Info */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>League Information</Text>
          <LeagueForm
            initialData={league}
            onSubmit={handleUpdateLeague}
            isEdit={true}
            loading={isUpdating}
            initialRosters={members
              .filter(m => m.memberType === 'roster' && m.status === 'active')
              .map(m => ({
                id: m.memberId,
                name: (m as any).team?.name || 'Unknown Roster',
                sportType: (m as any).team?.sportType,
                memberCount:
                  (m as any).team?.playerCount ??
                  (m as any).team?._count?.members ??
                  0,
              }))}
            initialInvitedRosters={members
              .filter(m => m.memberType === 'roster' && m.status === 'pending')
              .map(m => ({
                id: m.memberId,
                name: (m as any).team?.name || 'Unknown Roster',
                sportType: (m as any).team?.sportType,
                memberCount:
                  (m as any).team?.playerCount ??
                  (m as any).team?._count?.members ??
                  0,
              }))}
          />
        </View>

        {/* Commissioner Team Management */}
        <TouchableOpacity
          style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}
          onPress={() =>
            (navigation as any).navigate('LeagueTeamManagement', { leagueId })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }, { borderBottomWidth: 0 }]}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Ionicons name="people" size={22} color={colors.cobalt} />
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
                  ]}
                >
                  Manage Teams
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: fonts.body,
                    color: colors.inkFaint,
                    marginTop: 2,
                  }}
                >
                  Create teams and assign coaches
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.inkFaint}
            />
          </View>
        </TouchableOpacity>

        {/* Manage Teams */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>League Rosters</Text>
            <Text style={[styles.memberCount, { color: colors.cobalt }]}>
              {members.length} {members.length === 1 ? 'roster' : 'rosters'}
            </Text>
          </View>

          {isLoadingMembers ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={24} />
            </View>
          ) : members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.inkFaint}
              />
              <Text style={[styles.emptyStateText, { color: colors.inkFaint }]}>
                No rosters have joined yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.inkFaint }]}>
                Rosters can join from the league details page
              </Text>
            </View>
          ) : (
            <View style={styles.teamsList}>
              {members.map(membership => (
                <View key={membership.id} style={[styles.teamItem, { backgroundColor: colors.bgSubtle }]}>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.ink }]}>
                      {(membership as any).team?.name || 'Unknown Roster'}
                    </Text>
                    <Text style={[styles.teamStats, { color: colors.inkFaint }]}>
                      {membership.matchesPlayed} matches • {membership.points}{' '}
                      points
                    </Text>
                    <StrikeIndicator
                      strikeCount={strikeData.get(membership.memberId) ?? 0}
                      rosterName={
                        (membership as any).team?.name || 'Unknown Roster'
                      }
                      onRemoveRoster={() =>
                        handleRemoveTeam(
                          membership.teamId,
                          (membership as any).team?.name || 'this roster'
                        )
                      }
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      handleRemoveTeam(
                        membership.teamId,
                        (membership as any).team?.name || 'this roster'
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={colors.heart}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Roster Search & Invitation — Private Leagues only */}
        {isPrivateLeague && (
          <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Add Rosters</Text>
            <Text style={[styles.sectionDescription, { color: colors.inkFaint }]}>
              Search for rosters by name and send league invitations
            </Text>

            <View style={styles.rosterSearchContainer}>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.searchInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.bgSubtle }]}
                  value={rosterSearchQuery}
                  onChangeText={text => {
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
                    (!rosterSearchQuery.trim() || isSearchingRosters) &&
                      styles.searchButtonDisabled,
                  ]}
                  onPress={handleSearchRosters}
                  disabled={!rosterSearchQuery.trim() || isSearchingRosters}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                >
                  {isSearchingRosters ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="search" size={20} color={colors.white} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Success feedback */}
              {inviteSuccess && (
                <View style={[styles.inviteSuccessContainer, { backgroundColor: colors.successLight }]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.cobalt}
                  />
                  <Text style={[styles.inviteSuccessText, { color: colors.cobalt }]}>{inviteSuccess}</Text>
                </View>
              )}

              {/* Error feedback */}
              {inviteError && (
                <View style={[styles.inviteErrorContainer, { backgroundColor: colors.errorLight }]}>
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={colors.heart}
                  />
                  <Text style={[styles.inviteErrorText, { color: colors.heart }]}>{inviteError}</Text>
                </View>
              )}

              {/* Search results */}
              {rosterSearchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {rosterSearchResults.map(roster => {
                    const status = getInvitationStatus(roster.id);
                    const isAlreadyInLeague = existingRosterIds.includes(
                      roster.id
                    );
                    const isInviting = invitingRosterId === roster.id;

                    return (
                      <View key={roster.id} style={[styles.searchResultItem, { backgroundColor: colors.bgSubtle }]}>
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultName, { color: colors.ink }]}>
                            {roster.name}
                          </Text>
                          {roster.sportType && (
                            <Text style={[styles.searchResultMeta, { color: colors.inkFaint }]}>
                              {roster.sportType} • {roster.members?.length ?? 0}{' '}
                              players
                            </Text>
                          )}
                        </View>

                        {status === 'pending' ? (
                          <View style={[styles.statusBadgePending, { backgroundColor: colors.goldLight }]}>
                            <Text style={[styles.statusBadgeText, { color: colors.ink }]}>Pending</Text>
                          </View>
                        ) : status === 'active' ? (
                          <View style={[styles.statusBadgeActive, { backgroundColor: colors.successLight }]}>
                            <Text style={[styles.statusBadgeTextActive, { color: colors.cobalt }]}>
                              Accepted
                            </Text>
                          </View>
                        ) : status === 'withdrawn' ? (
                          <View style={[styles.statusBadgeDeclined, { backgroundColor: colors.errorLight }]}>
                            <Text style={[styles.statusBadgeText, { color: colors.ink }]}>Declined</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.inviteButton,
                              isInviting && styles.inviteButtonDisabled,
                            ]}
                            onPress={() =>
                              handleInviteRoster(roster.id, roster.name)
                            }
                            disabled={isInviting || isAlreadyInLeague}
                            accessibilityRole="button"
                            accessibilityLabel={`Invite ${roster.name}`}
                          >
                            {isInviting ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.white}
                              />
                            ) : (
                              <Text style={[styles.inviteButtonText, { color: colors.white }]}>
                                Invite
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Empty search state */}
              {rosterSearchResults.length === 0 &&
                rosterSearchQuery.trim() &&
                !isSearchingRosters &&
                !inviteError && (
                  <Text style={[styles.noSearchResults, { color: colors.inkFaint }]}>
                    No rosters found matching "{rosterSearchQuery.trim()}"
                  </Text>
                )}
            </View>

            {/* Pending invitations from members list */}
            {members.filter(
              m => m.status === 'pending' && m.memberType === 'roster'
            ).length > 0 && (
              <View style={[styles.pendingInvitations, { borderTopColor: colors.border }]}>
                <Text style={[styles.pendingInvitationsTitle, { color: colors.ink }]}>
                  Pending Invitations
                </Text>
                {members
                  .filter(
                    m => m.status === 'pending' && m.memberType === 'roster'
                  )
                  .map(membership => (
                    <View
                      key={membership.id}
                      style={styles.pendingInvitationItem}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={colors.gold}
                      />
                      <Text style={[styles.pendingInvitationName, { color: colors.ink }]}>
                        {(membership as any).team?.name || 'Unknown Roster'}
                      </Text>
                      <View style={[styles.statusBadgePending, { backgroundColor: colors.goldLight }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.ink }]}>Pending</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Upload Documents */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Documents</Text>
          <Text style={[styles.sectionDescription, { color: colors.inkFaint }]}>
            Upload league rules, insurance policies, or other important
            documents
          </Text>
          <DocumentUploadForm
            onSubmit={handleUploadDocument}
            loading={isUpdating}
          />
        </View>

        {/* Delete League — only when not locked */}
        {league.lockedFromDeletion === false && (
          <View style={styles.deleteSection}>
            <FormButton
              title="Delete League"
              onPress={() =>
                (navigation as any).navigate('LeagueDeletionConfirm', {
                  leagueId,
                })
              }
              variant="danger"
              size="large"
              leftIcon="trash-outline"
            />
            <Text style={[styles.deleteHint, { color: colors.inkFaint }]}>
              This will permanently remove the league and issue any applicable
              refunds.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 20,
  },
  memberCount: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
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
    fontFamily: fonts.headingSemi,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
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
    borderRadius: 12,
    marginBottom: 8,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: fonts.headingSemi,
    marginBottom: 4,
  },
  teamStats: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  searchButton: {
    borderRadius: 9999,
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
    borderRadius: 8,
  },
  inviteSuccessText: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  inviteErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  inviteErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
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
  },
  searchResultMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  inviteButton: {
    borderRadius: 9999,
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
  },
  statusBadgePending: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeActive: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeDeclined: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noSearchResults: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  pendingInvitations: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 12,
  },
  pendingInvitationsTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
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
    flex: 1,
  },
  deleteSection: {
    padding: 16,
    marginBottom: 40,
  },
  deleteHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
});
