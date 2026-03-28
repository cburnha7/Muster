import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { colors, fonts, Spacing, BorderRadius, Shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  selectActiveUserId,
  selectDependents,
  setActiveUser,
} from '../../store/slices/contextSlice';

/**
 * ContextIndicator
 *
 * Persistent tappable pill in the tab header showing the active account's full name.
 * Tapping opens a dropdown to switch between guardian and dependents.
 */
export function ContextIndicator() {
  const { user: guardian } = useAuth();
  const dispatch = useDispatch();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);
  const [menuVisible, setMenuVisible] = useState(false);

  if (!guardian) return null;

  const activeDependent = activeUserId
    ? dependents.find((d) => d.id === activeUserId)
    : null;

  const displayName = activeDependent
    ? `${activeDependent.firstName} ${activeDependent.lastName}`
    : `${guardian.firstName} ${guardian.lastName ?? ''}`.trim();

  const hasDependents = dependents.length > 0;

  const handleSwitch = (userId: string | null) => {
    dispatch(setActiveUser(userId));
    setMenuVisible(false);
  };

  const switcherItems: { id: string | null; name: string }[] = [
    { id: null, name: `${guardian.firstName} ${guardian.lastName ?? ''}`.trim() },
    ...dependents.map((d) => ({ id: d.id, name: `${d.firstName} ${d.lastName}` })),
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={() => hasDependents && setMenuVisible(true)}
        activeOpacity={hasDependents ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Active account: ${displayName}. ${hasDependents ? 'Tap to switch.' : ''}`}
      >
        <Ionicons name="person" size={14} color={colors.ink} />
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {hasDependents && (
          <Ionicons name="chevron-down" size={14} color={colors.ink} />
        )}
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={switcherItems}
              keyExtractor={(item) => item.id ?? 'guardian'}
              renderItem={({ item }) => {
                const isActive = item.id === activeUserId;
                return (
                  <TouchableOpacity
                    style={[styles.row, isActive && styles.activeRow]}
                    onPress={() => handleSwitch(item.id)}
                    accessibilityRole="menuitem"
                    accessibilityLabel={`Switch to ${item.name}`}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={isActive ? colors.pine : colors.inkFaint}
                      style={styles.rowIcon}
                    />
                    <Text
                      style={[styles.rowText, isActive && styles.activeRowText]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={colors.pine} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    maxWidth: 220,
    gap: 5,
    backgroundColor: colors.surface,
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    minWidth: 220,
    maxWidth: 280,
    ...Shadows.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  activeRow: {
    backgroundColor: colors.pine + '0D',
  },
  rowIcon: {
    marginRight: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  activeRowText: {
    fontFamily: fonts.label,
    color: colors.pine,
  },
});
