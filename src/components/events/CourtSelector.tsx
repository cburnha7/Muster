import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';

interface Court {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
}

interface CourtSelectorProps {
  facilityId: string;
  selectedCourtId?: string;
  onCourtSelect: (courtId: string, court: Court) => void;
}

export function CourtSelector({ facilityId, selectedCourtId, onCourtSelect }: CourtSelectorProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourts();
  }, [facilityId]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts`
      );

      if (!response.ok) {
        throw new Error('Failed to load courts');
      }

      const data = await response.json();
      setCourts(data);
    } catch (error) {
      console.error('Load courts error:', error);
      Alert.alert('Error', 'Failed to load courts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.pine} />
        <Text style={styles.loadingText}>Loading courts...</Text>
      </View>
    );
  }

  if (courts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.soft} />
        <Text style={styles.emptyText}>No courts available at this facility</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Court/Field</Text>
      <View style={styles.courtList}>
        {courts.map((court) => (
          <TouchableOpacity
            key={court.id}
            style={[
              styles.courtCard,
              selectedCourtId === court.id && styles.courtCardSelected,
            ]}
            onPress={() => onCourtSelect(court.id, court)}
            activeOpacity={0.7}
          >
            <View style={styles.courtCardHeader}>
              <View style={styles.courtCardTitle}>
                <Ionicons
                  name={court.isIndoor ? 'home' : 'sunny'}
                  size={20}
                  color={selectedCourtId === court.id ? colors.pine : colors.ink}
                />
                <Text
                  style={[
                    styles.courtName,
                    selectedCourtId === court.id && styles.courtNameSelected,
                  ]}
                >
                  {court.name}
                </Text>
              </View>
              {selectedCourtId === court.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.pine} />
              )}
            </View>
            <View style={styles.courtCardDetails}>
              <View style={styles.courtDetail}>
                <Ionicons name="basketball-outline" size={16} color={colors.soft} />
                <Text style={styles.courtDetailText}>{court.sportType}</Text>
              </View>
              <View style={styles.courtDetail}>
                <Ionicons name="people-outline" size={16} color={colors.soft} />
                <Text style={styles.courtDetailText}>Capacity: {court.capacity}</Text>
              </View>
              <View style={styles.courtDetail}>
                <Ionicons
                  name={court.isIndoor ? 'home-outline' : 'sunny-outline'}
                  size={16}
                  color={colors.soft}
                />
                <Text style={styles.courtDetailText}>
                  {court.isIndoor ? 'Indoor' : 'Outdoor'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  courtList: {
    gap: Spacing.md,
  },
  courtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  courtCardSelected: {
    backgroundColor: colors.pine + '10',
    shadowColor: colors.pine,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  courtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  courtCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  courtName: {
    ...TextStyles.h4,
    color: colors.ink,
  },
  courtNameSelected: {
    color: colors.pine,
    fontWeight: '700',
  },
  courtCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  courtDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courtDetailText: {
    ...TextStyles.caption,
    color: colors.soft,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...TextStyles.body,
    color: colors.soft,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    ...TextStyles.body,
    color: colors.soft,
    textAlign: 'center',
  },
});
