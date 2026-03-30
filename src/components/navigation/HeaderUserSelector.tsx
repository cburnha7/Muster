import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useAvatarSheet } from '../../context/AvatarSheetContext';
import { selectActiveUserId, selectDependents } from '../../store/slices/contextSlice';
import { colors, fonts } from '../../theme';
import type { RootState } from '../../store/store';

const DEPENDENT_COLORS = ['#E8720C', '#8B5CF6', '#0D9488', '#DC2626'];

export function HeaderUserSelector() {
  const { user: guardian } = useAuth();
  const { open } = useAvatarSheet();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  if (!guardian) return null;

  // Resolve the active display person
  const activeDep = activeUserId
    ? dependents.find((d) => d.id === activeUserId)
    : null;
  const depIndex = activeDep
    ? dependents.findIndex((d) => d.id === activeUserId)
    : -1;

  const displayName = activeDep ? activeDep.firstName : guardian.firstName || 'Me';
  const profileImage = activeDep?.profileImage || (guardian as any)?.profileImage;
  const initial = displayName.charAt(0).toUpperCase();
  const avatarColor = activeDep
    ? DEPENDENT_COLORS[depIndex % DEPENDENT_COLORS.length]
    : colors.primary;

  // Show unread dot when there are unread messages
  const unreadCount = useSelector((state: RootState) => state.messaging?.unreadCount ?? 0);
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <View style={styles.avatarContainer}>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={open}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Account menu. Viewing as ${displayName}`}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
      {hasUnreadNotifications && <View style={styles.notifDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 18,
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 44,
    height: 44,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
});
