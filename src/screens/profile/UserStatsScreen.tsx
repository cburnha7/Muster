import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../services/api/UserService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { fonts, useTheme } from '../../theme';
import { formatSport } from '../../utils/sportUtils';

interface UserStats {
  totalBookings: number;
  totalEventsOrganized: number;
  totalTeams: number;
  favoritesSports: string[];
  totalSpent: number;
  totalEarned: number;
  averageRating?: number;
  reviewCount: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress?: number;
  maxProgress?: number;
}

export function UserStatsScreen(): JSX.Element {
  const { colors } = useTheme();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatsAndAchievements();
  }, []);

  const loadStatsAndAchievements = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, achievementsData] = await Promise.all([
        userService.getUserStats(),
        userService.getAchievements(),
      ]);
      setStats(statsData);
      setAchievements(achievementsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return <ErrorDisplay message={error} onRetry={loadStatsAndAchievements} />;
  if (!stats)
    return (
      <ErrorDisplay
        message="No statistics available"
        onRetry={loadStatsAndAchievements}
      />
    );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      {/* Overview Stats */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Overview</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.cobalt} />
          <Text style={[styles.statValue, { color: colors.ink }]}>{stats.totalBookings}</Text>
          <Text style={[styles.statLabel, { color: colors.inkSecondary }]}>Bookings</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Ionicons name="flag-outline" size={24} color={colors.pine} />
          <Text style={[styles.statValue, { color: colors.ink }]}>{stats.totalEventsOrganized}</Text>
          <Text style={[styles.statLabel, { color: colors.inkSecondary }]}>Organized</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Ionicons name="people-outline" size={24} color={colors.cobalt} />
          <Text style={[styles.statValue, { color: colors.ink }]}>{stats.totalTeams}</Text>
          <Text style={[styles.statLabel, { color: colors.inkSecondary }]}>Teams</Text>
        </View>
      </View>

      {/* Rating */}
      {stats.averageRating != null && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Rating</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={20} color={colors.gold} />
              <Text style={[styles.ratingValue, { color: colors.ink }]}>
                {stats.averageRating.toFixed(1)}
              </Text>
              <Text style={[styles.ratingMeta, { color: colors.inkSecondary }]}>
                from {stats.reviewCount} review
                {stats.reviewCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Financial */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Financial</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.inkSecondary }]}>Total Spent</Text>
            <Text style={[styles.financialValue, { color: colors.error }]}>
              ${stats.totalSpent.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.financialDivider, { backgroundColor: colors.border }]} />
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.inkSecondary }]}>Total Earned</Text>
            <Text style={[styles.financialValue, { color: colors.pine }]}>
              ${stats.totalEarned.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Favorite Sports */}
      {stats.favoritesSports && stats.favoritesSports.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Favorite Sports</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
            <View style={styles.sportsList}>
              {stats.favoritesSports.map((sport, index) => (
                <View key={index} style={[styles.sportTag, { backgroundColor: colors.cobaltLight }]}>
                  <Text style={[styles.sportTagText, { color: colors.cobalt }]}>{formatSport(sport)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Achievements */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Achievements</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
        {achievements.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="medal-outline"
              size={40}
              color={colors.border}
            />
            <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>No achievements yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.inkSecondary }]}>
              Keep playing to unlock achievements!
            </Text>
          </View>
        ) : (
          achievements.map(achievement => (
            <View key={achievement.id} style={[styles.achievementRow, { borderBottomColor: colors.border + '60' }]}>
              <View style={[styles.achievementIcon, { backgroundColor: colors.cobaltLight }]}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, { color: colors.ink }]}>{achievement.name}</Text>
                <Text style={[styles.achievementDesc, { color: colors.inkSecondary }]}>
                  {achievement.description}
                </Text>
                {achievement.progress != null && achievement.maxProgress && (
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              `${(achievement.progress / achievement.maxProgress) * 100}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.inkSecondary }]}>
                      {achievement.progress}/{achievement.maxProgress}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Activity */}
      <Text style={[styles.sectionHeader, { color: colors.inkSecondary }]}>Activity</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.ink }]}>Reviews Given</Text>
          <Text style={[styles.summaryValue, { color: colors.cobalt }]}>{stats.reviewCount}</Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontFamily: fonts.heading,
    fontSize: 22,
  },
  ratingMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
  },

  // Financial
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  financialLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  financialValue: {
    fontFamily: fonts.heading,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  financialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
  },

  // Sports
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sportTagText: {
    fontFamily: fonts.label,
    fontSize: 13,
  },

  // Empty
  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementInfo: {
    flex: 1,
    gap: 2,
  },
  achievementName: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: 11,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  summaryValue: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
  },
});
