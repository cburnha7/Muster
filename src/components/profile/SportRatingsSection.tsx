import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';
import { formatRatingDisplay, LOVE_LABEL } from '../../utils/ratingDisplay';

interface SportRating {
  sportType: string;
  // New fields
  openPercentile: number | null;
  ageGroupPercentile: number | null;
  openGamesPlayed: number;
  ageGroupGamesPlayed: number;
  openRating: number | null;
  ageGroupRating: number | null;
  ageBracket: string | null;
  // Legacy fallbacks
  overallPercentile?: number | null;
  bracketPercentile?: number | null;
  overallEventCount?: number;
  bracketEventCount?: number;
}

interface SportRatingsSectionProps {
  userId: string;
}

const formatSportName = (sportType: string): string =>
  sportType
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

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
        const data = await response.json();
        const list: SportRating[] = Array.isArray(data)
          ? data
          : (data.sportRatings ?? []);
        // Show cards for any sport with at least one game played
        setRatings(
          list.filter(
            r =>
              (r.openGamesPlayed ?? r.overallEventCount ?? 0) > 0 ||
              (r.ageGroupGamesPlayed ?? r.bracketEventCount ?? 0) > 0
          )
        );
      } catch {
        setRatings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading)
    return (
      <ActivityIndicator color={colors.cobalt} style={{ marginVertical: 16 }} />
    );
  if (ratings.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Rankings</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {ratings.map(r => {
          const openPct = r.openPercentile ?? r.overallPercentile;
          const agePct = r.ageGroupPercentile ?? r.bracketPercentile;
          const openGames = r.openGamesPlayed ?? r.overallEventCount ?? 0;
          const ageGames = r.ageGroupGamesPlayed ?? r.bracketEventCount ?? 0;

          const openDisplay = formatRatingDisplay(
            openPct,
            openGames,
            r.openRating
          );
          const ageDisplay = formatRatingDisplay(
            agePct,
            ageGames,
            r.ageGroupRating
          );

          const openIsLove = openDisplay === LOVE_LABEL;
          const ageIsLove = ageDisplay === LOVE_LABEL;

          return (
            <View key={r.sportType} style={styles.card}>
              <Text style={styles.sportName}>
                {formatSportName(r.sportType)}
              </Text>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Open</Text>
                <Text
                  style={[styles.statValue, openIsLove && styles.loveLabel]}
                >
                  {openDisplay}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>
                  {r.ageBracket ? r.ageBracket : 'Age'}
                </Text>
                <Text style={[styles.statValue, ageIsLove && styles.loveLabel]}>
                  {ageDisplay}
                </Text>
              </View>
            </View>
          );
        })}
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
    width: 160,
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
  loveLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
});
