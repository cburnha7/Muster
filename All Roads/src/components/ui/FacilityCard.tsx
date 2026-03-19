import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility, SportType } from '../../types';

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
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />
      );
    }

    return stars;
  };

  const formatAddress = () => {
    return `${facility.street}, ${facility.city}, ${facility.state}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(facility)}
      activeOpacity={0.7}
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
          <Text style={styles.name} numberOfLines={1}>
            {facility.name}
          </Text>
          <View style={styles.rating}>
            <View style={styles.stars}>
              {renderStars(facility.rating)}
            </View>
            <Text style={styles.ratingText}>
              {facility.rating.toFixed(1)} ({facility.reviewCount || 0})
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {facility.description}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatAddress()}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sportsContainer}>
            {facility.sportTypes.slice(0, 3).map((sport, index) => (
              <View key={sport} style={styles.sportBadge}>
                <Ionicons
                  name={getSportIcon(sport) as any}
                  size={16}
                  color="#007AFF"
                />
                <Text style={styles.sportText}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </Text>
              </View>
            ))}
            {facility.sportTypes.length > 3 && (
              <Text style={styles.moreText}>
                +{facility.sportTypes.length - 3} more
              </Text>
            )}
          </View>

          <View style={styles.pricing}>
            {facility.pricePerHour && (
              <Text style={styles.price}>
                ${facility.pricePerHour}/hr
              </Text>
            )}
          </View>
        </View>

        {facility.amenities && facility.amenities.length > 0 && (
          <View style={styles.amenities}>
            <Text style={styles.amenitiesTitle}>Amenities:</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    fontSize: 12,
    color: '#666',
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
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  sportText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  pricing: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  amenities: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  amenitiesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  amenitiesText: {
    fontSize: 12,
    color: '#666',
  },
});