import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Team, SportType, SkillLevel } from '../../types';
import { colors } from '../../theme';

interface TeamCardProps {
  team: Team;
  onPress?: (team: Team) => void;
  style?: any;
  compact?: boolean;
  currentUserId?: string | undefined;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, style, compact = false, currentUserId }) => {
  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball-outline';
      case SportType.SOCCER:
        return 'football-outline';
      case SportType.TENNIS:
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
        return 'american-football-outline';
      default:
        return 'fitness-outline';
    }
  };

  const getSkillLevelColor = (skillLevel: SkillLevel) => {
    switch (skillLevel) {
      case SkillLevel.BEGINNER:
        return '#34C759';
      case SkillLevel.INTERMEDIATE:
        return '#FF9500';
      case SkillLevel.ADVANCED:
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const availableSlots = team.maxMembers - team.members.length;
  const isFull = availableSlots <= 0;

  const currentMember = currentUserId
    ? team.members.find((m) => m.userId === currentUserId)
    : undefined;
  const isMember = currentMember?.status === 'active';
  const isInvited = currentMember?.status === 'inactive'; // pending invite

  const isManager = currentUserId && (
    team.captainId === currentUserId ||
    team.members.some(
      (m) => m.userId === currentUserId && (m.role === 'captain' || m.role === 'co_captain') && m.status === 'active'
    )
  );

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(team)}
      activeOpacity={0.7}
    >
      {/* Bubble stack — top-right, vertical */}
      <View style={styles.bubbleStack}>
        {isManager && (
          <View style={styles.managerBadge}>
            <Ionicons name="star" size={10} color="#FFFFFF" />
            <Text style={styles.managerBadgeText}>Manager</Text>
          </View>
        )}
        <View
          style={[
            styles.skillBadge,
            { backgroundColor: getSkillLevelColor(team.skillLevel) },
          ]}
        >
          <Text style={styles.skillText}>
            {team.skillLevel.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.teamInfo}>
          {team.logo ? (
            <Image source={{ uri: team.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons
                name={getSportIcon(team.sportTypes?.[0] || team.sportType) as any}
                size={24}
                color="#007AFF"
              />
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {team.name}
            </Text>
            <Text style={styles.captain}>
              {team.captain?.firstName} {team.captain?.lastName}
            </Text>
          </View>
        </View>
      </View>

      {team.description && (
        <Text style={styles.description} numberOfLines={2}>
          {team.description}
        </Text>
      )}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons
            name={getSportIcon(team.sportTypes?.[0] || team.sportType) as any}
            size={16}
            color="#666"
          />
          <Text style={styles.detailText}>
            {(() => {
              const sports = team.sportTypes && team.sportTypes.length > 0
                ? team.sportTypes
                : [team.sportType];
              return sports.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
            })()}
          </Text>
        </View>



        <View style={styles.detailRow}>
          <Ionicons
            name={team.isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={16}
            color="#666"
          />
          <Text style={styles.detailText}>
            {team.isPublic ? 'Public roster' : 'Private roster'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.availability}>
          <View style={[styles.statusBadge, isFull && styles.fullBadge]}>
            <Text style={[styles.statusText, isFull && styles.fullStatusText]}>
              {isFull ? 'Full' : `${availableSlots} spots available`}
            </Text>
          </View>
        </View>
        {isInvited && (
          <View style={styles.invitedBadge}>
            <Ionicons name="mail-outline" size={14} color={colors.court} />
            <Text style={styles.invitedText}>Invited</Text>
          </View>
        )}
        {team.isPublic && !isFull && !isMember && !isInvited && (
          <View style={styles.joinButton}>
            <Text style={styles.joinText}>Join Up</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    paddingRight: 90,
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
    position: 'relative' as const,
  },
  bubbleStack: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    alignItems: 'flex-end' as const,
    gap: 4,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  managerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  captain: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  fullText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availability: {
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  fullBadge: {
    backgroundColor: '#FFE8E8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  fullStatusText: {
    color: '#FF3B30',
  },
  joinButton: {
    backgroundColor: colors.pine,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.court}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.court,
    gap: 4,
  },
  invitedText: {
    color: colors.court,
    fontSize: 12,
    fontWeight: '600',
  },
});