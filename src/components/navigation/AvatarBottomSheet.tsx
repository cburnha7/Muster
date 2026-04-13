import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAvatarSheet } from '../../context/AvatarSheetContext';
import {
  selectActiveUserId,
  selectDependents,
  setActiveUser,
} from '../../store/slices/contextSlice';
import { colors, fonts } from '../../theme';
import { PERSON_COLORS } from '../../types/eventsCalendar';
import { assignPersonColors } from '../../utils/eventsCalendarUtils';
import type { DependentSummary } from '../../types/dependent';

function getAge(dateOfBirth: string): number {
  return Math.floor(
    (Date.now() - new Date(dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );
}

export function AvatarBottomSheet() {
  const sheetRef = useRef<BottomSheet>(null);
  const { registerSheet } = useAvatarSheet();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  const snapPoints = useMemo(() => ['55%', '80%'], []);

  // Use the same color assignment as MyCrewRow and HeaderUserSelector
  const personColors = useMemo(
    () => assignPersonColors(user?.id || '', dependents),
    [user?.id, dependents]
  );

  useEffect(() => {
    registerSheet({
      open: () => sheetRef.current?.snapToIndex(0),
      close: () => sheetRef.current?.close(),
    });
  }, [registerSheet]);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const navigateTo = useCallback(
    (screen: string, params?: Record<string, any>) => {
      handleClose();
      setTimeout(() => {
        (navigation as any).navigate(screen, params);
      }, 100);
    },
    [navigation, handleClose]
  );

  const handleSwitchUser = useCallback(
    (userId: string | null) => {
      dispatch(setActiveUser(userId));
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    handleClose();
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        logout();
      }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  }, [logout, handleClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  if (!user) return null;

  const showPlayingAs =
    dependents.length > 0 ||
    (user.intents && user.intents.includes('GUARDIAN'));
  const tierName = (user as any).membershipTier || 'Free';
  const isFreeTier =
    !(user as any).membershipTier ||
    (user as any).membershipTier === 'standard';
  const initial = user.firstName?.charAt(0).toUpperCase() || '?';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* ── Profiles ─────────────────────────── */}
        <Text style={styles.sectionLabel}>PROFILES</Text>

        {/* Current user */}
        <TouchableOpacity
          style={[styles.personRow, !activeUserId && styles.personRowActive]}
          onPress={() => {
            handleSwitchUser(null);
            navigateTo('ProfileScreen');
          }}
          activeOpacity={0.7}
        >
          {(user as any)?.profileImage ? (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 2.5,
                borderColor: personColors.get(user.id) || PERSON_COLORS[0],
                overflow: 'hidden',
              }}
            >
              <Image
                source={{ uri: (user as any).profileImage }}
                style={{ width: 31, height: 31, borderRadius: 16 }}
              />
            </View>
          ) : (
            <View
              style={[
                styles.personAvatar,
                {
                  backgroundColor:
                    personColors.get(user.id) || PERSON_COLORS[0],
                },
              ]}
            >
              <Text style={styles.personInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.personInfo}>
            <Text
              style={[
                styles.personName,
                !activeUserId && styles.personNameActive,
              ]}
            >
              {user.firstName} {user.lastName}
            </Text>
          </View>
          {!activeUserId && (
            <Ionicons name="checkmark" size={20} color={colors.secondary} />
          )}
        </TouchableOpacity>

        {/* Dependents */}
        {dependents.map((dep: DependentSummary, index: number) => {
          const isActive = activeUserId === dep.id;
          const depColor =
            personColors.get(dep.id) ||
            PERSON_COLORS[(index + 1) % PERSON_COLORS.length];
          const depInitial = dep.firstName?.charAt(0).toUpperCase() || '?';
          const age = getAge(dep.dateOfBirth);

          return (
            <TouchableOpacity
              key={dep.id}
              style={[styles.personRow, isActive && styles.personRowActive]}
              onPress={() => {
                handleSwitchUser(dep.id);
                navigateTo('DependentProfile', { dependentId: dep.id });
              }}
              activeOpacity={0.7}
            >
              {dep.profileImage ? (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2.5,
                    borderColor: depColor,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: dep.profileImage }}
                    style={{ width: 31, height: 31, borderRadius: 16 }}
                  />
                </View>
              ) : (
                <View
                  style={[styles.personAvatar, { backgroundColor: depColor }]}
                >
                  <Text style={styles.personInitial}>{depInitial}</Text>
                </View>
              )}
              <View style={styles.personInfo}>
                <Text
                  style={[
                    styles.personName,
                    isActive && styles.personNameActive,
                  ]}
                >
                  {dep.firstName}
                </Text>
              </View>
              <Text style={styles.ageText}>age {age}</Text>
              {isActive && (
                <Ionicons name="checkmark" size={20} color={colors.secondary} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add a child */}
        <TouchableOpacity
          style={styles.personRow}
          onPress={() => navigateTo('DependentForm', {})}
          activeOpacity={0.7}
        >
          <View style={[styles.personAvatar, styles.addChildAvatar]}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
          <Text style={styles.addChildText}>Add a child</Text>
        </TouchableOpacity>

        {/* ── Quick Actions ────────────────────── */}
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigateTo('NotificationPreferences')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.onSurface}
          />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.outlineVariant}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigateTo('Settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={colors.onSurface}
          />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.outlineVariant}
          />
        </TouchableOpacity>

        {/* ── Plan Section ────────────────────── */}
        {isFreeTier && (
          <>
            <View style={styles.divider} />
            <View style={styles.planRow}>
              <Text style={styles.planText}>
                Plan: <Text style={styles.planTier}>{tierName}</Text>
              </Text>
              <TouchableOpacity
                style={styles.upgradeBtn}
                activeOpacity={0.7}
                onPress={() => {
                  close();
                  setTimeout(
                    () => (navigation as any).navigate('RedeemCode'),
                    300
                  );
                }}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Log Out ─────────────────────────── */}
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.outlineVariant,
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // ── Identity ──────────────────────────
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 20,
    color: '#FFFFFF',
  },
  identityText: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.onSurface,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  // ── Divider ───────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant + '80',
    marginVertical: 8,
  },

  // ── Playing As ────────────────────────
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
  },
  personRowActive: {
    backgroundColor: colors.primaryFixed || `${colors.primary}10`,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInitial: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
  personInfo: {
    flex: 1,
    marginLeft: 10,
  },
  personName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  personNameActive: {
    fontFamily: fonts.label,
    color: colors.primary,
  },
  meLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginRight: 8,
  },
  editDepBtn: {
    padding: 10,
    marginLeft: 4,
  },
  addChildAvatar: {
    backgroundColor: colors.surfaceContainer,
  },
  addChildText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.primary,
    marginLeft: 10,
  },

  // ── Menu Items ────────────────────────
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },

  // ── Plan ──────────────────────────────
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  planText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  planTier: {
    fontFamily: fonts.label,
    color: colors.onSurface,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  upgradeBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#FFFFFF',
  },

  // ── Log Out ───────────────────────────
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  logoutText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
  },
});
