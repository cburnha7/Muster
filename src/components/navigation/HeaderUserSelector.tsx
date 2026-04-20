import React, { useMemo } from 'react';
import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useAvatarSheet } from '../../context/AvatarSheetContext';
import {
  selectActiveUserId,
  selectDependents,
} from '../../store/slices/contextSlice';
import { fonts, useTheme } from '../../theme';
import { PERSON_COLORS } from '../../types/eventsCalendar';
import { assignPersonColors } from '../../utils/eventsCalendarUtils';
import type { RootState } from '../../store/store';

export function HeaderUserSelector() {
  const { colors } = useTheme();
  const { user: guardian } = useAuth();
  const { open } = useAvatarSheet();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  // Use the same color assignment as MyCrewRow and calendar
  const personColors = useMemo(
    () => assignPersonColors(guardian?.id || '', dependents),
    [guardian?.id, dependents]
  );

  if (!guardian) return null;

  const activeDep = activeUserId
    ? dependents.find(d => d.id === activeUserId)
    : null;

  const displayName = activeDep
    ? activeDep.firstName
    : guardian.firstName || 'Me';
  const profileImage = activeDep
    ? activeDep.profileImage
    : (guardian as any)?.profileImage;
  const initial = displayName.charAt(0).toUpperCase();
  const activeId = activeUserId || guardian.id;
  const avatarColor = personColors.get(activeId) || PERSON_COLORS[0];

  const unreadCount = useSelector(
    (state: RootState) => state.messaging?.unreadCount ?? 0
  );

  return (
    <View style={styles.avatarContainer}>
      <TouchableOpacity
        style={[
          styles.avatarBtn,
          { borderColor: avatarColor, borderWidth: 2.5 },
        ]}
        onPress={open}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Account menu. Viewing as ${displayName}`}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImg} />
        ) : (
          <View
            style={[styles.avatarFallback, { backgroundColor: avatarColor }]}
          >
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
      {unreadCount > 0 && (
        <View
          style={[styles.notifDot, { borderColor: colors.bgScreen }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: { width: 44, height: 44 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImg: { width: 39, height: 39, borderRadius: 20 },
  avatarFallback: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.white,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.heart,
    borderWidth: 2,
  },
});
