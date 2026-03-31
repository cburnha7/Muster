import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCreateEvent } from './CreateEventContext';
import { colors, fonts } from '../../../theme';
import { EventType } from '../../../types';
import { InviteItem } from './types';
import { API_BASE_URL } from '../../../services/api/config';

export function Step5Invite() {
  const { state, dispatch } = useCreateEvent();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InviteItem[]>([]);
  const [searching, setSearching] = useState(false);

  const isGame = state.eventType === EventType.GAME;

  const handleVisibility = (vis: 'private' | 'public') => {
    dispatch({ type: 'SET_VISIBILITY', visibility: vis });
  };

  const doSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        // For game events, search rosters only
        const url = `${API_BASE_URL}/teams?search=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        const rosters: InviteItem[] = (data ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          type: 'roster' as const,
          image: t.logo,
        }));

        if (isGame) {
          setSearchResults(rosters);
        } else {
          // For practice/pickup, also search players
          try {
            const pRes = await fetch(
              `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`,
            );
            const pData = await pRes.json();
            const players: InviteItem[] = (pData ?? []).map((u: any) => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName}`.trim(),
              type: 'player' as const,
              image: u.profileImage,
            }));
            setSearchResults([...rosters, ...players]);
          } catch {
            setSearchResults(rosters);
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [isGame],
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    doSearch(text);
  };

  const handleAddInvite = (item: InviteItem) => {
    dispatch({ type: 'ADD_INVITE', item });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveInvite = (id: string) => {
    dispatch({ type: 'REMOVE_INVITE', id });
  };

  const privateSelected = state.visibility === 'private';
  const publicSelected = state.visibility === 'public';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Who's invited?</Text>

      <View style={styles.visibilityRow}>
        <TouchableOpacity
          style={[styles.visButton, privateSelected && styles.visButtonActive]}
          onPress={() => handleVisibility('private')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={privateSelected ? colors.white : colors.ink}
          />
          <Text style={[styles.visText, privateSelected && styles.visTextActive]}>
            Private
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.visButton, publicSelected && styles.visButtonActive]}
          onPress={() => handleVisibility('public')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={publicSelected ? colors.white : colors.ink}
          />
          <Text style={[styles.visText, publicSelected && styles.visTextActive]}>
            Public
          </Text>
        </TouchableOpacity>
      </View>

      {privateSelected && (
        <>
          <Text style={styles.label}>
            {isGame ? 'Search Rosters' : 'Search Rosters & Players'}
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder={isGame ? 'Search rosters...' : 'Search rosters or players...'}
            placeholderTextColor={colors.inkSoft}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />

          {searching && (
            <ActivityIndicator size="small" color={colors.cobalt} style={styles.loader} />
          )}

          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map((item) => {
                const alreadyAdded = state.invitedItems.some((i) => i.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.resultRow}
                    onPress={() => handleAddInvite(item)}
                    disabled={alreadyAdded}
                    activeOpacity={0.7}
                  >
                    {item.type === 'roster' ? (
                      <Ionicons name="people-outline" size={20} color={colors.inkSoft} />
                    ) : item.image ? (
                      <Image source={{ uri: item.image }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person-outline" size={20} color={colors.inkSoft} />
                    )}
                    <Text
                      style={[styles.resultName, alreadyAdded && styles.resultNameMuted]}
                    >
                      {item.name}
                    </Text>
                    {alreadyAdded && (
                      <Ionicons name="checkmark" size={16} color={colors.cobalt} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {state.invitedItems.length > 0 && (
            <View style={styles.chipsContainer}>
              {state.invitedItems.map((item) => (
                <View key={item.id} style={styles.chip}>
                  {item.type === 'roster' ? (
                    <Ionicons name="people-outline" size={14} color={colors.cobalt} />
                  ) : (
                    <Ionicons name="person-outline" size={14} color={colors.cobalt} />
                  )}
                  <Text style={styles.chipText}>{item.name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveInvite(item.id)}>
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
            onChangeText={(v) =>
              dispatch({ type: 'SET_FIELD', field: 'minPlayerRating', value: v })
            }
          />
        </>
      )}
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
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  visButton: {
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
  visButtonActive: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  visText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
  visTextActive: {
    color: colors.white,
  },
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
  loader: {
    marginVertical: 8,
  },
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
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  resultName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  resultNameMuted: {
    color: colors.inkSoft,
  },
  chipsContainer: {
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
  chipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
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
    marginBottom: 16,
  },
});
