import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LeagueForm } from '../../components/league/LeagueForm';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { leagueService } from '../../services/api/LeagueService';
import { addLeague } from '../../store/slices/leaguesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { CreateLeagueData, League } from '../../types';
import { colors } from '../../theme';

export const CreateLeagueScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateLeagueData) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a league');
      return;
    }

    setLoading(true);

    try {
      // Create league via API
      const newLeague: League = await leagueService.createLeague(data, user.id);

      // Add to Redux store
      dispatch(addLeague(newLeague));

      // Show success message
      Alert.alert(
        'Success',
        'League created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to league details with leagueType context
              navigation.navigate('LeagueDetails' as never, {
                leagueId: newLeague.id,
                leagueType: newLeague.leagueType,
              } as never);
            },
          },
        ]
      );
    } catch (error) {
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create league';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Create League"
        showBackButton
        onBackPress={handleCancel}
      />
      <LeagueForm
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
    backgroundColor: colors.chalk,
  },
});
