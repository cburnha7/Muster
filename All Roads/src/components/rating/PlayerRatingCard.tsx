import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerRatingService } from '../../services/rating/PlayerRatingService';
import { PlayerRating } from '../../types/rating';

interface PlayerRatingCardProps {
  rating: PlayerRating;
  showDetails?: boolean;
  compact?: boolean;
}

export const PlayerRatingCard: React.FC<PlayerRatingCardProps> = ({
  rating,
  showDetails = true,
  compact = false,
}) => {
  const display = PlayerRatingService.getRatingDisplay(rating.currentRating);
  const hasStableRating = PlayerRatingService.hasStableRating(rating.totalGamesPlayed);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRating}>
          <Text style={[styles.compactRatingValue, { color: display.color }]}>
            {display.rating.toFixed(1)}
          </Text>
          <Ionicons name="star" size={16} color={display.color} />
        </View>
        <Text style={styles.compactLabel}>{display.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.mainRating}>
          <Text style={[styles.ratingValue, { color: display.color }]}>
            {display.rating.toFixed(1)}
          </Text>
          <View style={styles.stars}>
            {[...Array(5)].map((_, index) => (
              <Ionicons
                key={index}
                name={index < Math.floor(display.stars) ? 'star' : 'star-outline'}
                size={20}
                color={display.color}
              />
            ))}
          </View>
          <Text style={[styles.label, { color: display.color }]}>{display.label}</Text>
        </View>

        {!hasStableRating && (
          <View style={styles.newPlayerBadge}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.newPlayerText}>
              {rating.totalGamesPlayed} games played
            </Text>
          </View>
        )}
      </View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Pickup Rating</Text>
              <View style={styles.detailValue}>
                <Text style={styles.detailValueText}>
                  {rating.pickupRating.toFixed(1)}
                </Text>
                <Ionicons name="star" size={14} color="#6B7280" />
              </View>
              <Text style={styles.detailSubtext}>
                {rating.pickupGamesPlayed} games
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>League Rating</Text>
              <View style={styles.detailValue}>
                <Text style={styles.detailValueText}>
                  {rating.leagueRating.toFixed(1)}
                </Text>
                <Ionicons name="star" size={14} color="#6B7280" />
              </View>
              <Text style={styles.detailSubtext}>
                {rating.leagueGamesPlayed} games
              </Text>
            </View>
          </View>

          <View style={styles.totalGames}>
            <Ionicons name="trophy-outline" size={16} color="#6B7280" />
            <Text style={styles.totalGamesText}>
              {rating.totalGamesPlayed} total games played
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Rating based on peer votes from recent games
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainRating: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
  newPlayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  newPlayerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailValueText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  totalGames: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  totalGamesText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactRatingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  compactLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});
