import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MatchForm } from '../../components/league/MatchForm';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { matchService } from '../../services/api/MatchService';
import { leagueService } from '../../services/api/LeagueService';
import { addMatch } from '../../store/slices/matchesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { CreateMatchData, Match, Team, Event } from '../../types';
import { League } from '../../types/league';
import { colors, useTheme } from '../../theme';

type CreateMatchScreenRouteProp = RouteProp<
  { CreateMatch: { leagueId: string; seasonId?: string } },
  'CreateMatch'
>;

export const CreateMatchScreen: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<CreateMatchScreenRouteProp>();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const { leagueId, seasonId } = route.params ?? {};

  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [leagueId]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load league details
      const leagueData = await leagueService.getLeagueById(leagueId);
      setLeague(leagueData);

      // Load league members (teams)
      const membersResponse = await leagueService.getMembers(leagueId, 1, 100);
      const leagueTeams = membersResponse.data
        .map(member => member.team)
        .filter((team): team is Team => team !== undefined);
      setTeams(leagueTeams);

      // TODO: Load events if needed (optional feature)
      // For now, we'll pass an empty array
      setEvents([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load league data');
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (data: CreateMatchData) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a match');
      return;
    }

    // Check if user is the league operator
    if (league && league.organizerId !== user.id) {
      Alert.alert('Error', 'Only the league commissioner can create matches');
      return;
    }

    setLoading(true);

    try {
      // Create match via API
      const newMatch: Match = await matchService.createMatch(data, user.id);

      // Add to Redux store
      dispatch(addMatch(newMatch));

      // Show success message
      Alert.alert('Success', 'Match created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to league details or manage league screen
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      // Show error message
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create match';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loadingData) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      >
        <ScreenHeader
          title="Create Match"
          leftIcon="arrow-back"
          onLeftPress={handleCancel}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cobalt} />
          <Text style={styles.loadingText}>Loading league data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bgScreen }]}>
      <ScreenHeader
        title="Create Match"
        leftIcon="arrow-back"
        onLeftPress={handleCancel}
      />
      <MatchForm
        leagueId={leagueId}
        {...(seasonId && { seasonId })}
        teams={teams}
        events={events}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
});
