import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';
import { formatRatingDisplay, LOVE_LABEL } from '../../utils/ratingDisplay';
import { formatSportType } from '../../utils/formatters';

interface SportRating {
  sportType: string;
  openPercentile: number | null;
  ageGroupPercentile: number | null;
  openGamesPlayed: number;
  ageGroupGamesPlayed: number;
  openRating: number | null;
  ageGroupRating: number | null;
  ageBracket: string | null;
  // Legacy fallbacks
  overallPercentile?: number | null;
  bracketPercentile?: number | null;
  overallEventCount?: number;
  bracketEventCount?: number;
}

interface LeagueRatingRecord {
  leagueId: string;
  leagueName: string;
  sportType: string;
  rating: number;
  percentile: number | null;
  gamesPlayed: number;
  archivedAt: string | null;
}

interface PlayerCardProps {
  visible: boolean;
  onClose: () => void;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    dateOfBirth?: string | Date;
    gender?: string;
  } | null;
}

const formatSport = (s: string) => formatSportType(s);

export function PlayerCard({ visible, onClose, player }: PlayerCardProps) {
  const { colors, shadow } = useTheme();
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [leagueHistory, setLeagueHistory] = useState<LeagueRatingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'open' | 'age'>('open');

  useEffect(() => {
    if (!visible || !player) {
      setRatings([]);
      setLeagueHistory([]);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE_URL}/users/sport-ratings/${player.id}`)
      .then(r => r.json())
      .then((data: any) => {
        const list: SportRating[] = Array.isArray(data)
          ? data
          : (data.sportRatings ?? []);
        setRatings(
          list.filter(
            r =>
              (r.openGamesPlayed ?? r.overallEventCount ?? 0) > 0 ||
              (r.ageGroupGamesPlayed ?? r.bracketEventCount ?? 0) > 0
          )
        );
        setLeagueHistory(data.leagueHistory ?? []);
      })
      .catch(() => {
        setRatings([]);
        setLeagueHistory([]);
      })
      .finally(() => setLoading(false));
  }, [visible, player?.id]);

  if (!visible || !player) return null;

  const age = player.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(player.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const initial = player.firstName?.[0]?.toUpperCase() || '?';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.white, ...shadow.modal },
          ]}
        >
          {/* Photo + Info */}
          <View style={styles.header}>
            {player.profileImage ? (
              <Image
                source={{ uri: player.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.cobalt },
                ]}
              >
                <Text style={[styles.avatarInitial, { color: colors.white }]}>
                  {initial}
                </Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.ink }]}>
                {player.firstName} {player.lastName}
              </Text>
              <View style={styles.metaRow}>
                {age != null && (
                  <Text style={[styles.meta, { color: colors.inkSecondary }]}>
                    {age} yrs
                  </Text>
                )}
                {player.gender && (
                  <Text style={[styles.meta, { color: colors.inkSecondary }]}>
                    {player.gender === 'male'
                      ? 'Male'
                      : player.gender === 'female'
                        ? 'Female'
                        : player.gender}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Toggle */}
          {ratings.length > 0 && (
            <View
              style={[styles.toggleRow, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  mode === 'open' && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.white, ...shadow.card },
                  ],
                ]}
                onPress={() => setMode('open')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.inkMuted },
                    mode === 'open' && { color: colors.ink },
                  ]}
                >
                  Open
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  mode === 'age' && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.white, ...shadow.card },
                  ],
                ]}
                onPress={() => setMode('age')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.inkMuted },
                    mode === 'age' && { color: colors.ink },
                  ]}
                >
                  Age Restricted
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ratings */}
          {loading ? (
            <ActivityIndicator
              color={colors.cobalt}
              style={{ marginVertical: tokenSpacing.lg }}
            />
          ) : ratings.length === 0 ? (
            <Text style={[styles.noRatings, { color: colors.inkMuted }]}>
              No sport ratings yet
            </Text>
          ) : (
            <View style={styles.ratingsList}>
              {ratings.map(r => {
                const pct =
                  mode === 'open'
                    ? (r.openPercentile ?? r.overallPercentile)
                    : (r.ageGroupPercentile ?? r.bracketPercentile);
                const games =
                  mode === 'open'
                    ? (r.openGamesPlayed ?? r.overallEventCount ?? 0)
                    : (r.ageGroupGamesPlayed ?? r.bracketEventCount ?? 0);
                const rating =
                  mode === 'open' ? r.openRating : r.ageGroupRating;
                const display = formatRatingDisplay(pct, games, rating);
                const isLove = display === LOVE_LABEL;
                return (
                  <View
                    key={r.sportType}
                    style={[
                      styles.ratingRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View>
                      <Text style={[styles.sportName, { color: colors.ink }]}>
                        {formatSport(r.sportType)}
                      </Text>
                      {mode === 'age' && r.ageBracket && (
                        <Text
                          style={[
                            styles.bracketLabel,
                            { color: colors.inkMuted },
                          ]}
                        >
                          {r.ageBracket}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.percentile,
                        { color: colors.cobalt },
                        isLove && {
                          fontFamily: tokenFontFamily.uiRegular,
                          fontSize: 12,
                          color: colors.inkMuted,
                          fontStyle: 'italic',
                        },
                      ]}
                    >
                      {display}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Past Seasons — league rating history */}
          {leagueHistory.length > 0 && (
            <View
              style={[styles.leagueSection, { borderTopColor: colors.border }]}
            >
              <Text
                style={[styles.leagueSectionTitle, { color: colors.success }]}
              >
                Past Seasons
              </Text>
              {leagueHistory
                .filter(l => l.archivedAt !== null)
                .map(l => {
                  const display = formatRatingDisplay(
                    l.percentile,
                    l.gamesPlayed,
                    l.rating
                  );
                  const isLove = display === LOVE_LABEL;
                  return (
                    <View
                      key={l.leagueId}
                      style={[
                        styles.leagueRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.leagueInfo}>
                        <Text
                          style={[styles.leagueName, { color: colors.ink }]}
                          numberOfLines={1}
                        >
                          {l.leagueName}
                        </Text>
                        <Text
                          style={[
                            styles.leagueMeta,
                            { color: colors.inkMuted },
                          ]}
                        >
                          {formatSport(l.sportType)} · {l.gamesPlayed} games
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.percentile,
                          { color: colors.cobalt },
                          isLove && {
                            fontFamily: tokenFontFamily.uiRegular,
                            fontSize: 12,
                            color: colors.inkMuted,
                            fontStyle: 'italic',
                          },
                        ]}
                      >
                        {display}
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokenSpacing.xl,
  },
  card: {
    borderRadius: tokenRadius.lg,
    width: '100%',
    maxWidth: 360,
    padding: tokenSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokenSpacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 28,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: tokenSpacing.sm,
    marginTop: tokenSpacing.xs,
  },
  meta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: tokenSpacing.sm,
    borderRadius: tokenRadius.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {},
  toggleText: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 13,
  },
  noRatings: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: tokenSpacing.md,
  },
  ratingsList: {
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokenSpacing.sm,
    borderBottomWidth: 1,
  },
  sportName: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  bracketLabel: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 11,
    marginTop: 1,
  },
  percentile: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 14,
  },
  leagueSection: {
    marginTop: tokenSpacing.lg,
    borderTopWidth: 1,
    paddingTop: tokenSpacing.md,
  },
  leagueSectionTitle: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokenSpacing.sm,
  },
  leagueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  leagueInfo: {
    flex: 1,
    marginRight: tokenSpacing.sm,
  },
  leagueName: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 13,
  },
  leagueMeta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 11,
    marginTop: 1,
  },
});
