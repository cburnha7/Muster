import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { useCreateFacility } from './CreateFacilityContext';
import { colors, fonts } from '../../../theme';

export function Step2Location() {
  const { state, dispatch } = useCreateFacility();

  const setField = (field: string, value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Where is it?</Text>

      <TextInput
        style={styles.textInput}
        value={state.street}
        onChangeText={(v) => setField('street', v)}
        placeholder="Street address"
        placeholderTextColor={colors.inkSoft}
      />

      <TextInput
        style={styles.textInput}
        value={state.city}
        onChangeText={(v) => setField('city', v)}
        placeholder="City"
        placeholderTextColor={colors.inkSoft}
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.textInput, styles.halfInput]}
          value={state.state}
          onChangeText={(v) => setField('state', v)}
          placeholder="State"
          placeholderTextColor={colors.inkSoft}
        />
        <TextInput
          style={[styles.textInput, styles.halfInput]}
          value={state.zipCode}
          onChangeText={(v) => setField('zipCode', v)}
          placeholder="ZIP code"
          placeholderTextColor={colors.inkSoft}
          keyboardType="numeric"
        />
      </View>
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
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
});
