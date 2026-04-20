import React from 'react';
import { ScrollView, Text, TextInput, StyleSheet } from 'react-native';
import { useCreateFacility } from './CreateFacilityContext';
import { fonts, useTheme } from '../../../theme';

export function Step3Contact() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateFacility();

  const setField = (field: string, value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>Contact info</Text>
      <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
        Optional details so players can reach you.
      </Text>

      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.white }]}
        value={state.contactName}
        onChangeText={v => setField('contactName', v)}
        placeholder="Contact name"
        placeholderTextColor={colors.inkSoft}
      />

      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.white }]}
        value={state.contactPhone}
        onChangeText={v => setField('contactPhone', v)}
        placeholder="Phone number"
        placeholderTextColor={colors.inkSoft}
        keyboardType="phone-pad"
      />

      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.white }]}
        value={state.contactEmail}
        onChangeText={v => setField('contactEmail', v)}
        placeholder="Email address"
        placeholderTextColor={colors.inkSoft}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.white }]}
        value={state.contactWebsite}
        onChangeText={v => setField('contactWebsite', v)}
        placeholder="Website URL"
        placeholderTextColor={colors.inkSoft}
        keyboardType="url"
        autoCapitalize="none"
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
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    marginBottom: 14,
  },
});
