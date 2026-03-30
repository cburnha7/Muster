import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, fonts } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';

interface SportRating {
  sportType: string;
  bracketPercentile: number | null;
  overallPercentile: number | null;
  ageBracket: string | null;
  bracketEventCount: number;
  overallEventCount: number;
}

interface SportRatingsSectionProps {
  userId: string;
}

const formatSportName = (sportType: string): string =>
  sportType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function SportRatingsSection({ userId }: SportRatingsSectionProps) {
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/sport-ratings/${userId}`
        );
        if (!response.ok) throw new Error('Failed');
        const data: SportRating[] = await response.json();
        setRatings((data || []).filter(r => r.overallEventCount > 0 || r.bracketEventCount > 0));
      } catch {
        setRatings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <ActivityIndicator color={colors.cobalt} style={{ marginVertical: 16 }} />;
  if (ratings.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Rankings</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {ratings.map((r) => (
          <View key={r.sportType} style={styles.card}>
            <Text style={styles.sportName}>{formatSportName(r.sportType)}</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Open</Text>
              <Text style={styles.statValue}>
                {r.overallPercentile != null ? `${ordinal(Math.round(r.overallPercentile))}` : '—'}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>
                {r.bracketPercentile != null ? `${ordinal(Math.round(r.bracketPercentile))}` : '—'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  scroll: {
    paddingRight: 20,
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    width: 150,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sportName: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.cobalt,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  statValue: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.ink,
  },
});
