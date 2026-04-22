import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { PhotoUpload } from '../../../components/ui/PhotoUpload';
import { useCreateRoster } from './CreateRosterContext';
import { fonts, useTheme } from '../../../theme';

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'All', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export function RosterStep2Details() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateRoster();
  const set = (field: string) => (value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.white },
        { backgroundColor: colors.bgScreen },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        How's it set up?
      </Text>

      {/* Cover photo — becomes the header background on the roster detail screen */}
      <PhotoUpload
        value={state.coverImageUrl}
        onChange={url =>
          dispatch({ type: 'SET_FIELD', field: 'coverImageUrl', value: url })
        }
        context="rosters"
        shape="cover"
        label="Cover photo"
      />

      <Text style={[styles.label, { color: colors.ink }]}>Roster Name</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
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
        onValueChange={v =>
          dispatch({ type: 'SET_FIELD', field: 'gender', value: v })
        }
      />

      <Text style={[styles.label, { color: colors.ink }]}>Age Limit</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            placeholder="Min Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minAge}
            onChangeText={set('minAge')}
          />
        </View>
        <View style={styles.half}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            placeholder="Max Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.maxAge}
            onChangeText={set('maxAge')}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.ink }]}>Max Players</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
        placeholder="e.g. 10"
        placeholderTextColor={colors.inkSoft}
        keyboardType="numeric"
        value={state.maxPlayers}
        onChangeText={set('maxPlayers')}
      />

      <Text style={[styles.label, { color: colors.ink }]}>Price</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.dollar, { color: colors.ink }]}>$</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.ink,
            },
            styles.priceInput,
          ]}
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
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  dollar: {
    fontFamily: fonts.ui,
    fontSize: 18,
    marginRight: 8,
    marginBottom: 8,
  },
  priceInput: { flex: 1 },
});
