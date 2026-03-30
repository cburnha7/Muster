import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  RefreshControl,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SportRatingsSection } from '../../components/profile/SportRatingsSection';
import { DependentsSection } from '../../components/profile/DependentsSection';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { userService } from '../../services/api/UserService';
import { setUser } from '../../store/slices/authSlice';
import type { OnboardingIntent } from '../../navigation/types';

// ── Intent card definitions (same as onboarding) ─────────
interface IntentOption {
  key: OnboardingIntent;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  { key: 'PLAYER', icon: 'basketball-outline', title: 'Find games to play', subtitle: 'Browse and join pickup games near me' },
  { key: 'CAPTAIN', icon: 'clipboard-outline', title: 'Organize my team', subtitle: 'Manage rosters and schedule games' },
  { key: 'GUARDIAN', icon: 'people-outline', title: "Manage my kid's sports", subtitle: 'Schedules, RSVPs, and logistics' },
  { key: 'COMMISSIONER', icon: 'trophy-outline', title: 'Run a league', subtitle: 'Organize seasons, standings, and playoffs' },
  { key: 'FACILITY_OWNER', icon: 'business-outline', title: 'List my facility', subtitle: 'Manage courts, bookings, and availability' },
];

import { ALL_SPORTS } from '../../constants/sports';
const SPORT_OPTIONS = ALL_SPORTS;

const UPGRADE_INTENTS: OnboardingIntent[] = ['COMMISSIONER', 'FACILITY_OWNER'];

export function ProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: authUser, logout } = useAuth();
  const { isDependent } = useDependentContext();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [intents, setIntents] = useState<string[]>(authUser?.intents ?? []);
  const [sportPrefs, setSportPrefs] = useState<string[]>(authUser?.sportPreferences ?? []);
  const [upgradeNote, setUpgradeNote] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // ── Intent toggle handler ──────────────────────────
  const handleToggleIntent = useCallback(async (key: string) => {
    const wasOn = intents.includes(key);
    const next = wasOn ? intents.filter((k) => k !== key) : [...intents, key];
    setIntents(next);

    // Show upgrade note when toggling on premium intents
    if (!wasOn && UPGRADE_INTENTS.includes(key as OnboardingIntent)) {
      setUpgradeNote('This may require an upgraded plan');
      setTimeout(() => setUpgradeNote(null), 3000);
    }

    try {
      const { user } = await userService.updateIntents(next);
      if (user) dispatch(setUser(user));
    } catch {
      // Revert on failure
      setIntents(intents);
    }
  }, [intents, dispatch]);

  // ── Sport chip toggle handler ──────────────────────
  const handleToggleSport = useCallback(async (key: string) => {
    const wasOn = sportPrefs.includes(key);
    const next = wasOn ? sportPrefs.filter((k) => k !== key) : [...sportPrefs, key];
    setSportPrefs(next);

    try {
      await userService.updatePreferences({ preferredSports: next });
    } catch {
      setSportPrefs(sportPrefs);
    }
  }, [sportPrefs]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) { logout(); }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const age = authUser?.dateOfBirth
    ? Math.floor((Date.now() - new Date(authUser.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const contentMaxWidth = width > 600 ? 540 : undefined;

  if (!authUser) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="person-outline"
          title="Profile Unavailable"
          subtitle="Unable to load your profile. Please try logging in again."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          {authUser?.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {authUser?.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{authUser?.firstName} {authUser?.lastName}</Text>
            {(authUser as any)?.gender && (
              <Text style={styles.detailText}>
                {(authUser as any).gender === 'male' ? 'Male' : (authUser as any).gender === 'female' ? 'Female' : (authUser as any).gender}
              </Text>
            )}
            {age != null && <Text style={styles.detailText}>{age} years old</Text>}
            {authUser?.email && <Text style={styles.detailText}>{authUser.email}</Text>}
            {authUser?.phoneNumber && <Text style={styles.detailText}>{authUser.phoneNumber}</Text>}
            {(authUser as any)?.address && <Text style={styles.detailText}>{(authUser as any).address}</Text>}
          </View>
        </View>
      </View>

      {/* Edit + Settings */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => (navigation as any).navigate('EditProfile')} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => (navigation as any).navigate('Settings')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sport Ratings */}
      {authUser?.id && <SportRatingsSection userId={authUser.id} />}

      {/* ── How I Use Muster ───────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>How I Use Muster</Text>
      </View>
      <View style={styles.intentList}>
        {INTENT_OPTIONS.map((option) => {
          const isOn = intents.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              style={styles.intentRow}
              onPress={() => handleToggleIntent(option.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.intentIconCircle, isOn && styles.intentIconCircleActive]}>
                <Ionicons name={option.icon} size={20} color={isOn ? '#FFFFFF' : colors.primary} />
              </View>
              <View style={styles.intentTextBlock}>
                <Text style={styles.intentTitle}>{option.title}</Text>
                <Text style={styles.intentSubtitle}>{option.subtitle}</Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={() => handleToggleIntent(option.key)}
                trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondaryContainer }}
                thumbColor={isOn ? colors.secondary : colors.surfaceDim}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {upgradeNote && (
        <View style={styles.upgradeNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.upgradeNoteText}>{upgradeNote}</Text>
        </View>
      )}

      {/* ── Sports ─────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sports</Text>
      </View>
      <View style={styles.sportChipGrid}>
        {SPORT_OPTIONS.map((sport) => {
          const isOn = sportPrefs.includes(sport.key);
          return (
            <TouchableOpacity
              key={sport.key}
              style={[styles.sportChip, isOn && styles.sportChipActive]}
              onPress={() => handleToggleSport(sport.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sportChipText, isOn && styles.sportChipTextActive]}>
                {sport.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Family (visible when GUARDIAN intent is on) ── */}
      {intents.includes('GUARDIAN') && (
        <View style={styles.familySection}>
          <DependentsSection />
        </View>
      )}

      {/* Redeem Code */}
      <TouchableOpacity style={styles.menuRow} onPress={() => (navigation as any).navigate('RedeemCode')} activeOpacity={0.7}>
        <Ionicons name="gift-outline" size={20} color={colors.primary} />
        <Text style={styles.menuRowText}>Redeem Code</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      </TouchableOpacity>

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.onErrorContainer} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 36,
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
    gap: 2,
  },
  profileName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 0,
    backgroundColor: colors.primary,
    gap: 6,
  },
  editBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },
  settingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
    gap: 6,
  },
  settingsBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
  },
  menuRowText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    marginLeft: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: colors.errorContainer,
    borderRadius: 9999,
    borderWidth: 0,
  },
  logoutText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onErrorContainer,
    marginLeft: 8,
  },

  // ── Section headers ────────────────────────────────
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },

  // ── How I Use Muster ──────────────────────────────
  intentList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  intentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentIconCircleActive: {
    backgroundColor: colors.primary,
  },
  intentTextBlock: {
    flex: 1,
  },
  intentTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 1,
  },
  intentSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  upgradeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingHorizontal: 4,
  },
  upgradeNoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },

  // ── Sports chips ──────────────────────────────────
  sportChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sportChipActive: {
    backgroundColor: colors.primary,
  },
  sportChipText: {
    fontFamily: fonts.headingSemi,
    fontSize: 13,
    color: colors.onSurface,
  },
  sportChipTextActive: {
    color: '#FFFFFF',
  },

  // ── Family section ────────────────────────────────
  familySection: {
    marginTop: 20,
  },
});
