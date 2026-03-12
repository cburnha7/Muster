import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
import { selectUser } from '../../store/slices/authSlice';
import { League, UpdateLeagueData, DocumentType, BoardMember, LeagueMembership } from '../../types/league';
import { colors } from '../../theme';

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

      Alert.alert('Success', 'League updated successfully!');
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
      'Remove Team',
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
              Alert.alert('Success', 'Team removed from league');
              loadMembers();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove team');
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
          title="Manage League"
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
          title="Manage League"
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
          title="Manage League"
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
          title="Manage League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay 
          title="Access Denied"
          message="Only the league operator can manage this league" 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Manage League"
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
            <Text style={styles.sectionTitle}>League Members</Text>
            <Text style={styles.memberCount}>
              {members.length} {members.length === 1 ? 'team' : 'teams'}
            </Text>
          </View>
          
          {isLoadingMembers ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="small" message="Loading teams..." />
            </View>
          ) : members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>No teams have joined yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Teams can join from the league details page
              </Text>
            </View>
          ) : (
            <View style={styles.teamsList}>
              {members.map((membership) => (
                <View key={membership.id} style={styles.teamItem}>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>
                      {(membership as any).team?.name || 'Unknown Team'}
                    </Text>
                    <Text style={styles.teamStats}>
                      {membership.matchesPlayed} matches • {membership.points} points
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveTeam(
                      membership.teamId,
                      (membership as any).team?.name || 'this team'
                    )}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
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
    color: '#333',
    marginBottom: 4,
  },
  teamStats: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  certifiedDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
});
