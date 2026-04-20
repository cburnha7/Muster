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
import { fonts, Spacing, BorderRadius, Shadows, useTheme } from '../../theme';
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
  const { colors } = useTheme();
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
        style={[styles.pill, { backgroundColor: colors.surface }]}
        onPress={() => hasDependents && setMenuVisible(true)}
        activeOpacity={hasDependents ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Active account: ${displayName}. ${hasDependents ? 'Tap to switch.' : ''}`}
      >
        <Ionicons name="person" size={14} color={colors.ink} />
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
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
          <View style={[styles.dropdown, { backgroundColor: colors.surface }]}>
            <FlatList
              data={switcherItems}
              keyExtractor={(item) => item.id ?? 'guardian'}
              renderItem={({ item }) => {
                const isActive = item.id === activeUserId;
                return (
                  <TouchableOpacity
                    style={[styles.row, isActive && styles.activeRow, isActive && { backgroundColor: colors.cobalt + '0D' }]}
                    onPress={() => handleSwitch(item.id)}
                    accessibilityRole="menuitem"
                    accessibilityLabel={`Switch to ${item.name}`}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={isActive ? colors.cobalt : colors.inkSecondary}
                      style={styles.rowIcon}
                    />
                    <Text
                      style={[styles.rowText, { color: colors.ink }, isActive && styles.activeRowText, isActive && { color: colors.cobalt }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={colors.cobalt} />
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
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 14,
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
  activeRow: {},
  rowIcon: {
    marginRight: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  activeRowText: {
    fontFamily: fonts.label,
  },
});