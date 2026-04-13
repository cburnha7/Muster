import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateLeague } from './CreateLeagueContext';
import { LeagueRosterInvite } from './types';
import { colors, fonts, useTheme } from '../../../theme';
import { API_BASE_URL } from '../../../services/api/config';
import { SkillLevel } from '../../../types';

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'All', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const SKILL_OPTIONS: SelectOption[] = [
  { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  { label: 'Beginner', value: SkillLevel.BEGINNER },
  { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
  { label: 'Advanced', value: SkillLevel.ADVANCED },
];

export function Step4Who() {
  const { colors: themeColors } = useTheme();
  const { state, dispatch } = useCreateLeague();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeagueRosterInvite[]>([]);
  const [searching, setSearching] = useState(false);

  const privateSelected = state.visibility === 'private';
  const publicSelected = state.visibility === 'public';

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/teams?search=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const rosters: LeagueRosterInvite[] = (
        Array.isArray(data) ? data : data.data || []
      ).map((t: any) => ({ id: t.id, name: t.name }));
      setResults(rosters);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    doSearch(text);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Who can join?</Text>

      {/* Gender */}
      <FormSelect
        label="Gender"
        placeholder="All"
        value={state.gender}
        options={GENDER_OPTIONS}
        onValueChange={v =>
          dispatch({ type: 'SET_FIELD', field: 'gender', value: v })
        }
      />

      {/* Age Limit */}
      <Text style={styles.label}>Age Limit</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            placeholder="Min Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minAge}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'minAge', value: v })
            }
          />
        </View>
        <View style={styles.half}>
          <TextInput
            style={styles.input}
            placeholder="Max Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.maxAge}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'maxAge', value: v })
            }
          />
        </View>
      </View>

      {/* Skill Level */}
      <FormSelect
        label="Skill Level"
        placeholder="All Levels"
        value={state.skillLevel}
        options={SKILL_OPTIONS}
        onValueChange={v =>
          dispatch({ type: 'SET_FIELD', field: 'skillLevel', value: v })
        }
      />

      {/* Visibility toggle */}
      <Text style={styles.label}>Visibility</Text>
      <View style={styles.visRow}>
        <TouchableOpacity
          style={[styles.visBtn, privateSelected && styles.visBtnActive]}
          onPress={() =>
            dispatch({ type: 'SET_VISIBILITY', visibility: 'private' })
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={privateSelected ? colors.white : colors.ink}
          />
          <Text
            style={[styles.visText, privateSelected && styles.visTextActive]}
          >
            Private
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.visBtn, publicSelected && styles.visBtnActive]}
          onPress={() =>
            dispatch({ type: 'SET_VISIBILITY', visibility: 'public' })
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={publicSelected ? colors.white : colors.ink}
          />
          <Text
            style={[styles.visText, publicSelected && styles.visTextActive]}
          >
            Public
          </Text>
        </TouchableOpacity>
      </View>

      {/* Private: roster search */}
      {privateSelected && (
        <>
          <Text style={styles.label}>Search Rosters</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={colors.inkSoft}
            value={query}
            onChangeText={handleQueryChange}
          />
          {searching && (
            <ActivityIndicator
              size="small"
              color={colors.cobalt}
              style={styles.loader}
            />
          )}
          {results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map(roster => {
                const added = state.invitedRosters.some(
                  r => r.id === roster.id
                );
                return (
                  <TouchableOpacity
                    key={roster.id}
                    style={styles.resultRow}
                    onPress={() => {
                      dispatch({ type: 'ADD_ROSTER', roster });
                      setQuery('');
                      setResults([]);
                    }}
                    disabled={added}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={colors.inkSoft}
                    />
                    <Text
                      style={[styles.resultName, added && styles.resultMuted]}
                    >
                      {roster.name}
                    </Text>
                    {added && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.cobalt}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {state.invitedRosters.length > 0 && (
            <View style={styles.chipList}>
              {state.invitedRosters.map(roster => (
                <View key={roster.id} style={styles.chip}>
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={colors.cobalt}
                  />
                  <Text style={styles.chipText}>{roster.name}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      dispatch({ type: 'REMOVE_ROSTER', id: roster.id })
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.inkSoft}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Public: minimum player rating */}
      {publicSelected && (
        <>
          <Text style={styles.label}>Minimum Player Rating</Text>
          <TextInput
            style={styles.input}
            placeholder="0 – 100"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minPlayerRating}
            onChangeText={v =>
              dispatch({
                type: 'SET_FIELD',
                field: 'minPlayerRating',
                value: v,
              })
            }
          />
        </>
      )}
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
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  visRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  visBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visBtnActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  visText: { fontFamily: fonts.ui, fontSize: 15, color: colors.ink },
  visTextActive: { color: colors.white },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  loader: { marginVertical: 8 },
  resultsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  resultMuted: { color: colors.inkSoft },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
