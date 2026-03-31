import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SportIconGrid } from '../../../components/wizard/SportIconGrid';
import { useCreateEvent } from './CreateEventContext';
import { colors, fonts } from '../../../theme';
import { SportType } from '../../../types';

export function Step1Sport() {
  const { state, dispatch } = useCreateEvent();

  const handleSelect = (sport: string) => {
    dispatch({ type: 'SET_SPORT', sport: sport as SportType });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>What are you playing?</Text>
      <SportIconGrid
        selected={state.sport || ''}
        onSelect={handleSelect}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
});
