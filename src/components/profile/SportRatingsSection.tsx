import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { colors, fonts, Spacing } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SportRating {
  sportType: string;
  bracketRating: number;
  overallRating: number;
  bracketPercentile: number | null;
  overallPercentile: number | null;
  ageBracket: string | null;
  bracketEventCount: number;
  overallEventCount: number;
  // Legacy
  rating: number;
  percentile: number | null;
  gamesPlayed: number;
}

interface SportRatingsSectionProps {
  userId: string;
}

const formatSportName = (sportType: string): string => {
  return sportType
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const getTopLabel = (percentile: number | null): string => {
  if (percentile == null) return '—';
  const top = Math.max(1, Math.round(100 - percentile));
  return `Top ${top}%`;
};

const getPercentileColor = (percentile: number | null): string => {
  if (percentile == null) return colors.inkFaint;
  if (percentile >= 90) return colors.gold;
  if (percentile >= 70) return colors.pine;
  if (percentile >= 50) return colors.navy;
  return colors.inkFaint;
};

export function SportRatingsSection({ userId }: SportRatingsSectionProps) {
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/users/sport-ratings/${userId}`
        );
        if (!response.ok) throw new Error('Failed to fetch sport ratings');
        const data: SportRating[] = await response.json();
        setRatings(data || []);
      } catch (error) {
        console.error('Failed to fetch sport ratings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, [userId]);

  const toggleExpand = (sport: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSport(prev => (prev === sport ? null : sport));
  };

  if (loading || ratings.length === 0) return null;

  return (
    <CollapsibleSection title="Sport Ratings" count={ratings.length}>
      <View style={styles.container}>
      {ratings.map((r) => {
        const isExpanded = expandedSport === r.sportType;
        const summaryPercentile = r.overallPercentile ?? r.percentile;

        return (
          <View key={r.sportType} style={styles.ratingCard}>
            <TouchableOpacity
              style={styles.ratingRow}
              onPress={() => toggleExpand(r.sportType)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${formatSportName(r.sportType)} ratings, ${isExpanded ? 'collapse' : 'expand'}`}
            >
              <Ionicons name="trophy-outline" size={18} color={colors.gold} />
              <Text style={styles.sportName}>{formatSportName(r.sportType)}</Text>
              <View style={styles.rowRight}>
                {summaryPercentile != null && (
                  <View style={[styles.summaryBadge, { backgroundColor: getPercentileColor(summaryPercentile) + '20' }]}>
                    <Text style={[styles.summaryBadgeText, { color: getPercentileColor(summaryPercentile) }]}>
                      {getTopLabel(summaryPercentile)} overall
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.inkFaint}
                />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.percentileRow}>
                  {/* Bracket percentile */}
                  <View style={styles.percentileCard}>
                    <Text style={styles.percentileLabel}>Bracket</Text>
                    {r.bracketEventCount > 0 && r.bracketPercentile != null ? (
                      <>
                        <Text style={[styles.percentileValue, { color: getPercentileColor(r.bracketPercentile) }]}>
                          {getTopLabel(r.bracketPercentile)}
                        </Text>
                        <Text style={styles.percentileHint}>in your age group</Text>
                        {r.ageBracket && (
                          <Text style={styles.bracketLabel}>{r.ageBracket}</Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noData}>No bracket events yet</Text>
                    )}
                    <Text style={styles.eventCount}>
                      {r.bracketEventCount} event{r.bracketEventCount !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {/* Overall percentile */}
                  <View style={styles.percentileCard}>
                    <Text style={styles.percentileLabel}>Overall</Text>
                    {r.overallEventCount > 0 && r.overallPercentile != null ? (
                      <>
                        <Text style={[styles.percentileValue, { color: getPercentileColor(r.overallPercentile) }]}>
                          {getTopLabel(r.overallPercentile)}
                        </Text>
                        <Text style={styles.percentileHint}>overall</Text>
                      </>
                    ) : (
                      <Text style={styles.noData}>No open events yet</Text>
                    )}
                    <Text style={styles.eventCount}>
                      {r.overallEventCount} event{r.overallEventCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  sportName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'uppercase',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontFamily: fonts.ui,
    fontSize: 11,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  percentileRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  percentileCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  percentileLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  percentileValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginBottom: 2,
  },
  percentileHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 4,
  },
  bracketLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.navy,
    backgroundColor: colors.navy + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  noData: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 4,
  },
  eventCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
});
