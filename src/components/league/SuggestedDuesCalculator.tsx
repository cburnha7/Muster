/**
 * SuggestedDuesCalculator
 *
 * Advisory widget shown on the season creation screen for paid leagues.
 * Displays the suggested minimum dues using:
 *   ceil((gamesPerTeam × avgCourtCost) / rosterCount)
 *
 * Updates live as the commissioner changes inputs.
 * The commissioner can set any amount — this is guidance only.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';

export interface SuggestedDuesCalculatorProps {
  /** Number of games each roster plays in the season */
  gamesPerTeam: number;
  /** Number of enrolled rosters */
  rosterCount: number;
  /** League sport type used to look up average court cost */
  sportType: string;
  /** Base URL for the API (defaults to EXPO_PUBLIC_API_URL) */
  apiBaseUrl?: string;
}

interface SuggestedDuesResponse {
  avgCourtCost: number;
  gamesPerTeam: number;
  rosterCount: number;
  suggestedMinDues: number;
}

/**
 * Pure calculation — mirrors the server-side formula.
 * Used for instant local updates while the API call is in flight.
 */
export function calculateSuggestedDuesLocal(
  gamesPerTeam: number,
  avgCourtCost: number,
  rosterCount: number,
): number {
  if (rosterCount <= 0 || gamesPerTeam <= 0 || avgCourtCost <= 0) {
    return 0;
  }
  return Math.ceil((gamesPerTeam * avgCourtCost) / rosterCount);
}

export const SuggestedDuesCalculator: React.FC<SuggestedDuesCalculatorProps> = ({
  gamesPerTeam,
  rosterCount,
  sportType,
  apiBaseUrl,
}) => {
  const [avgCourtCost, setAvgCourtCost] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch avg court cost whenever sportType changes
  useEffect(() => {
    if (!sportType) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const baseUrl =
      apiBaseUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

    fetch(
      `${baseUrl}/seasons/suggested-dues?sportType=${encodeURIComponent(sportType)}&gamesPerTeam=1&rosterCount=1`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch court cost data');
        return res.json();
      })
      .then((data: SuggestedDuesResponse) => {
        if (!cancelled) {
          setAvgCourtCost(data.avgCourtCost);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sportType, apiBaseUrl]);

  const suggestedDues = calculateSuggestedDuesLocal(
    gamesPerTeam,
    avgCourtCost,
    rosterCount,
  );

  const hasValidInputs = gamesPerTeam > 0 && rosterCount > 0;

  if (!hasValidInputs) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Suggested minimum dues: $${suggestedDues}`}
    >
      <View style={styles.header}>
        <Ionicons name="calculator-outline" size={16} color={colors.pine} />
        <Text style={styles.title}>Suggested Minimum Dues</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.pine}
          style={styles.loader}
        />
      ) : error ? (
        <Text style={styles.errorText}>Unable to calculate — try again later</Text>
      ) : (
        <>
          <Text style={styles.amount}>
            ${suggestedDues.toLocaleString()}
          </Text>
          <Text style={styles.formula}>
            {gamesPerTeam} games × ${avgCourtCost.toLocaleString()} avg court cost ÷ {rosterCount}{' '}
            {rosterCount === 1 ? 'roster' : 'rosters'}
          </Text>
          <Text style={styles.advisory}>
            This is the minimum to cover court costs. Any amount above this is your earnings for running the league.
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.pineLight,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.pine,
  },
  amount: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  formula: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: Spacing.sm,
  },
  advisory: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  loader: {
    marginVertical: Spacing.md,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heart,
    marginTop: Spacing.xs,
  },
});
