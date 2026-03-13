import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { LeagueService } from '../../services/api/LeagueService';
import { SportType } from '../../types';
import { League } from '../../types/league';
import { colors } from '../../theme';
import { RootState } from '../../store/store';

// Import tab components - using explicit file extensions
import { StandingsTab } from './tabs/StandingsTab';
import { MatchesTab } from './tabs/MatchesTab';
import { PlayersTab } from './tabs/PlayersTab';
import { TeamsTab } from './tabs/TeamsTab';
import { InfoTab } from './tabs/InfoTab';

type TabKey = 'standings' | 'matches' | 'players' | 'teams' | 'info';

export function LeagueDetailsScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = (route.params as any) || {};
  
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('standings');

  const loadLeague = useCallback(async (isRefresh = false) => {
    if (!leagueId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const leagueService = new LeagueService();
      const leagueData = await leagueService.getLeagueById(leagueId);
      // Type assertion needed because LeagueService uses types/index League
      // but we need types/league League which has additional properties
      setLeague(leagueData as any as League);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [leagueId]);

  useFocusEffect(
    useCallback(() => {
      loadLeague();
    }, [loadLeague])
  );

  const getSportIcon = (sportType: string) => {
    switch (sportType) {
      case SportType.BASKETBALL:
      case 'basketball':
        return 'basketball-outline';
      case SportType.SOCCER:
      case 'soccer':
        return 'football-outline';
      case SportType.TENNIS:
      case 'tennis':
      case SportType.PICKLEBALL:
      case 'pickleball':
      case SportType.BADMINTON:
      case 'badminton':
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
      case 'volleyball':
        return 'american-football-outline';
      case SportType.SOFTBALL:
      case 'softball':
      case SportType.BASEBALL:
      case 'baseball':
        return 'baseball-outline';
      case SportType.FLAG_FOOTBALL:
      case 'flag_football':
        return 'flag-outline';
      case SportType.KICKBALL:
      case 'kickball':
        return 'football-outline';
      default:
        return 'fitness-outline';
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'TBD';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleJoinLeague = () => {
    // TODO: Implement join league logic
    console.log('Join league');
  };

  const handleManageLeague = () => {
    if (league) {
      (navigation as any).navigate('ManageLeague', { leagueId: league.id });
    }
  };

  const renderTabContent = () => {
    if (!leagueId) return null;

    switch (activeTab) {
      case 'standings':
        return <StandingsTab leagueId={leagueId} />;
      case 'matches':
        return <MatchesTab leagueId={leagueId} />;
      case 'players':
        return <PlayersTab leagueId={leagueId} />;
      case 'teams':
        return <TeamsTab leagueId={leagueId} />;
      case 'info':
        return <InfoTab league={league} />;
      default:
        return null;
    }
  };

  const tabs: Array<{ key: TabKey; title: string }> = [
    { key: 'standings', title: 'Standings' },
    { key: 'matches', title: 'Matches' },
    { key: 'players', title: 'Players' },
    { key: 'teams', title: 'Teams' },
    { key: 'info', title: 'Info' },
  ];

  if (isLoading && !league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="League Details"
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
          title="League Details"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message={error} onRetry={() => loadLeague()} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="League Details"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message="League not found" onRetry={() => loadLeague()} />
      </View>
    );
  }

  // Check if current user is league operator
  const isOperator = currentUser?.id === league.organizerId;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={league.name}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        {...(isOperator && {
          rightIcon: 'settings-outline',
          onRightPress: handleManageLeague,
        })}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadLeague(true)}
            colors={[colors.grass]}
            tintColor={colors.grass}
          />
        }
      >
        {/* League Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Ionicons
              name={getSportIcon(league.sportType) as any}
              size={32}
              color={colors.grass}
            />
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{league.name}</Text>
                {league.isCertified && (
                  <View style={styles.certifiedBadge}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.court} />
                  </View>
                )}
              </View>
              <Text style={styles.season}>
                {league.seasonName || `${formatDate(league.startDate)} - ${formatDate(league.endDate)}`}
              </Text>
            </View>
          </View>

          {/* League Info Section */}
          {league.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.description}>{league.description}</Text>
            </View>
          )}

          {/* Points System */}
          {league.pointsConfig && (
            <View style={styles.pointsSystemSection}>
              <Text style={styles.sectionTitle}>Points System</Text>
              <View style={styles.pointsRow}>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.win}</Text>
                  <Text style={styles.pointLabel}>Win</Text>
                </View>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.draw}</Text>
                  <Text style={styles.pointLabel}>Draw</Text>
                </View>
                <View style={styles.pointItem}>
                  <Text style={styles.pointValue}>{league.pointsConfig.loss}</Text>
                  <Text style={styles.pointLabel}>Loss</Text>
                </View>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{league.memberCount || 0}</Text>
              <Text style={styles.statLabel}>Teams</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{league.matchCount || 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: league.isActive ? colors.grass : '#999' }
              ]}>
                <Text style={styles.statusText}>
                  {league.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.activeTabLabel,
                  ]}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {!isOperator && (
        <View style={styles.actions}>
          <FormButton
            title="Join League"
            onPress={handleJoinLeague}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  certifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 16,
    padding: 6,
  },
  season: {
    fontSize: 14,
    color: colors.soft,
  },
  descriptionSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  description: {
    fontSize: 14,
    color: colors.mid,
    lineHeight: 20,
  },
  pointsSystemSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pointItem: {
    alignItems: 'center',
  },
  pointValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.grass,
  },
  pointLabel: {
    fontSize: 12,
    color: colors.soft,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 13,
    color: colors.soft,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.grass,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabLabel: {
    color: colors.grass,
  },
  tabContent: {
    flex: 1,
    minHeight: 400,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    width: '100%',
  },
});
