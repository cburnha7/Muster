import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility, SportType } from '../../types';
import { colors, fonts } from '../../theme';

interface FacilityCardProps {
  facility: Facility;
  onPress?: (facility: Facility) => void;
  style?: any;
  compact?: boolean;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  onPress,
  style,
  compact = false,
}) => {
  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL: return 'basketball-outline';
      case SportType.SOCCER: return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL: return 'tennisball-outline';
      case SportType.VOLLEYBALL: return 'american-football-outline';
      case SportType.SOFTBALL:
      case SportType.BASEBALL: return 'baseball-outline';
      case SportType.FLAG_FOOTBALL: return 'flag-outline';
      case SportType.KICKBALL: return 'football-outline';
      default: return 'fitness-outline';
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color={colors.gold} />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color={colors.gold} />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color={colors.gold} />);
    }
    return stars;
  };

  const formatAddress = () => `${facility.street}, ${facility.city}, ${facility.state}`;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(facility)}
      activeOpacity={0.85}
    >
      {facility.imageUrl && (
        <Image source={{ uri: facility.imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{facility.name}</Text>
          <View style={styles.rating}>
            <View style={styles.stars}>{renderStars(facility.rating)}</View>
            <Text style={styles.ratingText}>
              {facility.rating.toFixed(1)} ({facility.reviewCount || 0})
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{facility.description}</Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.detailText} numberOfLines={1}>{formatAddress()}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sportsContainer}>
            {facility.sportTypes.slice(0, 3).map((sport) => (
              <View key={sport} style={styles.sportBadge}>
                <Ionicons name={getSportIcon(sport) as any} size={14} color={colors.primary} />
                <Text style={styles.sportText}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </Text>
              </View>
            ))}
            {facility.sportTypes.length > 3 && (
              <Text style={styles.moreText}>+{facility.sportTypes.length - 3} more</Text>
            )}
          </View>

          {facility.pricePerHour && (
            <Text style={styles.price}>${facility.pricePerHour}/hr</Text>
          )}
        </View>

        {facility.amenities && facility.amenities.length > 0 && (
          <View style={styles.amenities}>
            <Text style={styles.amenitiesTitle}>Amenities</Text>
            <Text style={styles.amenitiesText} numberOfLines={1}>
              {facility.amenities.slice(0, 3).join(', ')}
              {facility.amenities.length > 3 && '...'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  rating: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
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
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sportsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  sportText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.primary,
  },
  moreText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  price: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.primary,
  },
  amenities: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: 8,
  },
  amenitiesTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurface,
    marginBottom: 4,
  },
  amenitiesText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
