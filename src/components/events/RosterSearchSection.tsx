import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { teamService } from '../../services/api/TeamService';
import { colors, fonts, typeScale, Spacing, Shadows } from '../../theme';

// ── Types ────────────────────────────────────────────────────────

export interface RosterSearchResult {
  id: string;
  name: string;
  sportType?: string;
  memberCount?: number;
}

export interface RosterSearchSectionProps {
  eventType: string; // 'game' | 'pickup' | 'practice'
  selectedRosters: RosterSearchResult[];
  homeRosterId: string | null;
  onRostersChange: (rosters: RosterSearchResult[]) => void;
  onHomeRosterChange: (rosterId: string | null) => void;
  onRosterPlayersLoaded?: (players: any[]) => void;
}

// ── Constants ────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const GAME_MAX_ROSTERS = 2;

// ── Component ────────────────────────────────────────────────────

export const RosterSearchSection: React.FC<RosterSearchSectionProps> = ({
  eventType,
  selectedRosters,
  homeRosterId,
  onRostersChange,
  onHomeRosterChange,
  onRosterPlayersLoaded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RosterSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isGame = eventType === 'game';
  const isAtGameLimit = isGame && selectedRosters.length >= GAME_MAX_ROSTERS;
  const showSearch = !isAtGameLimit;

  // ── Debounced search ─────────────────────────────────────────
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const result = await teamService.searchTeams(query);
        const results: RosterSearchResult[] = (result.results || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          sportType: r.sportType,
          memberCount: r.memberCount ?? r.members?.length ?? 0,
        }));
        // Filter out already-added rosters
        const existingIds = new Set(selectedRosters.map((r) => r.id));
        setSearchResults(results.filter((r) => !existingIds.has(r.id)));
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Failed to search rosters');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchQuery, selectedRosters]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleAddRoster = async (roster: RosterSearchResult) => {
    const updated = [...selectedRosters, roster];
    onRostersChange(updated);
    setSearchResults((prev) => prev.filter((r) => r.id !== roster.id));
    if (searchResults.length === 1) {
      setSearchQuery('');
    }

    // For pickup/practice: fetch and emit roster players
    if (!isGame && onRosterPlayersLoaded) {
      try {
        const team = await teamService.getTeam(roster.id);
        const players = (team as any).members || [];
        onRosterPlayersLoaded(players);
      } catch {
        // Silently fail — players can be added manually
      }
    }
  };

  const handleRemoveRoster = (rosterId: string) => {
    const updated = selectedRosters.filter((r) => r.id !== rosterId);
    onRostersChange(updated);
    // Clear home tag if removed roster was home
    if (homeRosterId === rosterId) {
      onHomeRosterChange(null);
    }
  };

  const handleToggleHome = (rosterId: string) => {
    if (homeRosterId === rosterId) {
      onHomeRosterChange(null); // Un-tag (neutral)
    } else {
      onHomeRosterChange(rosterId);
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>ROSTERS</Text>

      {/* Added rosters list */}
      {selectedRosters.length > 0 && (
        <View style={styles.addedRostersContainer}>
          {selectedRosters.map((roster) => (
            <View key={roster.id} style={styles.addedRosterCard}>
              <View style={styles.addedRosterInfo}>
                {/* Home tag — game events only */}
                {isGame && (
                  <TouchableOpacity
                    onPress={() => handleToggleHome(roster.id)}
                    style={styles.homeTagButton}
                    accessibilityRole="button"
                    accessibilityLabel={
                      homeRosterId === roster.id
                        ? `Remove Home tag from ${roster.name}`
                        : `Tag ${roster.name} as Home`
                    }
                  >
                    <Ionicons
                      name={homeRosterId === roster.id ? 'home' : 'home-outline'}
                      size={20}
                      color={homeRosterId === roster.id ? colors.court : colors.inkFaint}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.addedRosterIcon}>
                  <Ionicons name="shield-outline" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.addedRosterDetails}>
                  <View style={styles.addedRosterNameRow}>
                    <Text style={styles.addedRosterName}>{roster.name}</Text>
                    {isGame && homeRosterId === roster.id && (
                      <View style={styles.homeBadge}>
                        <Text style={styles.homeBadgeText}>Home</Text>
                      </View>
                    )}
                  </View>
                  {roster.sportType && (
                    <Text style={styles.addedRosterMeta}>
                      {roster.sportType} • {roster.memberCount ?? 0} players
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveRoster(roster.id)}
                style={styles.removeButton}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${roster.name}`}
              >
                <Ionicons name="close-circle" size={24} color={colors.heart} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search input — hidden when game has 2 rosters */}
      {showSearch && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.inkFaint} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSearchError(null);
              }}
              placeholder="Search rosters by name..."
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search rosters by name"
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.pine} style={styles.searchSpinner} />
            )}
          </View>

          {searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_QUERY_LENGTH && (
            <Text style={styles.searchHint}>Type at least 2 characters to search</Text>
          )}

          {searchError && (
            <View style={styles.searchErrorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.heart} />
              <Text style={styles.searchErrorText}>{searchError}</Text>
            </View>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsHeader}>
                {searchResults.length} roster{searchResults.length !== 1 ? 's' : ''} found
              </Text>
              {searchResults.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.resultItem}
                  onPress={() => handleAddRoster(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${r.name}`}
                >
                  <View style={styles.resultInfo}>
                    <View style={styles.resultIcon}>
                      <Ionicons name="shield-outline" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultName}>{r.name}</Text>
                      {r.sportType && (
                        <Text style={styles.resultMeta}>
                          {r.sportType} • {r.memberCount ?? 0} players
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.pine} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* No results */}
          {!isSearching &&
            searchQuery.trim().length >= MIN_QUERY_LENGTH &&
            searchResults.length === 0 &&
            !searchError && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={40} color={colors.inkFaint} />
                <Text style={styles.noResultsText}>No rosters found</Text>
                <Text style={styles.noResultsHint}>Try a different roster name</Text>
              </View>
            )}
        </>
      )}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    ...typeScale.label,
    color: colors.ink,
    textTransform: 'uppercase',
  },

  // ── Added rosters ──────────────────────────────────────────
  addedRostersContainer: {
    gap: Spacing.sm,
  },
  addedRosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  addedRosterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  homeTagButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  addedRosterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pine,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  addedRosterDetails: {
    flex: 1,
  },
  addedRosterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addedRosterName: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.ink,
  },
  homeBadge: {
    backgroundColor: colors.court,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  homeBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  addedRosterMeta: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing.xs,
  },

  // ── Search input ───────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    paddingVertical: Spacing.xs,
  },
  searchSpinner: {
    marginLeft: Spacing.sm,
  },
  searchHint: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  searchErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 6,
  },
  searchErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.heart,
    flex: 1,
  },

  // ── Search results ─────────────────────────────────────────
  resultsContainer: {
    gap: Spacing.sm,
  },
  resultsHeader: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pine,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  resultDetails: {
    flex: 1,
  },
  resultName: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  resultMeta: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
  },

  // ── No results ─────────────────────────────────────────────
  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  noResultsText: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.inkFaint,
  },
  noResultsHint: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});
