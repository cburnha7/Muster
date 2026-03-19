import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { colors, fonts, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  selectActiveUserId,
  selectDependents,
  setActiveUser,
} from '../../store/slices/contextSlice';

/**
 * ContextSwitcher
 *
 * Displays the currently active user (guardian or dependent) and allows
 * the guardian to switch context via a dropdown modal. Reads all state
 * from Redux (contextSlice) and AuthContext — no props needed.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export function ContextSwitcher() {
  const dispatch = useDispatch();
  const { user: guardian } = useAuth();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);
  const [open, setOpen] = useState(false);

  // Nothing to switch if no dependents
  if (!guardian || dependents.length === 0) return null;

  // Resolve the active display name and image
  const activeDependent = activeUserId
    ? dependents.find((d) => d.id === activeUserId)
    : null;

  const activeName = activeDependent
    ? `${activeDependent.firstName} ${activeDependent.lastName}`
    : `${guardian.firstName} ${guardian.lastName}`;

  const activeImage = activeDependent
    ? activeDependent.profileImage
    : guardian.profileImage;

  const handleSelect = (userId: string | null) => {
    dispatch(setActiveUser(userId));
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Active Account</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Switch active account. Currently ${activeName}`}
      >
        {activeImage ? (
          <Image source={{ uri: activeImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={18} color={colors.inkFaint} />
          </View>
        )}
        <Text style={styles.activeName} numberOfLines={1}>
          {activeName}
        </Text>
        {activeDependent && (
          <View style={styles.dependentBadge}>
            <Text style={styles.dependentBadgeText}>Dependent</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.inkFaint} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Switch Account</Text>

            {/* Guardian option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${guardian.firstName} ${guardian.lastName}`}
            >
              {guardian.profileImage ? (
                <Image
                  source={{ uri: guardian.profileImage }}
                  style={styles.optionAvatar}
                />
              ) : (
                <View style={[styles.optionAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={colors.inkFaint} />
                </View>
              )}
              <Text style={styles.optionName} numberOfLines={1}>
                {guardian.firstName} {guardian.lastName}
              </Text>
              {!activeUserId && (
                <Ionicons name="checkmark-circle" size={20} color={colors.pine} />
              )}
            </TouchableOpacity>

            {/* Dependent options */}
            {dependents.map((dep) => (
              <TouchableOpacity
                key={dep.id}
                style={styles.option}
                onPress={() => handleSelect(dep.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${dep.firstName} ${dep.lastName}`}
              >
                {dep.profileImage ? (
                  <Image
                    source={{ uri: dep.profileImage }}
                    style={styles.optionAvatar}
                  />
                ) : (
                  <View style={[styles.optionAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={16} color={colors.inkFaint} />
                  </View>
                )}
                <Text style={styles.optionName} numberOfLines={1}>
                  {dep.firstName} {dep.lastName}
                </Text>
                {activeUserId === dep.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.pine}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.chalk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    marginLeft: Spacing.md,
  },
  dependentBadge: {
    backgroundColor: `${colors.court}20`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: Spacing.sm,
  },
  dependentBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.court,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 360,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  optionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  optionName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    marginLeft: Spacing.md,
  },
});
