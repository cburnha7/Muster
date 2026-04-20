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
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          {/* Photo + Info */}
          <View style={styles.header}>
            {player.profileImage ? (
              <Image
                source={{ uri: player.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>
                {player.firstName} {player.lastName}
              </Text>
              <View style={styles.metaRow}>
                {age != null && <Text style={styles.meta}>{age} yrs</Text>}
                {player.gender && (
                  <Text style={styles.meta}>
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
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  mode === 'open' && styles.toggleBtnActive,
                ]}
                onPress={() => setMode('open')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.toggleText,
                    mode === 'open' && styles.toggleTextActive,
                  ]}
                >
                  Open
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  mode === 'age' && styles.toggleBtnActive,
                ]}
                onPress={() => setMode('age')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.toggleText,
                    mode === 'age' && styles.toggleTextActive,
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
              color={tokenColors.cobalt}
              style={{ marginVertical: tokenSpacing.lg }}
            />
          ) : ratings.length === 0 ? (
            <Text style={styles.noRatings}>No sport ratings yet</Text>
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
                  <View key={r.sportType} style={styles.ratingRow}>
                    <View>
                      <Text style={styles.sportName}>
                        {formatSport(r.sportType)}
                      </Text>
                      {mode === 'age' && r.ageBracket && (
                        <Text style={styles.bracketLabel}>{r.ageBracket}</Text>
                      )}
                    </View>
                    <Text
                      style={[styles.percentile, isLove && styles.loveLabel]}
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
            <View style={styles.leagueSection}>
              <Text style={styles.leagueSectionTitle}>Past Seasons</Text>
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
                    <View key={l.leagueId} style={styles.leagueRow}>
                      <View style={styles.leagueInfo}>
                        <Text style={styles.leagueName} numberOfLines={1}>
                          {l.leagueName}
                        </Text>
                        <Text style={styles.leagueMeta}>
                          {formatSport(l.sportType)} · {l.gamesPlayed} games
                        </Text>
                      </View>
                      <Text
                        style={[styles.percentile, isLove && styles.loveLabel]}
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
    backgroundColor: tokenColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokenSpacing.xl,
  },
  card: {
    backgroundColor: tokenColors.white,
    borderRadius: tokenRadius.lg,
    width: '100%',
    maxWidth: 360,
    padding: tokenSpacing.xl,
    ...tokenShadow.modal,
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
    backgroundColor: tokenColors.cobalt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 28,
    color: tokenColors.white,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 20,
    color: tokenColors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    gap: tokenSpacing.sm,
    marginTop: tokenSpacing.xs,
  },
  meta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    color: tokenColors.inkSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: tokenColors.surface,
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
  toggleBtnActive: {
    backgroundColor: tokenColors.white,
    ...tokenShadow.card,
  },
  toggleText: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 13,
    color: tokenColors.inkMuted,
  },
  toggleTextActive: {
    color: tokenColors.ink,
  },
  noRatings: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    color: tokenColors.inkMuted,
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
    borderBottomColor: tokenColors.border,
  },
  sportName: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 13,
    color: tokenColors.ink,
    textTransform: 'uppercase',
  },
  bracketLabel: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 11,
    color: tokenColors.inkMuted,
    marginTop: 1,
  },
  percentile: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 14,
    color: tokenColors.cobalt,
  },
  loveLabel: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
    color: tokenColors.inkMuted,
    fontStyle: 'italic',
  },
  leagueSection: {
    marginTop: tokenSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokenColors.border,
    paddingTop: tokenSpacing.md,
  },
  leagueSectionTitle: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 13,
    color: tokenColors.success,
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
    borderBottomColor: tokenColors.border,
  },
  leagueInfo: {
    flex: 1,
    marginRight: tokenSpacing.sm,
  },
  leagueName: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 13,
    color: tokenColors.ink,
  },
  leagueMeta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 11,
    color: tokenColors.inkMuted,
    marginTop: 1,
  },
});
