import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { colors, fonts } from '../../theme';
import { selectDependents } from '../../store/slices/contextSlice';

const DEPENDENT_COLORS = ['#E8720C', '#8B5CF6', '#0D9488', '#DC2626'];

/**
 * Shows a compact card per dependent for guardian users.
 * Displays on the Home screen so parents can see their family at a glance.
 */
export function FamilyPulseSection() {
  const navigation = useNavigation();
  const dependents = useSelector(selectDependents);

  if (dependents.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Family</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dependents.map((dep, i) => {
          const color = DEPENDENT_COLORS[i % DEPENDENT_COLORS.length]!;
          const initial = dep.firstName?.charAt(0)?.toUpperCase() ?? '?';
          const age = Math.floor(
            (Date.now() - new Date(dep.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );

          return (
            <TouchableOpacity
              key={dep.id}
              style={styles.card}
              onPress={() => (navigation as any).navigate('DependentProfile', { dependentId: dep.id })}
              activeOpacity={0.8}
            >
              <View style={[styles.depAvatar, { backgroundColor: color }]}>
                <Text style={styles.depInitial}>{initial}</Text>
              </View>
              <Text style={styles.depName} numberOfLines={1}>{dep.firstName}</Text>
              <Text style={styles.depAge}>Age {age}</Text>
              <TouchableOpacity
                style={styles.findGameCta}
                onPress={() => (navigation as any).getParent()?.navigate('Home', { screen: 'HomeScreen' })}
              >
                <Text style={styles.findGameText}>Find game →</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    width: 120,
    alignItems: 'center',
    gap: 6,
  },
  depAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depInitial: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
  depName: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
  },
  depAge: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  findGameCta: {
    marginTop: 2,
  },
  findGameText: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.primary,
  },
});
