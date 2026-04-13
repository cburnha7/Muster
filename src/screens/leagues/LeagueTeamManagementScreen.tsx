import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormButton } from '../../components/forms/FormButton';

import { leagueService } from '../../services/api/LeagueService';
import { userService } from '../../services/api/UserService';
import { selectUser } from '../../store/slices/authSlice';
import { isCoachRole } from '../../utils/teamRoles';
import { LeagueMembership } from '../../types/league';
import { colors, fonts, useTheme } from '../../theme';

interface TeamWithCoach {
  membership: LeagueMembership;
  teamId: string;
  teamName: string;
  playerCount: number;
  coachName: string | null;
  coachId: string | null;
  wins: number;
  losses: number;
}

export const LeagueTeamManagementScreen: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = (route.params as any) || {};
  const user = useSelector(selectUser);

  const [, setLeagueName] = useState('');
  const [teams, setTeams] = useState<TeamWithCoach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add team modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamMaxMembers, setNewTeamMaxMembers] = useState('15');
  const [newCoachEmail, setNewCoachEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Assign coach modal
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachTargetTeam, setCoachTargetTeam] = useState<TeamWithCoach | null>(
    null
  );
  const [coachSearchQuery, setCoachSearchQuery] = useState('');
  const [coachSearchResults, setCoachSearchResults] = useState<any[]>([]);
  const [isSearchingCoach, setIsSearchingCoach] = useState(false);
  const [coachEmail, setCoachEmail] = useState('');
  const [isAssigningCoach, setIsAssigningCoach] = useState(false);

  const loadTeams = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        const league = await leagueService.getLeagueById(leagueId, true);
        setLeagueName(league.name || '');

        if (user?.id && league.organizerId !== user.id) {
          setError('Only the league commissioner can manage rosters');
          return;
        }

        const response = await leagueService.getMembers(leagueId, 1, 100, true);
        const memberships = response.data || [];

        const teamList: TeamWithCoach[] = memberships
          .filter(
            (m: any) => m.memberType === 'roster' && m.status === 'active'
          )
          .map((m: any) => {
            const members = m.team?.members || [];
            const coach = members.find(
              (mem: any) => isCoachRole(mem.role) && mem.status === 'active'
            );
            const playerMembers = members.filter(
              (mem: any) => !isCoachRole(mem.role) && mem.status === 'active'
            );

            return {
              membership: m,
              teamId: m.teamId || m.memberId,
              teamName: m.team?.name || 'Unknown Roster',
              playerCount: playerMembers.length,
              coachName: coach
                ? `${coach.user?.firstName || ''} ${coach.user?.lastName || ''}`.trim() ||
                  'Coach'
                : null,
              coachId: coach?.user?.id || null,
              wins: m.wins || 0,
              losses: m.losses || 0,
            };
          });

        setTeams(teamList);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load rosters';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [leagueId, user?.id]
  );

  useEffect(() => {
    if (leagueId) loadTeams();
  }, [leagueId, loadTeams]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Error', 'Roster name is required');
      return;
    }

    setIsCreating(true);
    try {
      const payload: {
        name: string;
        maxMembers?: number;
        coachEmail?: string;
      } = {
        name: newTeamName.trim(),
        maxMembers: parseInt(newTeamMaxMembers) || 15,
      };
      if (newCoachEmail.trim()) {
        payload.coachEmail = newCoachEmail.trim();
      }
      await leagueService.createTeamForLeague(leagueId, payload);

      setShowAddModal(false);
      setNewTeamName('');
      setNewTeamMaxMembers('15');
      setNewCoachEmail('');

      Alert.alert(
        'Success',
        `${newTeamName.trim()} has been created and added to the league`
      );
      loadTeams();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create roster');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchCoach = async () => {
    const query = coachSearchQuery.trim();
    if (!query || query.length < 2) return;

    setIsSearchingCoach(true);
    try {
      const results = await userService.searchUsers(query);
      setCoachSearchResults(results || []);
    } catch (err) {
      setCoachSearchResults([]);
    } finally {
      setIsSearchingCoach(false);
    }
  };

  const handleAssignCoachByUser = async (targetUserId: string) => {
    if (!coachTargetTeam) return;

    setIsAssigningCoach(true);
    try {
      await leagueService.assignCoach(leagueId, coachTargetTeam.teamId, {
        coachUserId: targetUserId,
      });

      setShowCoachModal(false);
      setCoachTargetTeam(null);
      setCoachSearchQuery('');
      setCoachSearchResults([]);
      setCoachEmail('');

      Alert.alert('Success', 'Coach assigned successfully');
      loadTeams();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to assign coach');
    } finally {
      setIsAssigningCoach(false);
    }
  };

  const handleAssignCoachByEmail = async () => {
    if (!coachTargetTeam || !coachEmail.trim()) return;

    setIsAssigningCoach(true);
    try {
      await leagueService.assignCoach(leagueId, coachTargetTeam.teamId, {
        email: coachEmail.trim(),
      });

      setShowCoachModal(false);
      setCoachTargetTeam(null);
      setCoachSearchQuery('');
      setCoachSearchResults([]);
      setCoachEmail('');

      Alert.alert('Success', 'Coach assigned successfully');
      loadTeams();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to assign coach');
    } finally {
      setIsAssigningCoach(false);
    }
  };

  const handleRemoveTeam = (team: TeamWithCoach) => {
    Alert.alert(
      'Remove Roster',
      `Are you sure you want to remove ${team.teamName} from this league?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              await leagueService.leaveLeague(leagueId, team.teamId, user.id);
              Alert.alert(
                'Removed',
                `${team.teamName} has been removed from the league`
              );
              loadTeams();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to remove roster');
            }
          },
        },
      ]
    );
  };

  const openCoachModal = (team: TeamWithCoach) => {
    setCoachTargetTeam(team);
    setCoachSearchQuery('');
    setCoachSearchResults([]);
    setCoachEmail('');
    setShowCoachModal(true);
  };

  const teamsNeedingCoaches = teams.filter(t => !t.coachName).length;

  const renderTeamCard = ({ item }: { item: TeamWithCoach }) => (
    <View style={styles.teamCard}>
      <View style={styles.teamCardHeader}>
        <View style={styles.teamLogoPlaceholder}>
          <Ionicons name="people" size={20} color={colors.cobalt} />
        </View>
        <View style={styles.teamCardInfo}>
          <Text style={styles.teamCardName} numberOfLines={1}>
            {item.teamName}
          </Text>
          {item.coachName ? (
            <View style={styles.coachRow}>
              <View style={[styles.statusDot, styles.statusDotGreen]} />
              <Text style={styles.coachText}>Coach: {item.coachName}</Text>
            </View>
          ) : (
            <View style={styles.coachRow}>
              <Ionicons name="alert-circle" size={14} color={colors.gold} />
              <Text style={styles.noCoachText}>No coach assigned</Text>
            </View>
          )}
          <Text style={styles.playerCountText}>
            {item.playerCount} {item.playerCount === 1 ? 'player' : 'players'}
            {item.wins + item.losses > 0
              ? ` · ${item.wins}-${item.losses}`
              : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.overflowButton}
          onPress={() => {
            Alert.alert(item.teamName, undefined, [
              {
                text: item.coachName ? 'Change Coach' : 'Assign Coach',
                onPress: () => openCoachModal(item),
              },
              {
                text: 'Remove from League',
                style: 'destructive',
                onPress: () => handleRemoveTeam(item),
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.inkFaint}
          />
        </TouchableOpacity>
      </View>

      {!item.coachName && (
        <TouchableOpacity
          style={styles.assignCoachButton}
          onPress={() => openCoachModal(item)}
          activeOpacity={0.75}
        >
          <Ionicons name="person-add-outline" size={16} color={colors.cobalt} />
          <Text style={styles.assignCoachButtonText}>Assign coach</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      >
        <ScreenHeader
          title="Manage Rosters"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      >
        <ScreenHeader
          title="Manage Rosters"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message={error} onRetry={() => loadTeams()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bgScreen }]}>
      <ScreenHeader
        title="Manage Rosters"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryText}>
          {teams.length} {teams.length === 1 ? 'roster' : 'rosters'}
          {teamsNeedingCoaches > 0 && (
            <Text style={styles.summaryWarning}>
              {' '}
              · {teamsNeedingCoaches} need coaches
            </Text>
          )}
        </Text>
      </View>

      <FlatList
        data={teams}
        keyExtractor={item => item.teamId}
        renderItem={renderTeamCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTeams(true)}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>No rosters yet</Text>
            <Text style={styles.emptySubtext}>
              Create rosters for your league and assign coaches
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.addButtonContainer}>
            <FormButton
              title="Add roster"
              onPress={() => setShowAddModal(true)}
              variant="primary"
              size="large"
              leftIcon="add-circle-outline"
            />
          </View>
        }
      />

      {/* ─── Add Team Modal ─── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add roster to league</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Roster name *</Text>
            <TextInput
              style={styles.textInput}
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder="e.g. New Gloucester Strikers"
              placeholderTextColor={colors.inkFaint}
              autoFocus
            />

            <Text style={styles.inputLabel}>Max players</Text>
            <TextInput
              style={styles.textInput}
              value={newTeamMaxMembers}
              onChangeText={setNewTeamMaxMembers}
              placeholder="15"
              placeholderTextColor={colors.inkFaint}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Coach email (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={newCoachEmail}
              onChangeText={setNewCoachEmail}
              placeholder="coach@email.com"
              placeholderTextColor={colors.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.inputHint}>
              If they have a Muster account, they'll be assigned immediately.
            </Text>

            <FormButton
              title={isCreating ? 'Creating...' : 'Create roster'}
              onPress={handleCreateTeam}
              variant="primary"
              size="large"
              loading={isCreating}
              disabled={!newTeamName.trim() || isCreating}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Assign Coach Modal ─── */}
      <Modal visible={showCoachModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign coach
                {coachTargetTeam ? ` to ${coachTargetTeam.teamName}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCoachModal(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Search for existing user */}
            <Text style={styles.inputLabel}>Search for a Muster user</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={coachSearchQuery}
                onChangeText={setCoachSearchQuery}
                placeholder="Search by name or email"
                placeholderTextColor={colors.inkFaint}
                returnKeyType="search"
                onSubmitEditing={handleSearchCoach}
              />
              <TouchableOpacity
                style={[
                  styles.searchButton,
                  (!coachSearchQuery.trim() || isSearchingCoach) &&
                    styles.searchButtonDisabled,
                ]}
                onPress={handleSearchCoach}
                disabled={!coachSearchQuery.trim() || isSearchingCoach}
                activeOpacity={0.75}
              >
                {isSearchingCoach ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Search results */}
            {coachSearchResults.length > 0 && (
              <View style={styles.searchResults}>
                {coachSearchResults.slice(0, 5).map((u: any) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.searchResultItem}
                    onPress={() => handleAssignCoachByUser(u.id)}
                    disabled={isAssigningCoach}
                    activeOpacity={0.75}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {u.firstName} {u.lastName}
                      </Text>
                      <Text style={styles.searchResultEmail}>{u.email}</Text>
                    </View>
                    {isAssigningCoach ? (
                      <ActivityIndicator size="small" color={colors.cobalt} />
                    ) : (
                      <Ionicons
                        name="add-circle"
                        size={24}
                        color={colors.cobalt}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {coachSearchResults.length === 0 &&
              coachSearchQuery.trim().length >= 2 &&
              !isSearchingCoach && (
                <Text style={styles.noResults}>No users found</Text>
              )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or assign by email</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.textInput}
              value={coachEmail}
              onChangeText={setCoachEmail}
              placeholder="coach@email.com"
              placeholderTextColor={colors.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormButton
              title={isAssigningCoach ? 'Assigning...' : 'Assign as coach'}
              onPress={handleAssignCoachByEmail}
              variant="primary"
              size="large"
              loading={isAssigningCoach}
              disabled={!coachEmail.trim() || isAssigningCoach}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryStrip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
  },
  summaryWarning: {
    color: colors.gold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  teamCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamCardInfo: {
    flex: 1,
  },
  teamCardName: {
    fontSize: 16,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
    marginBottom: 2,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#34C759',
  },
  coachText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  noCoachText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.gold,
  },
  playerCountText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkFaint,
  },
  overflowButton: {
    padding: 8,
  },
  assignCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
  },
  assignCoachButtonText: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
    color: colors.cobalt,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    marginTop: 6,
    textAlign: 'center',
  },
  addButtonContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  // ─── Modal styles ───
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
    flex: 1,
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.label,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: colors.surfaceContainerLow,
    marginBottom: 12,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    marginBottom: 16,
    marginTop: -6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: colors.cobalt,
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchResults: {
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    marginBottom: 6,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
  },
  searchResultEmail: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    marginTop: 1,
  },
  noResults: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
