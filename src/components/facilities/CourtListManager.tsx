import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Court, courtService } from '../../services/api/CourtService';
import { colors, Spacing } from '../../theme';

interface CourtListManagerProps {
  courts: Court[];
  facilityId: string;
  onCourtUpdated: () => void;
  onEditCourt: (court: Court) => void;
  onAddCourt: () => void;
}

export const CourtListManager: React.FC<CourtListManagerProps> = ({
  courts,
  facilityId,
  onCourtUpdated,
  onEditCourt,
  onAddCourt,
}) => {
  const handleDeleteCourt = (court: Court) => {
    Alert.alert(
      'Delete Court',
      `Are you sure you want to delete "${court.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await courtService.deleteCourt(facilityId, court.id);
              Alert.alert('Success', 'Court deleted successfully');
              onCourtUpdated();
            } catch (error: any) {
              console.error('Delete court error:', error);
              const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete court';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (court: Court) => {
    try {
      await courtService.updateCourt(facilityId, court.id, {
        isActive: !court.isActive,
      });
      Alert.alert(
        'Success',
        `Court ${court.isActive ? 'deactivated' : 'activated'} successfully`
      );
      onCourtUpdated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update court status');
    }
  };

  if (courts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="basketball-outline" size={64} color={colors.soft} />
        <Text style={styles.emptyStateTitle}>No Courts Yet</Text>
        <Text style={styles.emptyStateText}>
          Add courts or fields to start managing availability and rentals
        </Text>
        <TouchableOpacity style={styles.emptyStateButton} onPress={onAddCourt}>
          <Text style={styles.emptyStateButtonText}>Add Your First Court</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courts.map((court) => (
        <View key={court.id} style={styles.courtCard}>
          <View style={styles.courtHeader}>
            <View style={styles.courtInfo}>
              <Text style={styles.courtName}>{court.name}</Text>
              <Text style={styles.courtDetails}>
                {court.sportType} • {court.isIndoor ? 'Indoor' : 'Outdoor'} • Capacity: {court.capacity}
              </Text>
              {court.pricePerHour && (
                <Text style={styles.courtPrice}>${court.pricePerHour}/hour</Text>
              )}
            </View>
            <View style={[styles.statusBadge, !court.isActive && styles.statusBadgeInactive]}>
              <Text style={[styles.statusText, !court.isActive && styles.statusTextInactive]}>
                {court.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.courtActions}>
            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => onEditCourt(court)}
            >
              <Ionicons name="create-outline" size={20} color={colors.pine} />
              <Text style={styles.courtActionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => handleToggleActive(court)}
            >
              <Ionicons
                name={court.isActive ? 'pause-outline' : 'play-outline'}
                size={20}
                color={colors.navy}
              />
              <Text style={[styles.courtActionText, { color: colors.navy }]}>
                {court.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => handleDeleteCourt(court)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.heart} />
              <Text style={[styles.courtActionText, { color: colors.heart }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  courtCard: {
    backgroundColor: colors.background,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  courtDetails: {
    fontSize: 14,
    color: colors.soft,
    marginBottom: 4,
  },
  courtPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pine,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.pineLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.soft,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.pine,
  },
  statusTextInactive: {
    color: colors.surface,
  },
  courtActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  courtActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  courtActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pine,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.soft,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.pine,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
