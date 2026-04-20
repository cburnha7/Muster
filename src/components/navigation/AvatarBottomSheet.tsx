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
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAvatarSheet } from '../../context/AvatarSheetContext';
import {
  selectActiveUserId,
  selectDependents,
  setActiveUser,
} from '../../store/slices/contextSlice';
import { fonts, useTheme } from '../../theme';
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
  const { colors } = useTheme();
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
        // Root stack has "Main" (tab navigator) → "Home" tab → screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Main',
            params: {
              screen: 'Home',
              params: {
                screen,
                params,
              },
            },
          })
        );
      }, 300);
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
        <Text style={[styles.sectionLabel, { color: colors.inkSecondary }]}>
          PROFILES
        </Text>

        {/* Current user */}
        <TouchableOpacity
          style={[
            styles.personRow,
            !activeUserId && styles.personRowActive,
            !activeUserId && {
              backgroundColor: colors.cobaltLight || `${colors.cobalt}10`,
            },
          ]}
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
                { color: colors.ink },
                !activeUserId && styles.personNameActive,
                !activeUserId && { color: colors.cobalt },
              ]}
            >
              {user.firstName?.trim() || user.lastName?.trim()
                ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                : user.email && !user.email.includes('privaterelay.appleid.com')
                  ? user.email
                  : 'Muster Player'}
            </Text>
          </View>
          {!activeUserId && (
            <Ionicons name="checkmark" size={20} color={colors.pine} />
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
              style={[
                styles.personRow,
                isActive && styles.personRowActive,
                isActive && {
                  backgroundColor: colors.cobaltLight || `${colors.cobalt}10`,
                },
              ]}
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
                    { color: colors.ink },
                    isActive && styles.personNameActive,
                    isActive && { color: colors.cobalt },
                  ]}
                >
                  {dep.firstName}
                </Text>
              </View>
              <Text style={[styles.ageText, { color: colors.inkSecondary }]}>
                age {age}
              </Text>
              {isActive && (
                <Ionicons name="checkmark" size={20} color={colors.pine} />
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
          <View
            style={[
              styles.personAvatar,
              styles.addChildAvatar,
              { backgroundColor: colors.bgSubtle },
            ]}
          >
            <Ionicons name="add" size={20} color={colors.cobalt} />
          </View>
          <Text style={[styles.addChildText, { color: colors.cobalt }]}>
            Add a child
          </Text>
        </TouchableOpacity>

        {/* ── Quick Actions ────────────────────── */}
        <View
          style={[styles.divider, { backgroundColor: colors.border + '80' }]}
        />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            handleSwitchUser(null); // Always switch to primary user
            navigateTo('NotificationPreferences');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.ink} />
          <Text style={[styles.menuText, { color: colors.ink }]}>
            Notifications
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            handleSwitchUser(null); // Always switch to primary user
            navigateTo('Settings');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.ink} />
          <Text style={[styles.menuText, { color: colors.ink }]}>Settings</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>

        {/* ── Plan Section ────────────────────── */}
        {isFreeTier && (
          <>
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.border + '80' },
              ]}
            />
            <View style={styles.planRow}>
              <Text style={[styles.planText, { color: colors.inkSecondary }]}>
                Plan:{' '}
                <Text style={[styles.planTier, { color: colors.ink }]}>
                  {tierName}
                </Text>
              </Text>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.cobalt }]}
                activeOpacity={0.7}
                onPress={() => {
                  close();
                  setTimeout(
                    () =>
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: 'Main',
                          params: {
                            screen: 'Home',
                            params: { screen: 'RedeemCode' },
                          },
                        })
                      ),
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
        <View
          style={[styles.divider, { backgroundColor: colors.border + '80' }]}
        />
        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Log out
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 20,
  },
  identityText: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontFamily: fonts.heading,
    fontSize: 17,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 1,
  },

  // ── Divider ───────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  // ── Playing As ────────────────────────
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
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
  personRowActive: {},
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
  },
  personInfo: {
    flex: 1,
    marginLeft: 10,
  },
  personName: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  personNameActive: {
    fontFamily: fonts.label,
  },
  meLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  ageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginRight: 8,
  },
  editDepBtn: {
    padding: 10,
    marginLeft: 4,
  },
  addChildAvatar: {},
  addChildText: {
    fontFamily: fonts.body,
    fontSize: 15,
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
  },
  planTier: {
    fontFamily: fonts.label,
  },
  upgradeBtn: {
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  upgradeBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
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
  },
});
