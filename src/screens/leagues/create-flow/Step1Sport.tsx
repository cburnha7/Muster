import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SportIconGrid } from '../../../components/wizard/SportIconGrid';
import { useCreateLeague } from './CreateLeagueContext';
import { fonts, useTheme } from '../../../theme';
import { SportType } from '../../../types';

export function Step1Sport() {
  const { colors } = useTheme();
  const { dispatch } = useCreateLeague();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>What sport?</Text>
      <SportIconGrid
        selected=""
        onSelect={(sport: string) =>
          dispatch({ type: 'SET_SPORT', sport: sport as SportType })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
});
