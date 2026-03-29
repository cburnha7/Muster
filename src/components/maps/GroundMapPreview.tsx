import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility } from '../../types';
import { colors, Spacing, TextStyles } from '../../theme';

interface GroundMapPreviewProps {
  ground: Facility;
  onPress: () => void;
  onClose: () => void;
}

export function GroundMapPreview({ ground, onPress, onClose }: GroundMapPreviewProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={colors.inkFaint} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <Ionicons name="business-outline" size={24} color={colors.cobalt} />
          <Text style={styles.title} numberOfLines={1}>
            {ground.name}
          </Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.detailText} numberOfLines={1}>
              {ground.street}, {ground.city}
            </Text>
          </View>
          {ground.courts && ground.courts.length > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="grid-outline" size={16} color={colors.inkFaint} />
              <Text style={styles.detailText}>
                {ground.courts.length} court{ground.courts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.viewButton}>View Details →</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingRight: 32,
  },
  title: {
    ...TextStyles.h4,
    color: colors.ink,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  details: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...TextStyles.body,
    color: colors.inkFaint,
    flex: 1,
  },
  footer: {
    alignItems: 'flex-end',
  },
  viewButton: {
    ...TextStyles.bodyLarge,
    color: colors.cobalt,
    fontWeight: '600',
  },
});
