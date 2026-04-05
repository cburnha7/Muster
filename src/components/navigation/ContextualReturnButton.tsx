import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, fonts } from '../../theme';

const RETURN_LABELS: Record<string, string> = {
  CreateEvent: 'Return to Event',
  Roster: 'Return to Roster',
  League: 'Return to League',
};

/**
 * Shows a contextual "Return to X" button when the screen was navigated to
 * from another flow via a `returnTo` route param. Hidden during normal tab navigation.
 */
export function ContextualReturnButton() {
  const navigation = useNavigation();
  const route = useRoute();
  const returnTo = (route.params as any)?.returnTo as string | undefined;

  if (!returnTo) return null;

  const label = RETURN_LABELS[returnTo] || `Return to ${returnTo}`;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.goBack()}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={16} color={colors.pine} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.pine,
  },
});
