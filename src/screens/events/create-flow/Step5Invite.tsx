import React, { useState, useCallback, useMemo } from 'react';
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
import { AvailabilityIndicator } from '../../../components/ui/AvailabilityIndicator';
import { useAvailabilityCheck } from '../../../hooks/useAvailabilityCheck';
import { InviteToMusterModal } from '../../../components/invite/InviteToMusterModal';
import { fonts, useTheme } from '../../../theme';
import { EventType } from '../../../types';
import { InviteItem } from './types';
import { API_BASE_URL } from '../../../services/api/config';
import TokenStorage from '../../../services/auth/TokenStorage';

export function Step5Invite() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InviteItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isGame = state.eventType === EventType.GAME;

  // Build date windows for availability check
  const dateWindows = useMemo(() => {
    const fmt = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (
      state.recurring &&
      state.occurrenceLocations.length > 0 &&
      state.startTime &&
      state.endTime
    ) {
      return state.occurrenceLocations.map(occ => ({
        date: occ.date,
        startTime: fmt(state.startTime!),
        endTime: fmt(state.endTime!),
      }));
    }
    if (state.startDate && state.startTime && state.endTime) {
      return [
        {
          date: fmtDate(state.startDate),
          startTime: fmt(state.startTime),
          endTime: fmt(state.endTime),
        },
      ];
    }
    return [];
  }, [
    state.startDate,
    state.startTime,
    state.endTime,
    state.recurring,
    state.occurrenceLocations,
  ]);

  const playerIds = useMemo(
    () => state.invitedItems.filter(i => i.type === 'player').map(i => i.id),
    [state.invitedItems]
  );
  const rosterInviteIds = useMemo(
    () => state.invitedItems.filter(i => i.type === 'roster').map(i => i.id),
    [state.invitedItems]
  );
  const { availability } = useAvailabilityCheck(
    playerIds,
    rosterInviteIds,
    dateWindows
  );

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
              `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`
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
    [isGame]
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

  const handleInviteToMuster = useCallback(
    (name: string, email: string) => {
      dispatch({
        type: 'ADD_INVITE',
        item: {
          id: `pending-${Date.now()}`,
          name: name,
          type: 'player' as const,
          pending: true,
          email: email,
        },
      });
      setShowInviteModal(false);

      // Send invite email via server (best-effort — don't block UX)
      TokenStorage.getAccessToken()
        .then(token =>
          fetch(`${API_BASE_URL}/invites/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name,
              email,
              context: 'event',
            }),
          })
        )
        .catch(err => console.warn('Invite email failed:', err));
    },
    [dispatch]
  );

  const privateSelected = state.visibility === 'private';
  const publicSelected = state.visibility === 'public';

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.white },
        { backgroundColor: colors.bgScreen },
      ]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        Who's invited?
      </Text>

      <View style={styles.visibilityRow}>
        <TouchableOpacity
          style={[
            styles.visButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            privateSelected && styles.visButtonActive,
            privateSelected && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
          onPress={() => handleVisibility('private')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={privateSelected ? colors.white : colors.ink}
          />
          <Text
            style={[
              styles.visText,
              { color: colors.ink },
              privateSelected && styles.visTextActive,
              privateSelected && { color: colors.white },
            ]}
          >
            Private
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.visButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            publicSelected && styles.visButtonActive,
            publicSelected && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
          onPress={() => handleVisibility('public')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={publicSelected ? colors.white : colors.ink}
          />
          <Text
            style={[
              styles.visText,
              { color: colors.ink },
              publicSelected && styles.visTextActive,
              publicSelected && { color: colors.white },
            ]}
          >
            Public
          </Text>
        </TouchableOpacity>
      </View>

      {privateSelected && (
        <>
          <Text style={[styles.label, { color: colors.ink }]}>
            {isGame ? 'Search Rosters' : 'Search Rosters & Players'}
          </Text>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            placeholder={
              isGame ? 'Search rosters...' : 'Search rosters or players...'
            }
            placeholderTextColor={colors.inkSoft}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />

          {searching && (
            <ActivityIndicator
              size="small"
              color={colors.cobalt}
              style={styles.loader}
            />
          )}

          {searchResults.length > 0 && (
            <View
              style={[
                styles.resultsList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {searchResults.map(item => {
                const alreadyAdded = state.invitedItems.some(
                  i => i.id === item.id
                );
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.resultRow,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleAddInvite(item)}
                    disabled={alreadyAdded}
                    activeOpacity={0.7}
                  >
                    {item.type === 'roster' ? (
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={colors.inkSoft}
                      />
                    ) : item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.avatar}
                      />
                    ) : (
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={colors.inkSoft}
                      />
                    )}
                    <Text
                      style={[
                        styles.resultName,
                        { color: colors.ink },
                        alreadyAdded && styles.resultNameMuted,
                        alreadyAdded && { color: colors.inkSoft },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {alreadyAdded && (
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

          <TouchableOpacity
            style={[styles.inviteToMusterBtn, { borderColor: colors.cobalt }]}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={colors.cobalt}
            />
            <Text style={[styles.inviteToMusterText, { color: colors.cobalt }]}>
              Invite to Muster
            </Text>
          </TouchableOpacity>

          {state.invitedItems.length > 0 && (
            <View style={styles.chipsContainer}>
              {state.invitedItems.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.inviteeCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.inviteeRow}>
                    {item.type === 'roster' ? (
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color={colors.cobalt}
                      />
                    ) : (
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color={colors.cobalt}
                      />
                    )}
                    <Text style={[styles.chipText, { color: colors.ink }]}>
                      {item.name}
                    </Text>
                    {(item as any).pending && (
                      <View
                        style={[
                          styles.pendingBadge,
                          { backgroundColor: colors.gold },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pendingBadgeText,
                            { color: colors.white },
                          ]}
                        >
                          Pending
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveInvite(item.id)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.inkSoft}
                      />
                    </TouchableOpacity>
                  </View>
                  {availability[item.id] && (
                    <AvailabilityIndicator statuses={availability[item.id]!} />
                  )}
                </View>
              ))}
            </View>
          )}

          <InviteToMusterModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInviteToMuster}
          />
        </>
      )}

      {publicSelected && (
        <>
          <Text style={[styles.label, { color: colors.ink }]}>
            Minimum Player Rating
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
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
    borderWidth: 1,
  },
  visButtonActive: {},
  visText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  visTextActive: {},
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 8,
  },
  resultsList: {
    borderRadius: 12,
    borderWidth: 1,
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
  },
  resultNameMuted: {},
  chipsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  inviteeCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    flex: 1,
  },
  inviteToMusterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  inviteToMusterText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  pendingBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 16,
  },
});
