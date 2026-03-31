import React from 'react';
import { ScrollView, Text, TextInput, StyleSheet } from 'react-native';
import { SportIconGrid } from '../../../components/wizard/SportIconGrid';
import { useCreateFacility } from './CreateFacilityContext';
import { SportType } from '../../../types';
import { colors, fonts } from '../../../theme';

export function Step1NameSports() {
  const { state, dispatch } = useCreateFacility();

  const toggleSport = (sport: string) => {
    const current = state.sportTypes;
    const typed = sport as SportType;
    const next = current.includes(typed)
      ? current.filter((s) => s !== typed)
      : [...current, typed];
    dispatch({ type: 'SET_FIELD', field: 'sportTypes', value: next });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Name your ground</Text>

      <TextInput
        style={styles.textInput}
        value={state.name}
        onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'name', value: v })}
        placeholder="Ground name"
        placeholderTextColor={colors.inkSoft}
      />

      <Text style={styles.fieldLabel}>Sport types</Text>
      <SportIconGrid
        selected={state.sportTypes}
        onSelect={toggleSport}
        multiSelect
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
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
