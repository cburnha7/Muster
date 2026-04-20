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
import { Spacing, useTheme } from '../../theme';

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
  const { colors } = useTheme();
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
        <Ionicons name="basketball-outline" size={64} color={colors.inkFaint} />
        <Text style={[styles.emptyStateTitle, { color: colors.ink }]}>No Courts Yet</Text>
        <Text style={[styles.emptyStateText, { color: colors.inkFaint }]}>
          Add courts or fields to start managing availability and rentals
        </Text>
        <TouchableOpacity style={[styles.emptyStateButton, { backgroundColor: colors.cobalt }]} onPress={onAddCourt}>
          <Text style={[styles.emptyStateButtonText, { color: colors.surface }]}>Add Your First Court</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courts.map((court) => (
        <View key={court.id} style={[styles.courtCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.courtHeader}>
            <View style={styles.courtInfo}>
              <Text style={[styles.courtName, { color: colors.ink }]}>{court.name}</Text>
              <Text style={[styles.courtDetails, { color: colors.inkFaint }]}>
                {court.sportType} â€¢ {court.isIndoor ? 'Indoor' : 'Outdoor'} â€¢ Capacity: {court.capacity}
              </Text>
              {court.pricePerHour && (
                <Text style={[styles.courtPrice, { color: colors.cobalt }]}>${court.pricePerHour}/hour</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.cobaltLight }, !court.isActive && styles.statusBadgeInactive, !court.isActive && { backgroundColor: colors.inkFaint }]}>
              <Text style={[styles.statusText, { color: colors.cobalt }, !court.isActive && styles.statusTextInactive, !court.isActive && { color: colors.surface }]}>
                {court.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={[styles.courtActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => onEditCourt(court)}
            >
              <Ionicons name="create-outline" size={20} color={colors.cobalt} />
              <Text style={[styles.courtActionText, { color: colors.cobalt }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => handleToggleActive(court)}
            >
              <Ionicons
                name={court.isActive ? 'pause-outline' : 'play-outline'}
                size={20}
                color={colors.ink}
              />
              <Text style={[styles.courtActionText, { color: colors.cobalt }, { color: colors.ink }]}>
                {court.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.courtActionButton}
              onPress={() => handleDeleteCourt(court)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.heart} />
              <Text style={[styles.courtActionText, { color: colors.cobalt }, { color: colors.heart }]}>Delete</Text>
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
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  courtDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  courtPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  statusBadgeInactive: {},
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextInactive: {},
  courtActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  courtActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  courtActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
