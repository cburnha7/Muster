import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';

export function ScheduleWizardScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <Text style={styles.heading}>Schedule Wizard</Text>
      <Text style={styles.body}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkSoft,
  },
});
