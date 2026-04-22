import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { useCreateFacility } from './CreateFacilityContext';
import { fonts, useTheme } from '../../../theme';
import { AddressAutocomplete } from '../../../components/forms/AddressAutocomplete';

export function Step2Location() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateFacility();

  const setField = (field: string, value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>Where is it?</Text>

      <AddressAutocomplete
        value={state.street}
        onChangeText={v => setField('street', v)}
        onAddressSelected={addr => {
          setField('street', addr.street || addr.formatted);
          setField('city', addr.city);
          setField('state', addr.state);
          setField('zipCode', addr.zipCode);
          if (addr.latitude != null) {
            dispatch({
              type: 'SET_FIELD',
              field: 'latitude',
              value: addr.latitude,
            });
          }
          if (addr.longitude != null) {
            dispatch({
              type: 'SET_FIELD',
              field: 'longitude',
              value: addr.longitude,
            });
          }
        }}
        label="Address"
        placeholder="Search address..."
      />

      <TextInput
        style={[
          styles.textInput,
          {
            borderColor: colors.border,
            color: colors.ink,
            backgroundColor: colors.surface,
          },
        ]}
        value={state.city}
        onChangeText={v => setField('city', v)}
        placeholder="City"
        placeholderTextColor={colors.inkMuted}
      />

      <View style={styles.row}>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: colors.border,
              color: colors.ink,
              backgroundColor: colors.surface,
            },
            styles.halfInput,
          ]}
          value={state.state}
          onChangeText={v => setField('state', v)}
          placeholder="State"
          placeholderTextColor={colors.inkMuted}
        />
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: colors.border,
              color: colors.ink,
              backgroundColor: colors.surface,
            },
            styles.halfInput,
          ]}
          value={state.zipCode}
          onChangeText={v => setField('zipCode', v)}
          placeholder="ZIP code"
          placeholderTextColor={colors.inkMuted}
          keyboardType="numeric"
        />
      </View>
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
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
});
