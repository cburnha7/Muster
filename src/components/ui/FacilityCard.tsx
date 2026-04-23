import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
import { Facility, SportType } from '../../types';
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';
import { formatSportType } from '../../utils/formatters';

interface FacilityCardProps {
  facility: Facility;
  onPress?: (facility: Facility) => void;
  style?: any;
  compact?: boolean;
}

const FacilityCardInner: React.FC<FacilityCardProps> = ({
  facility,
  onPress,
  style,
  compact = false,
}) => {
  const { colors } = useTheme();

  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball-outline';
      case SportType.SOCCER:
        return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL:
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color={colors.gold} />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color={colors.gold} />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color={colors.gold}
        />
      );
    }
    return stars;
  };

  const formatAddress = () =>
    `${facility.street}, ${facility.city}, ${facility.state}`;

  return (
    <PressableCard
      style={[styles.container, { backgroundColor: colors.surface }, style]}
      onPress={() => onPress?.(facility)}
    >
      {facility.imageUrl && (
        <Image
          source={{ uri: facility.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {facility.name}
          </Text>
          <View style={styles.rating}>
            <View style={styles.stars}>{renderStars(facility.rating)}</View>
            <Text style={[styles.ratingText, { color: colors.inkSecondary }]}>
              {facility.rating.toFixed(1)} ({facility.reviewCount || 0})
            </Text>
          </View>
        </View>

        <Text
          style={[styles.description, { color: colors.inkSecondary }]}
          numberOfLines={2}
        >
          {facility.description}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.inkSecondary}
            />
            <Text
              style={[styles.detailText, { color: colors.inkSecondary }]}
              numberOfLines={1}
            >
              {formatAddress()}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sportsContainer}>
            {facility.sportTypes.slice(0, 3).map(sport => (
              <View
                key={sport}
                style={[
                  styles.sportBadge,
                  { backgroundColor: colors.cobaltLight },
                ]}
              >
                <Ionicons
                  name={getSportIcon(sport) as any}
                  size={14}
                  color={colors.cobalt}
                />
                <Text style={[styles.sportText, { color: colors.cobalt }]}>
                  {formatSportType(sport)}
                </Text>
              </View>
            ))}
            {facility.sportTypes.length > 3 && (
              <Text style={[styles.moreText, { color: colors.inkSecondary }]}>
                +{facility.sportTypes.length - 3} more
              </Text>
            )}
          </View>

          {facility.pricePerHour && (
            <Text style={[styles.price, { color: colors.cobalt }]}>
              ${facility.pricePerHour}/hr
            </Text>
          )}
        </View>

        {facility.amenities && facility.amenities.length > 0 && (
          <View style={[styles.amenities, { borderTopColor: colors.border }]}>
            <Text style={[styles.amenitiesTitle, { color: colors.ink }]}>
              Amenities
            </Text>
            <Text
              style={[styles.amenitiesText, { color: colors.inkSecondary }]}
              numberOfLines={1}
            >
              {facility.amenities.slice(0, 3).join(', ')}
              {facility.amenities.length > 3 && '...'}
            </Text>
          </View>
        )}
      </View>
    </PressableCard>
  );
};

export const FacilityCard = React.memo(FacilityCardInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: tokenRadius.lg,
    marginVertical: 6,
    marginHorizontal: tokenSpacing.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: tokenSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokenSpacing.sm,
  },
  name: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 17,
    flex: 1,
    marginRight: tokenSpacing.sm,
  },
  rating: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
  },
  description: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: tokenSpacing.md,
  },
  details: {
    marginBottom: tokenSpacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokenSpacing.xs,
  },
  detailText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    marginLeft: tokenSpacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokenSpacing.sm,
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
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.pill,
    gap: tokenSpacing.xs,
  },
  sportText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
  },
  moreText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
    fontStyle: 'italic',
  },
  price: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 16,
  },
  amenities: {
    borderTopWidth: 1,
    paddingTop: tokenSpacing.sm,
  },
  amenitiesTitle: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 12,
    marginBottom: tokenSpacing.xs,
  },
  amenitiesText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
  },
});
