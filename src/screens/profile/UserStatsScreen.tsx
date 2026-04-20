import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../services/api/UserService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { colors, fonts, useTheme } from '../../theme';
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
      <Text style={styles.sectionHeader}>Overview</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flag-outline" size={24} color={colors.secondary} />
          <Text style={styles.statValue}>{stats.totalEventsOrganized}</Text>
          <Text style={styles.statLabel}>Organized</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={colors.cobalt} />
          <Text style={styles.statValue}>{stats.totalTeams}</Text>
          <Text style={styles.statLabel}>Teams</Text>
        </View>
      </View>

      {/* Rating */}
      {stats.averageRating != null && (
        <>
          <Text style={styles.sectionHeader}>Rating</Text>
          <View style={styles.card}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={20} color={colors.gold} />
              <Text style={styles.ratingValue}>
                {stats.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.ratingMeta}>
                from {stats.reviewCount} review
                {stats.reviewCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Financial */}
      <Text style={styles.sectionHeader}>Financial</Text>
      <View style={styles.card}>
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Total Spent</Text>
            <Text style={[styles.financialValue, { color: colors.error }]}>
              ${stats.totalSpent.toFixed(2)}
            </Text>
          </View>
          <View style={styles.financialDivider} />
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Total Earned</Text>
            <Text style={[styles.financialValue, { color: colors.secondary }]}>
              ${stats.totalEarned.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Favorite Sports */}
      {stats.favoritesSports && stats.favoritesSports.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Favorite Sports</Text>
          <View style={styles.card}>
            <View style={styles.sportsList}>
              {stats.favoritesSports.map((sport, index) => (
                <View key={index} style={styles.sportTag}>
                  <Text style={styles.sportTagText}>{formatSport(sport)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Achievements */}
      <Text style={styles.sectionHeader}>Achievements</Text>
      <View style={styles.card}>
        {achievements.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="medal-outline"
              size={40}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>No achievements yet</Text>
            <Text style={styles.emptySubtext}>
              Keep playing to unlock achievements!
            </Text>
          </View>
        ) : (
          achievements.map(achievement => (
            <View key={achievement.id} style={styles.achievementRow}>
              <View style={styles.achievementIcon}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDesc}>
                  {achievement.description}
                </Text>
                {achievement.progress != null && achievement.maxProgress && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
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
                    <Text style={styles.progressText}>
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
      <Text style={styles.sectionHeader}>Activity</Text>
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Reviews Given</Text>
          <Text style={styles.summaryValue}>{stats.reviewCount}</Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.ink,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurface,
  },
  ratingMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
  },
  financialValue: {
    fontFamily: fonts.heading,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  financialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    backgroundColor: colors.outlineVariant,
  },

  // Sports
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sportTagText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.primary,
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
    color: colors.onSurfaceVariant,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant + '60',
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
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
    color: colors.onSurface,
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
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
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurface,
  },
  summaryValue: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    color: colors.primary,
  },
});
