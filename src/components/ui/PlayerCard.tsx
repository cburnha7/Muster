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
import { colors, fonts, Spacing } from '../../theme';
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
              color={colors.cobalt}
              style={{ marginVertical: 16 }}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    backgroundColor: colors.cobalt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 28,
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkFaint,
  },
  toggleTextActive: {
    color: colors.ink,
  },
  noRatings: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 12,
  },
  ratingsList: {
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sportName: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  bracketLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 1,
  },
  percentile: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.cobalt,
  },
  loveLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  leagueSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  leagueSectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.pine,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  leagueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leagueInfo: {
    flex: 1,
    marginRight: 8,
  },
  leagueName: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
  },
  leagueMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 1,
  },
});
