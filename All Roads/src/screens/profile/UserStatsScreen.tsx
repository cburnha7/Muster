import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../services/api/UserService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

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
  const navigation = useNavigation();
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadStatsAndAchievements} />;
  }

  if (!stats) {
    return <ErrorDisplay message="No statistics available" onRetry={loadStatsAndAchievements} />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Overview Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={32} color="#3B82F6" />
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy-outline" size={32} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.totalEventsOrganized}</Text>
            <Text style={styles.statLabel}>Events Organized</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={32} color="#10B981" />
            <Text style={styles.statValue}>{stats.totalTeams}</Text>
            <Text style={styles.statLabel}>Teams Joined</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={32} color="#8B5CF6" />
            <Text style={styles.statValue}>
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
        </View>
      </View>

      {/* Financial Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial</Text>
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Total Spent</Text>
            <Text style={[styles.financialValue, styles.spentValue]}>
              ${stats.totalSpent.toFixed(2)}
            </Text>
          </View>
          <View style={styles.financialDivider} />
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Total Earned</Text>
            <Text style={[styles.financialValue, styles.earnedValue]}>
              ${stats.totalEarned.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Favorite Sports */}
      {stats.favoritesSports && stats.favoritesSports.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Sports</Text>
          <View style={styles.sportsList}>
            {stats.favoritesSports.map((sport, index) => (
              <View key={index} style={styles.sportTag}>
                <Text style={styles.sportTagText}>{sport}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        {achievements.length === 0 ? (
          <View style={styles.emptyAchievements}>
            <Ionicons name="medal-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No achievements yet</Text>
            <Text style={styles.emptySubtext}>
              Keep participating in events to unlock achievements!
            </Text>
          </View>
        ) : (
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <View style={styles.achievementIcon}>
                  <Text style={styles.achievementIconText}>{achievement.icon}</Text>
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  {achievement.progress !== undefined && achievement.maxProgress && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.progress}/{achievement.maxProgress}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.achievementDate}>
                    Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Activity Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Reviews Given</Text>
          <Text style={styles.summaryValue}>{stats.reviewCount}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  financialValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  spentValue: {
    color: '#EF4444',
  },
  earnedValue: {
    color: '#10B981',
  },
  financialDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sportTagText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyAchievements: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIconText: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 40,
  },
  achievementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
