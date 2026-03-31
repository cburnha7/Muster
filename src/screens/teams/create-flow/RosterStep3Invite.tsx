import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCreateRoster } from './CreateRosterContext';
import { RosterInviteItem } from './types';
import { colors, fonts } from '../../../theme';
import { API_BASE_URL } from '../../../services/api/config';

export function RosterStep3Invite() {
  const { state, dispatch } = useCreateRoster();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RosterInviteItem[]>([]);
  const [searching, setSearching] = useState(false);

  const privateSelected = state.visibility === 'private';
  const publicSelected = state.visibility === 'public';

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      // Search players
      const pRes = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(q)}&limit=10`);
      const pData = await pRes.json();
      const players: RosterInviteItem[] = (Array.isArray(pData) ? pData : pData.data || [])
        .map((u: any) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          type: 'player' as const,
          image: u.profileImage,
        }));
      // Search rosters
      const tRes = await fetch(`${API_BASE_URL}/teams?search=${encodeURIComponent(q)}`);
      const tData = await tRes.json();
      const rosters: RosterInviteItem[] = (Array.isArray(tData) ? tData : tData.data || [])
        .map((t: any) => ({ id: t.id, name: t.name, type: 'roster' as const, image: t.logo }));
      setResults([...rosters, ...players]);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    doSearch(text);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Who's invited?</Text>

      <View style={styles.visRow}>
        <TouchableOpacity
          style={[styles.visBtn, privateSelected && styles.visBtnActive]}
          onPress={() => dispatch({ type: 'SET_VISIBILITY', visibility: 'private' })}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed-outline" size={18} color={privateSelected ? colors.white : colors.ink} />
          <Text style={[styles.visText, privateSelected && styles.visTextActive]}>Private</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.visBtn, publicSelected && styles.visBtnActive]}
          onPress={() => dispatch({ type: 'SET_VISIBILITY', visibility: 'public' })}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color={publicSelected ? colors.white : colors.ink} />
          <Text style={[styles.visText, publicSelected && styles.visTextActive]}>Public</Text>
        </TouchableOpacity>
      </View>

      {privateSelected && (
        <>
          <Text style={styles.label}>Search Players & Rosters</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={colors.inkSoft}
            value={query}
            onChangeText={handleQueryChange}
          />
          {searching && <ActivityIndicator size="small" color={colors.cobalt} style={styles.loader} />}
          {results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item) => {
                const added = state.invitedItems.some((i) => i.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.resultRow}
                    onPress={() => { dispatch({ type: 'ADD_INVITE', item }); setQuery(''); setResults([]); }}
                    disabled={added}
                    activeOpacity={0.7}
                  >
                    {item.type === 'roster' ? (
                      <Ionicons name="people-outline" size={20} color={colors.inkSoft} />
                    ) : item.image ? (
                      <Image source={{ uri: item.image }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person-outline" size={20} color={colors.inkSoft} />
                    )}
                    <Text style={[styles.resultName, added && styles.resultMuted]}>{item.name}</Text>
                    {added && <Ionicons name="checkmark" size={16} color={colors.cobalt} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {state.invitedItems.length > 0 && (
            <View style={styles.chipList}>
              {state.invitedItems.map((item) => (
                <View key={item.id} style={styles.chip}>
                  {item.type === 'roster'
                    ? <Ionicons name="people-outline" size={14} color={colors.cobalt} />
                    : <Ionicons name="person-outline" size={14} color={colors.cobalt} />}
                  <Text style={styles.chipText}>{item.name}</Text>
                  <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_INVITE', id: item.id })}>
                    <Ionicons name="close-circle" size={16} color={colors.inkSoft} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {publicSelected && (
        <>
          <Text style={styles.label}>Minimum Player Rating</Text>
          <TextInput
            style={styles.input}
            placeholder="0 – 100"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minPlayerRating}
            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'minPlayerRating', value: v })}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.ink, marginBottom: 24 },
  label: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 8, marginTop: 16 },
  visRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  visBtnActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  visText: { fontFamily: fonts.ui, fontSize: 15, color: colors.ink },
  visTextActive: { color: colors.white },
  searchInput: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 12,
  },
  loader: { marginVertical: 8 },
  resultsList: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    marginBottom: 16, overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  resultName: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  resultMuted: { color: colors.inkSoft },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 16,
  },
});
