import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MatchResultForm } from '../../components/league/MatchResultForm';
import { StandingsTable } from '../../components/league/StandingsTable';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { matchService } from '../../services/api/MatchService';
import { leagueService } from '../../services/api/LeagueService';
import { recordResult } from '../../store/slices/matchesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { RecordMatchResultData, Match, TeamStanding } from '../../types';
import { colors } from '../../theme';

type RecordMatchResultScreenRouteProp = RouteProp<
  { RecordMatchResult: { matchId: string } },
  'RecordMatchResult'
>;

export const RecordMatchResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RecordMatchResultScreenRouteProp>();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  
  const { matchId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showStandings, setShowStandings] = useState(false);

  useEffect(() => {
    loadData();
  }, [matchId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load match details
      const matchData = await matchService.getMatchById(matchId);
      setMatch(matchData);
      
      // Load league details
      if (matchData.leagueId) {
        const leagueData = await leagueService.getLeagueById(matchData.leagueId);
        
        // Check if user is the league operator
        if (user?.id && leagueData.organizerId !== user.id) {
          Alert.alert(
            'Access Denied',
            'Only the league commissioner can record match results',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load match data');
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  };

  const loadStandings = async () => {
    if (!match?.leagueId) return;
    
    try {
      const standingsData = await leagueService.getStandings(
        match.leagueId,
        match.seasonId
      );
      setStandings(standingsData);
      setShowStandings(true);
    } catch (error) {
      console.error('Failed to load standings:', error);
      // Don't show error alert, just log it
    }
  };

  const handleSubmit = async (data: RecordMatchResultData) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to record match results');
      return;
    }

    if (!match) {
      Alert.alert('Error', 'Match data not available');
      return;
    }

    setLoading(true);

    try {
      // Record match result via API
      const updatedMatch: Match = await matchService.recordMatchResult(
        matchId,
        data,
        user.id
      );

      // Update Redux store
      dispatch(recordResult(updatedMatch));

      // Load updated standings
      await loadStandings();

      // Show success message
      Alert.alert(
        'Success',
        'Match result recorded successfully!',
        [
          {
            text: 'View Standings',
            onPress: () => {
              // Standings are already shown below
            },
          },
          {
            text: 'Done',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to record match result';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleTeamPress = (teamId: string) => {
    // TODO: Navigate to team details if needed
    console.log('Roster pressed:', teamId);
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Record Match Result"
          leftIcon="arrow-back"
          onLeftPress={handleCancel}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cobalt} />
          <Text style={styles.loadingText}>Loading match data...</Text>
        </View>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Record Match Result"
          leftIcon="arrow-back"
          onLeftPress={handleCancel}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Match not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Record Match Result"
        leftIcon="arrow-back"
        onLeftPress={handleCancel}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <MatchResultForm
          match={match}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
        
        {showStandings && standings.length > 0 && (
          <View style={styles.standingsSection}>
            <Text style={styles.standingsTitle}>Updated Standings</Text>
            <StandingsTable
              standings={standings}
              onTeamPress={handleTeamPress}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.inkFaint,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.heart,
    textAlign: 'center',
  },
  standingsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  standingsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 16,
  },
});
