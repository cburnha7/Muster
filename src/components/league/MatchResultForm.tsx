import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { FormInput } from '../forms/FormInput';
import { FormButton } from '../forms/FormButton';
import { Match, RecordMatchResultData } from '../../types';
import { colors } from '../../theme';

interface MatchResultFormProps {
  match: Match;
  onSubmit: (data: RecordMatchResultData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const MatchResultForm: React.FC<MatchResultFormProps> = ({
  match,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (homeScore === '' || isNaN(home) || home < 0) {
      newErrors.homeScore = 'Home score must be a non-negative number';
    }

    if (awayScore === '' || isNaN(away) || away < 0) {
      newErrors.awayScore = 'Away score must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getOutcome = (): string => {
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away)) return 'Enter scores to see outcome';

    if (home > away) return `${match.homeTeam?.name || 'Home'} wins`;
    if (away > home) return `${match.awayTeam?.name || 'Away'} wins`;
    return 'Draw';
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    const outcome = getOutcome();
    
    Alert.alert(
      'Confirm Result',
      `Are you sure you want to record this result?\n\n${match.homeTeam?.name}: ${homeScore}\n${match.awayTeam?.name}: ${awayScore}\n\nOutcome: ${outcome}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const resultData: RecordMatchResultData = {
              homeScore: parseInt(homeScore),
              awayScore: parseInt(awayScore),
            };

            try {
              await onSubmit(resultData);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to record result');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle}>Record Match Result</Text>
        <Text style={styles.matchDate}>
          {new Date(match.scheduledAt).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </Text>
      </View>

      <View style={styles.scoresContainer}>
        <View style={styles.teamScore}>
          <Text style={styles.teamLabel}>Home Roster</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.homeTeam?.name || 'Home Roster'}
          </Text>
          <FormInput
            label="Score *"
            placeholder="0"
            value={homeScore}
            onChangeText={setHomeScore}
            keyboardType="numeric"
            error={errors.homeScore}
            style={styles.scoreInput}
          />
        </View>

        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>vs</Text>
        </View>

        <View style={styles.teamScore}>
          <Text style={styles.teamLabel}>Away Roster</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.awayTeam?.name || 'Away Roster'}
          </Text>
          <FormInput
            label="Score *"
            placeholder="0"
            value={awayScore}
            onChangeText={setAwayScore}
            keyboardType="numeric"
            error={errors.awayScore}
            style={styles.scoreInput}
          />
        </View>
      </View>

      <View style={styles.outcomeContainer}>
        <Text style={styles.outcomeLabel}>Outcome:</Text>
        <Text style={styles.outcomeText}>{getOutcome()}</Text>
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            disabled={loading}
            style={styles.actionButton}
          />
        )}
        <FormButton
          title="Record Result"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  matchInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  matchDate: {
    fontSize: 14,
    color: '#666',
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  teamScore: {
    flex: 1,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scoreInput: {
    marginBottom: 0,
  },
  vsDivider: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  outcomeContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  outcomeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  outcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.pine,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
