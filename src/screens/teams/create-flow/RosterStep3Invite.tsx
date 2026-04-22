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
import { useCreateRoster } from './CreateRosterContext';
import { RosterInviteItem } from './types';
import { InviteToMusterModal } from '../../../components/invite/InviteToMusterModal';
import { fonts, useTheme } from '../../../theme';
import { API_BASE_URL } from '../../../services/api/config';
import TokenStorage from '../../../services/auth/TokenStorage';

export function RosterStep3Invite() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateRoster();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RosterInviteItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const privateSelected = state.visibility === 'private';
  const publicSelected = state.visibility === 'public';

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      // Search players
      const pRes = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(q)}&limit=10`
      );
      const pData = await pRes.json();
      const players: RosterInviteItem[] = (
        Array.isArray(pData) ? pData : pData.data || []
      ).map((u: any) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        type: 'player' as const,
        image: u.profileImage,
      }));
      // Search rosters
      const tRes = await fetch(
        `${API_BASE_URL}/teams?search=${encodeURIComponent(q)}`
      );
      const tData = await tRes.json();
      const rosters: RosterInviteItem[] = (
        Array.isArray(tData) ? tData : tData.data || []
      ).map((t: any) => ({
        id: t.id,
        name: t.name,
        type: 'roster' as const,
        image: t.logo,
      }));
      setResults([...rosters, ...players]);
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
              context: 'roster',
              contextId: undefined, // team not yet created at this step
              contextName: state.name,
            }),
          })
        )
        .catch(err => console.warn('Invite email failed:', err));
    },
    [dispatch, state.name]
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.white },
        { backgroundColor: colors.bgScreen },
      ]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        Who's invited?
      </Text>

      <View style={styles.visRow}>
        <TouchableOpacity
          style={[
            styles.visBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            privateSelected && styles.visBtnActive,
            privateSelected && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
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
            styles.visBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            publicSelected && styles.visBtnActive,
            publicSelected && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
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
            Search Players & Rosters
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
            <View
              style={[
                styles.resultsList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {results.map(item => {
                const added = state.invitedItems.some(i => i.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.resultRow,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      dispatch({ type: 'ADD_INVITE', item });
                      setQuery('');
                      setResults([]);
                    }}
                    disabled={added}
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
                        added && styles.resultMuted,
                        added && { color: colors.inkSoft },
                      ]}
                    >
                      {item.name}
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
            <View style={styles.chipList}>
              {state.invitedItems.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
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
                    onPress={() =>
                      dispatch({ type: 'REMOVE_INVITE', id: item.id })
                    }
                    activeOpacity={0.75}
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
  visRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  visBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  visBtnActive: {},
  visText: { fontFamily: fonts.ui, fontSize: 15 },
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
  loader: { marginVertical: 8 },
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
  avatar: { width: 24, height: 24, borderRadius: 12 },
  resultName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  resultMuted: {},
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
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipText: { fontFamily: fonts.body, fontSize: 13 },
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
