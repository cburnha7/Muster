import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormButton } from '../../components/forms/FormButton';
import { AddMemberSearch } from '../../components/teams/AddMemberSearch';
import { teamService } from '../../services/api/TeamService';
import { leagueService } from '../../services/api/LeagueService';
import {
  setSelectedTeam,
  updateTeam,
  removeTeam,
  joinTeam as joinTeamAction,
  leaveTeam as leaveTeamAction,
  removeTeamMember,
  updateTeamMemberRole,
} from '../../store/slices/teamsSlice';
import { selectSelectedTeam, selectUserTeams } from '../../store/slices/teamsSlice';
import { selectUser } from '../../store/slices/authSlice';
import { Team, TeamMember, TeamRole, MemberStatus, User } from '../../types';
import { League } from '../../types/league';
import { colors } from '../../theme';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface TeamDetailsScreenProps {
  route: {
    params: {
      teamId: string;
    };
  };
}

export function TeamDetailsScreen({ route }: TeamDetailsScreenProps): JSX.Element {
  const { teamId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const selectedTeam = useSelector(selectSelectedTeam);
  const userTeams = useSelector(selectUserTeams);
  const currentUser = useSelector(selectUser);

  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const isUserMember = userTeams.some(t => t.id === teamId);
  // Check if user exists in the roster's member list (covers invited/added players)
  const isInRosterMembers = team?.members.some(m => m.userId === currentUser?.id) ?? false;
  const userMember = team?.members.find(m => m.userId === currentUser?.id && m.status === MemberStatus.ACTIVE);
  const isUserCaptain = userMember?.role === TeamRole.CAPTAIN;
  const isUserCoCaptain = userMember?.role === TeamRole.CO_CAPTAIN;
  const canManageTeam = isUserCaptain || isUserCoCaptain;
  // Show Join Up only if: public roster, OR user is already in the member list (invited by captain)
  const canSeeJoinButton = !isUserMember && !isInRosterMembers ? (team?.isPublic ?? false) : false;

  useEffect(() => {
    loadTeamDetails();
    loadTeamLeagues();
    loadTeamEvents();
  }, [teamId]);

  const loadTeamDetails = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      const teamData = await teamService.getTeam(teamId);
      setTeam(teamData);
      dispatch(setSelectedTeam(teamData));
    } catch (err: any) {
      console.error('Error loading team details:', err);
      setError(err.message || 'Failed to load team details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamLeagues = async () => {
    try {
      setIsLoadingLeagues(true);
      const teamLeagues = await teamService.getTeamLeagues(teamId);
      setLeagues(teamLeagues);
    } catch (err: any) {
      console.error('Error loading team leagues:', err);
      setLeagues([]);
    } finally {
      setIsLoadingLeagues(false);
    }
  };

  const loadTeamEvents = async () => {
    try {
      setIsLoadingEvents(true);
      const events = await teamService.getTeamEvents(teamId);
      setUpcomingEvents(Array.isArray(events) ? events : []);
    } catch (err: any) {
      console.error('Error loading team events:', err);
      setUpcomingEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!team) return;

    Alert.alert(
      'Join Roster',
      `Do you want to join ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Up',
          onPress: async () => {
            try {
              setIsJoining(true);
              await teamService.joinTeam(teamId);
              const updatedTeam = await teamService.getTeam(teamId);
              setTeam(updatedTeam);
              dispatch(joinTeamAction(updatedTeam));
              Alert.alert('Success', 'You have joined the roster!');
            } catch (err: any) {
              console.error('Error joining roster:', err);
              Alert.alert('Error', err.message || 'Failed to join roster');
            } finally {
              setIsJoining(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveTeam = async () => {
    if (!team) return;

    Alert.alert(
      'Leave Roster',
      `Are you sure you want to leave ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Out",
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeaving(true);
              await teamService.leaveTeam(teamId);
              dispatch(leaveTeamAction(teamId));
              Alert.alert('Success', 'You have left the roster', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              console.error('Error leaving roster:', err);
              Alert.alert('Error', err.message || 'Failed to leave roster');
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  const handleEditTeam = () => {
    navigation.goBack();
  };

  const handleDeleteTeam = () => {
    if (!team) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteTeam = async () => {
    try {
      await teamService.deleteTeam(teamId);
      dispatch(removeTeam(teamId));
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (err: any) {
      console.error('Error deleting roster:', err);
      setShowDeleteModal(false);
      Alert.alert('Error', err.message || 'Failed to delete roster');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team) return;

    Alert.alert(
      'Remove Player',
      `Remove ${member.user?.firstName || 'this player'} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamService.removeFromTeam(teamId, member.userId);
              dispatch(removeTeamMember({ teamId, userId: member.userId }));
              await loadTeamDetails(false); // Silent refresh
              Alert.alert('Success', 'Player removed from roster');
            } catch (err: any) {
              console.error('Error removing member:', err);
              Alert.alert('Error', err.message || 'Failed to remove player');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (member: TeamMember) => {
    if (!team) return;

    const roleOptions = [
      { text: 'Cancel', style: 'cancel' as const },
      {
        text: 'Make Co-Manager',
        onPress: () => updateMemberRole(member, TeamRole.CO_CAPTAIN),
      },
      {
        text: 'Make Player',
        onPress: () => updateMemberRole(member, TeamRole.MEMBER),
      },
    ];

    Alert.alert('Change Role', 'Select new role:', roleOptions);
  };

  const updateMemberRole = async (member: TeamMember, newRole: TeamRole) => {
    try {
      await teamService.updateMemberRole(teamId, member.userId, newRole);
      dispatch(updateTeamMemberRole({ teamId, userId: member.userId, role: newRole }));
      await loadTeamDetails(false);
      Alert.alert('Success', 'Player role updated');
    } catch (err: any) {
      console.error('Error updating member role:', err);
      Alert.alert('Error', err.message || 'Failed to update player role');
    }
  };

  const handleAddMemberDirectly = async (user: User) => {
    if (!team) return;

    try {
      await teamService.addMemberDirectly(teamId, user.id);
      await loadTeamDetails(false); // Silent refresh to update member list
      Alert.alert(
        'Player Added',
        `${user.firstName} ${user.lastName} has been added to the roster and will receive a notification.`
      );
    } catch (err: any) {
      console.error('Error adding player:', err);
      Alert.alert('Error', err.message || 'Failed to add player to roster');
      throw err; // Re-throw to let AddMemberSearch handle it
    }
  };

  const renderMember = (member: TeamMember) => {
    const isCaptain = member.role === TeamRole.CAPTAIN;
    const isCoCaptain = member.role === TeamRole.CO_CAPTAIN;
    const isPending = member.status === MemberStatus.PENDING;

    return (
      <View key={member.userId} style={styles.memberItem}>
        <View style={styles.memberInfo}>
          {member.user?.profileImage ? (
            <Image
              source={{ uri: member.user.profileImage }}
              style={styles.memberAvatar}
            />
          ) : (
            <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
              <Text style={styles.memberAvatarText}>
                {member.user?.firstName?.[0] || '?'}
              </Text>
            </View>
          )}
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {member.user?.firstName} {member.user?.lastName}
            </Text>
            <Text style={styles.memberRole}>
              {isPending ? '⏳ Pending' : isCaptain ? '👑 Manager' : isCoCaptain ? '⭐ Co-Manager' : 'Player'}
            </Text>
          </View>
        </View>

        {canManageTeam && !isCaptain && (
          <View style={styles.memberActions}>
            {!isPending && (
              <TouchableOpacity
                style={styles.memberActionButton}
                onPress={() => handleChangeRole(member)}
              >
                <Text style={styles.memberActionText}>Role</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.memberActionButton, styles.memberActionButtonDanger]}
              onPress={() => handleRemoveMember(member)}
            >
              <Text style={[styles.memberActionText, styles.memberActionTextDanger]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const handleNavigateToLeague = (leagueId: string) => {
    (navigation as any).navigate('Leagues', {
      screen: 'LeagueDetails',
      params: { leagueId },
    });
  };

  const handleNavigateToEvent = (eventId: string) => {
    (navigation as any).navigate('Events', {
      screen: 'EventDetails',
      params: { eventId },
    });
  };

  const formatLeagueDate = (date?: Date | string) => {
    if (!date) return 'TBD';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderLeagueCard = (league: League) => {
    return (
      <TouchableOpacity
        key={league.id}
        style={styles.leagueCard}
        onPress={() => handleNavigateToLeague(league.id)}
      >
        <View style={styles.leagueCardHeader}>
          <View style={styles.leagueCardTitleRow}>
            <Text style={styles.leagueCardTitle}>{league.name}</Text>
          </View>
          <Text style={styles.leagueCardSeason}>
            {league.seasonName || `${formatLeagueDate(league.startDate)} - ${formatLeagueDate(league.endDate)}`}
          </Text>
        </View>
        <View style={styles.leagueCardFooter}>
          <Text style={styles.leagueCardMeta}>🏀 {league.sportType}</Text>
          <Text style={[
            styles.leagueCardStatus,
            { color: league.isActive ? colors.grass : colors.soft }
          ]}>
            {league.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Roster Details" showBack onBackPress={() => navigation.goBack()} />
        <LoadingSpinner message="Loading roster..." />
      </View>
    );
  }

  if (error || !team) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Roster Details" showBack onBackPress={() => navigation.goBack()} />
        <ErrorDisplay
          message={error || 'Roster not found'}
          onRetry={loadTeamDetails}
        />
      </View>
    );
  }

  const activeMembers = team.members.filter(m => m.status === MemberStatus.ACTIVE);
  const pendingMembers = team.members.filter(m => m.status === MemberStatus.PENDING);
  const availableSlots = team.maxMembers - activeMembers.length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={team.name}
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={
          canManageTeam
            ? {
                icon: 'edit',
                onPress: handleEditTeam,
              }
            : undefined
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Team Header */}
        <View style={styles.header}>
          {team.logo ? (
            <Image source={{ uri: team.logo }} style={styles.teamLogo} />
          ) : (
            <View style={[styles.teamLogo, styles.teamLogoPlaceholder]}>
              <Text style={styles.teamLogoText}>{team.name[0]}</Text>
            </View>
          )}

          <Text style={styles.teamName}>{team.name}</Text>
          
          <View style={styles.teamMeta}>
            <Text style={styles.teamMetaItem}>🏀 {team.sportType}</Text>
            <Text style={styles.teamMetaItem}>📊 {team.skillLevel}</Text>
            <Text style={styles.teamMetaItem}>
              👥 {activeMembers.length}/{team.maxMembers}
            </Text>
          </View>

          {team.description && (
            <Text style={styles.teamDescription}>{team.description}</Text>
          )}
        </View>

        {/* Team Stats */}
        {team.stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Roster Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats?.gamesPlayed || 0}</Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats?.gamesWon || 0}</Text>
                <Text style={styles.statLabel}>Wins</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{team.stats?.gamesLost || 0}</Text>
                <Text style={styles.statLabel}>Losses</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {team.stats?.winRate ? (team.stats.winRate * 100).toFixed(0) : 0}%
                </Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => Alert.alert('Roster Stats', 'Detailed statistics coming soon')}
            >
              <Text style={styles.viewMoreText}>View Detailed Statistics →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Members Section */}
        <View style={styles.membersContainer}>
          {/* Invites List — pending members */}
          {pendingMembers.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Invites ({pendingMembers.length})
                </Text>
              </View>
              {pendingMembers.map(renderMember)}
            </>
          )}

          {/* Add Member Search - Only for private rosters with owner/admin access */}
          {canManageTeam && availableSlots > 0 && (
            <View style={styles.addMemberSection}>
              <View style={styles.addMemberHeader}>
                <Text style={styles.addMemberTitle}>Invites</Text>
                {!team.isPublic && (
                  <View style={styles.privateBadge}>
                    <Text style={styles.privateBadgeText}>🔒 Private</Text>
                  </View>
                )}
              </View>
              <Text style={styles.addMemberDescription}>
                Search for existing users and add them to your roster. They will receive a notification.
              </Text>
              <AddMemberSearch
                onAddMember={handleAddMemberDirectly}
                existingMemberIds={[...activeMembers, ...pendingMembers].map(m => m.userId)}
              />
            </View>
          )}

          {/* Players List — active members */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Players ({activeMembers.length}/{team.maxMembers})
            </Text>
            {availableSlots > 0 && (
              <Text style={styles.availableSlots}>{availableSlots} slots available</Text>
            )}
          </View>

          {activeMembers.length > 0 ? (
            activeMembers.map(renderMember)
          ) : (
            <Text style={styles.emptyPlayersText}>No players have joined yet</Text>
          )}
        </View>

        {/* Leagues Section */}
        <View style={styles.leaguesContainer}>
          <Text style={styles.sectionTitle}>
            Leagues {leagues.length > 0 && `(${leagues.length})`}
          </Text>
          
          {isLoadingLeagues ? (
            <View style={styles.leaguesLoading}>
              <Text style={styles.leaguesLoadingText}>Loading leagues...</Text>
            </View>
          ) : leagues.length > 0 ? (
            <View style={styles.leaguesList}>
              {leagues.map(renderLeagueCard)}
            </View>
          ) : (
            <View style={styles.noLeagues}>
              <Text style={styles.noLeaguesText}>
                This roster is not participating in any leagues yet.
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming Events Section */}
        {(isUserMember || isInRosterMembers) && (
          <View style={styles.eventsContainer}>
            <Text style={styles.sectionTitle}>
              Upcoming Events {upcomingEvents.length > 0 && `(${upcomingEvents.length})`}
            </Text>

            {isLoadingEvents ? (
              <View style={styles.eventsLoading}>
                <Text style={styles.eventsLoadingText}>Loading events...</Text>
              </View>
            ) : upcomingEvents.length > 0 ? (
              <View style={styles.eventsList}>
                {upcomingEvents.map((event) => {
                  const startDate = new Date(event.startTime);
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => handleNavigateToEvent(event.id)}
                    >
                      <View style={styles.eventCardDate}>
                        <Text style={styles.eventCardMonth}>
                          {startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </Text>
                        <Text style={styles.eventCardDay}>
                          {startDate.getDate()}
                        </Text>
                      </View>
                      <View style={styles.eventCardInfo}>
                        <Text style={styles.eventCardTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.eventCardTime}>
                          {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                        {event.facility && (
                          <Text style={styles.eventCardLocation} numberOfLines={1}>
                            📍 {event.facility.name}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.eventCardChevron}>›</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noEvents}>
                <Text style={styles.noEventsText}>
                  No upcoming events for this roster.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canSeeJoinButton && availableSlots > 0 && (
            <FormButton
              title="Join Up"
              onPress={handleJoinTeam}
              disabled={isJoining}
            />
          )}

          {isUserMember && !isUserCaptain && (
            <FormButton
              title="Leave Roster"
              onPress={handleLeaveTeam}
              variant="secondary"
              disabled={isLeaving}
            />
          )}

          {isUserCaptain && (
            <>
              <FormButton
                title="Update Roster"
                onPress={handleEditTeam}
              />
            </>
          )}

          {/* Delete visible to anyone temporarily for cleanup */}
          <FormButton
            title="Delete Roster"
            onPress={handleDeleteTeam}
            variant="danger"
          />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Roster"
        message={`Are you sure you want to delete ${team.name}? This action cannot be undone.`}
        icon="trash-outline"
        variant="danger"
        confirmText="Delete"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteTeam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  teamLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  teamLogoPlaceholder: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  teamMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  teamMetaItem: {
    fontSize: 14,
    color: '#6B7280',
  },
  teamDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewMoreButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  membersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availableSlots: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  addMemberSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  addMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMemberTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  privateBadge: {
    backgroundColor: colors.courtLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.court,
  },
  addMemberDescription: {
    fontSize: 14,
    color: colors.soft,
    lineHeight: 20,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  memberActionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  memberActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  memberActionTextDanger: {
    color: '#DC2626',
  },
  emptyPlayersText: {
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  inviteContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
    gap: 16,
  },
  inviteCodeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    letterSpacing: 2,
    marginBottom: 8,
  },
  inviteCodeExpiry: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteActionButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  inviteActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noInviteCode: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  noInviteCodeText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  leaguesContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  leaguesLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  leaguesLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  leaguesList: {
    gap: 12,
  },
  leagueCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leagueCardHeader: {
    marginBottom: 12,
  },
  leagueCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  leagueCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  leagueCardSeason: {
    fontSize: 13,
    color: '#6B7280',
  },
  leagueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leagueCardMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  leagueCardStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  noLeagues: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noLeaguesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  eventsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  eventsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  eventsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventsList: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventCardDate: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    marginRight: 14,
  },
  eventCardMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grass,
    letterSpacing: 1,
  },
  eventCardDay: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  eventCardInfo: {
    flex: 1,
    gap: 2,
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  eventCardTime: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  eventCardLocation: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  eventCardChevron: {
    fontSize: 22,
    color: '#D1D5DB',
    marginLeft: 8,
  },
  noEvents: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});