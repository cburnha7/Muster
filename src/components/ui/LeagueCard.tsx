import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { League, SportType } from '../../types';
import { colors } from '../../theme';

interface LeagueCardProps {
  league: League;
  onPress?: (league: League) => void;
  isOwner?: boolean;
  style?: any;
}

export const LeagueCard: React.FC<LeagueCardProps> = ({ league, onPress, isOwner, style }) => {
  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball-outline';
      case SportType.SOCCER:
        return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL:
      case SportType.BADMINTON:
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
        return 'american-football-outline';
      case SportType.SOFTBALL:
      case SportType.BASEBALL:
        return 'baseball-outline';
      case SportType.FLAG_FOOTBALL:
        return 'flag-outline';
      case SportType.KICKBALL:
        return 'football-outline';
      default:
        return 'fitness-outline';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const seasonText = league.seasonName || 
    (league.startDate && league.endDate 
      ? `${formatDate(league.startDate)} - ${formatDate(league.endDate)}`
      : 'Season TBD');

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(league)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.leagueInfo}>
          <Ionicons
            name={getSportIcon(league.sportType) as any}
            size={28}
            color={colors.pine}
          />
          <View style={styles.nameContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {league.name}
              </Text>
              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Ionicons name="star" size={10} color="#FFFFFF" />
                  <Text style={styles.ownerBadgeText}>Commissioner</Text>
                </View>
              )}
            </View>
            <Text style={styles.season} numberOfLines={1}>
              {seasonText}
            </Text>
          </View>
        </View>
      </View>

      {league.description && (
        <Text style={styles.description} numberOfLines={2}>
          {league.description}
        </Text>
      )}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons
            name={getSportIcon(league.sportType) as any}
            size={16}
            color="#666"
          />
          <Text style={styles.detailText}>
            {league.sportType.charAt(0).toUpperCase() + league.sportType.slice(1)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {league.memberCount || 0} rosters
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="trophy-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {league.matchCount || 0} matches
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons 
            name={league.isActive ? 'checkmark-circle' : 'close-circle'} 
            size={16} 
            color={league.isActive ? colors.pine : '#999'} 
          />
          <Text style={[styles.detailText, !league.isActive && styles.inactiveText]}>
            {league.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 8,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  season: {
    fontSize: 13,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  inactiveText: {
    color: '#999',
  },
});
