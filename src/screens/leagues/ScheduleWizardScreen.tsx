import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, useTheme } from '../../theme';

export function ScheduleWizardScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <Text style={[styles.heading, { color: colors.ink }]}>Schedule Wizard</Text>
      <Text style={[styles.body, { color: colors.inkSoft }]}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
  },
});
