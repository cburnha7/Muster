import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { DependentSummary } from '../../types/dependent';

/**
 * DependentsSection
 *
 * Displays the guardian's list of dependents on the ProfileScreen.
 * Fetches from GET /api/dependents, shows empty state when none exist,
 * and provides navigation to add or view dependents.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export function DependentsSection() {
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const [dependents, setDependents] = useState<DependentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDependents = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/dependents`,
        {
          headers: { 'X-User-Id': authUser.id },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch dependents');
      const data: DependentSummary[] = await response.json();
      setDependents(data);
    } catch (error) {
      console.error('Failed to fetch dependents:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchDependents();
  }, [fetchDependents]);

  // Reload when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      fetchDependents();
    }, [fetchDependents])
  );

  const handleAddDependent = () => {
    (navigation as any).navigate('DependentForm', {});
  };

  const handleDependentPress = (dependent: DependentSummary) => {
    (navigation as any).navigate('DependentProfile', { dependentId: dependent.id });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Dependents</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.grass} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Dependents</Text>

      {dependents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color={colors.inkFaint} />
          <Text style={styles.emptyText}>
            No dependents added yet. Add a dependent to manage their account.
          </Text>
        </View>
      ) : (
        dependents.map((dependent) => (
          <TouchableOpacity
            key={dependent.id}
            style={styles.dependentCard}
            onPress={() => handleDependentPress(dependent)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`View ${dependent.firstName} ${dependent.lastName}'s profile`}
          >
            {dependent.profileImage ? (
              <Image source={{ uri: dependent.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color={colors.inkFaint} />
              </View>
            )}
            <Text style={styles.dependentName}>
              {dependent.firstName} {dependent.lastName}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddDependent}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add Dependent"
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.grass} />
        <Text style={styles.addButtonText}>Add Dependent</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  dependentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: colors.chalk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dependentName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    marginLeft: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grass,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.grass,
    marginLeft: Spacing.sm,
  },
});
