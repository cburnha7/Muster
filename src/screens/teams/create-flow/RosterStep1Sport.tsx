import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SportIconGrid } from '../../../components/wizard/SportIconGrid';
import { useCreateRoster } from './CreateRosterContext';
import { fonts, useTheme } from '../../../theme';
import { SportType } from '../../../types';

export function RosterStep1Sport() {
  const { colors } = useTheme();
  const { dispatch } = useCreateRoster();
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>What sport?</Text>
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
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
});
