import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateRoster } from './CreateRosterContext';
import { colors, fonts } from '../../../theme';

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'All', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export function RosterStep2Details() {
  const { state, dispatch } = useCreateRoster();
  const set = (field: string) => (value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>How's it set up?</Text>

      <Text style={styles.label}>Roster Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sunday Ballers"
        placeholderTextColor={colors.inkSoft}
        value={state.name}
        onChangeText={set('name')}
        autoFocus
      />

      <FormSelect
        label="Gender"
        placeholder="All"
        value={state.gender}
        options={GENDER_OPTIONS}
        onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'gender', value: v })}
      />

      <Text style={styles.label}>Age Limit</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            placeholder="Min Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minAge}
            onChangeText={set('minAge')}
          />
        </View>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            placeholder="Max Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.maxAge}
            onChangeText={set('maxAge')}
          />
        </View>
      </View>

      <Text style={styles.label}>Max Players</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10"
        placeholderTextColor={colors.inkSoft}
        keyboardType="numeric"
        value={state.maxPlayers}
        onChangeText={set('maxPlayers')}
      />

      <Text style={styles.label}>Price</Text>
      <View style={styles.priceRow}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder="0"
          placeholderTextColor={colors.inkSoft}
          keyboardType="decimal-pad"
          value={state.price}
          onChangeText={set('price')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.ink, marginBottom: 24 },
  label: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  dollar: { fontFamily: fonts.ui, fontSize: 18, color: colors.ink, marginRight: 8, marginBottom: 8 },
  priceInput: { flex: 1 },
});
