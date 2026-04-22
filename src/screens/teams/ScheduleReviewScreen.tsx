import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { GameRow, ConfirmedGame } from '../../types/scheduleImport';
import {
  identifyOpponent,
  scheduleImportService,
} from '../../services/ScheduleImportService';
import { Team } from '../../types';

interface RouteParams {
  gameRows: GameRow[];
  team: Team;
}

export function ScheduleReviewScreen() {
  const { colors, type, spacing, radius, shadow } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(selectUser);
  const { gameRows, team } = (route.params as RouteParams) || {
    gameRows: [],
    team: null,
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedGames, setConfirmedGames] = useState<ConfirmedGame[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentGame = gameRows[currentIndex];
  const total = gameRows.length;
  const isComplete = currentIndex >= total;

  const advanceCard = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(i => i + 1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleConfirm = useCallback(() => {
    if (!currentGame) return;
    const result = identifyOpponent(currentGame, team.name);
    const isHome = result.matched
      ? result.isHomeTeam
      : (overrides[currentIndex] ?? true);
    const opponent = result.matched
      ? result.opponentName
      : isHome
        ? currentGame.awayTeam
        : currentGame.homeTeam;

    setConfirmedGames(prev => [
      ...prev,
      {
        ...currentGame,
        isHomeTeam: isHome,
        opponentName: opponent,
      },
    ]);
    advanceCard();
  }, [currentGame, currentIndex, team, overrides, advanceCard]);

  const handleSkip = useCallback(() => {
    advanceCard();
  }, [advanceCard]);

  const handleCreateEvents = useCallback(async () => {
    if (!user?.id || !team) return;
    setIsCreating(true);
    try {
      const result = await scheduleImportService.createEventsFromGames(
        confirmedGames,
        team,
        user.id
      );
      const msg =
        result.failed > 0
          ? `Created ${result.created} of ${confirmedGames.length} events. ${result.failed} failed.`
          : `Created ${result.created} events successfully.`;
      Alert.alert('Import Complete', msg, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create events');
    } finally {
      setIsCreating(false);
    }
  }, [confirmedGames, team, user, navigation]);

  // Auto-create when all cards reviewed
  React.useEffect(() => {
    if (isComplete && confirmedGames.length > 0 && !isCreating) {
      handleCreateEvents();
    } else if (isComplete && confirmedGames.length === 0) {
      Alert.alert('No Games Confirmed', 'You skipped all games.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [isComplete]);

  if (isCreating) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.bgScreen,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.cobalt} />
        <Text
          style={{
            ...type.body,
            color: colors.textSecondary,
            marginTop: spacing.base,
          }}
        >
          Creating {confirmedGames.length} events...
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentGame || isComplete) return null;

  const opponentResult = identifyOpponent(currentGame, team.name);
  const isHome = opponentResult.matched
    ? opponentResult.isHomeTeam
    : (overrides[currentIndex] ?? true);
  const opponentName = opponentResult.matched
    ? opponentResult.opponentName
    : isHome
      ? currentGame.awayTeam
      : currentGame.homeTeam;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            ...type.ui,
            color: colors.textPrimary,
            flex: 1,
            textAlign: 'center',
          }}
        >
          Review Games
        </Text>
        <Text style={{ ...type.bodySm, color: colors.textMuted }}>
          {currentIndex + 1} / {total}
        </Text>
      </View>

      {/* Card */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          padding: spacing.lg,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: radius.xxl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadow.card,
          }}
        >
          {/* Game number */}
          {currentGame.gameNumber && (
            <Text
              style={{
                ...type.label,
                color: colors.textMuted,
                marginBottom: spacing.sm,
              }}
            >
              GAME {currentGame.gameNumber}
            </Text>
          )}

          {/* Date */}
          <Text
            style={{
              ...type.headingSm,
              color: colors.textPrimary,
              marginBottom: spacing.md,
            }}
          >
            {new Date(currentGame.date + 'T12:00:00').toLocaleDateString(
              'en-US',
              {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }
            )}
          </Text>

          {/* Teams */}
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Text
              style={{
                ...type.heading,
                color: colors.cobalt,
                textAlign: 'center',
              }}
            >
              {team.name}
            </Text>
            <Text
              style={{
                ...type.bodySm,
                color: colors.textMuted,
                marginVertical: spacing.xs,
              }}
            >
              vs
            </Text>
            <Text
              style={{
                ...type.heading,
                color: colors.textPrimary,
                textAlign: 'center',
              }}
            >
              {opponentName}
            </Text>
            {!opponentResult.matched && (
              <TouchableOpacity
                style={{
                  marginTop: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  backgroundColor: colors.cobaltTint,
                  borderRadius: radius.full,
                }}
                onPress={() =>
                  setOverrides(prev => ({ ...prev, [currentIndex]: !isHome }))
                }
                activeOpacity={0.75}
              >
                <Text style={{ ...type.bodySm, color: colors.cobalt }}>
                  Tap to switch: You are {isHome ? 'Home' : 'Away'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Time */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.sm,
              gap: spacing.sm,
            }}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={currentGame.time ? colors.textSecondary : colors.gold}
            />
            <Text
              style={{
                ...type.body,
                color: currentGame.time ? colors.textSecondary : colors.gold,
              }}
            >
              {currentGame.time || 'Time TBD'}
            </Text>
          </View>

          {/* Location */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.sm,
              gap: spacing.sm,
            }}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={currentGame.location ? colors.textSecondary : colors.gold}
            />
            <Text
              style={{
                ...type.body,
                color: currentGame.location
                  ? colors.textSecondary
                  : colors.gold,
              }}
            >
              {currentGame.location || 'Location TBD'}
            </Text>
          </View>

          {/* Division */}
          {currentGame.division && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Ionicons
                name="shield-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={{ ...type.bodySm, color: colors.textMuted }}>
                {currentGame.division}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Buttons */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            height: 52,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bgSubtle,
          }}
          onPress={handleSkip}
          activeOpacity={0.75}
        >
          <Text style={{ ...type.ui, color: colors.textSecondary }}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 2,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.cobalt,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.cta,
          }}
          onPress={handleConfirm}
          activeOpacity={0.75}
        >
          <Text style={{ ...type.ui, color: colors.textInverse }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
