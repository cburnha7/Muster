import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { League, SportType } from '../../types';
import { colors } from '../../theme';

interface LeagueCardProps {
  league: League;
  onPress?: (league: League) => void;
  style?: any;
}

export const LeagueCard: React.FC<LeagueCardProps> = ({ league, onPress, style }) => {
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
            color={colors.grass}
          />
          <View style={styles.nameContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {league.name}
              </Text>
              {league.isCertified && (
                <View style={styles.certifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.court} />
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
            {league.memberCount || 0} teams
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
            color={league.isActive ? colors.grass : '#999'} 
          />
          <Text style={[styles.detailText, !league.isActive && styles.inactiveText]}>
            {league.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {league.isCertified && (
        <View style={styles.certificationInfo}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.court} />
          <Text style={styles.certificationText}>
            Certified League
          </Text>
        </View>
      )}
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
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  certifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 4,
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
  certificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  certificationText: {
    fontSize: 13,
    color: colors.court,
    fontWeight: '600',
    marginLeft: 6,
  },
});
