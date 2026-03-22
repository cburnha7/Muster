import React, { useState, useRef } from 'react';
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
import { DependentSummary } from '../../types/dependent';

/**
 * ContextIndicator
 *
 * Persistent tappable pill in the tab header showing "Player – [name]".
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

  const isDependent = !!activeDependent;
  const displayName = activeDependent
    ? activeDependent.firstName
    : guardian.firstName;

  const hasDependents = dependents.length > 0;

  const handleSwitch = (userId: string | null) => {
    dispatch(setActiveUser(userId));
    setMenuVisible(false);
  };

  // Build the list: guardian first, then dependents
  const switcherItems: { id: string | null; name: string; isDependent: boolean }[] = [
    { id: null, name: guardian.firstName, isDependent: false },
    ...dependents.map((d) => ({ id: d.id, name: d.firstName, isDependent: true })),
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, isDependent ? styles.dependentPill : styles.guardianPill]}
        onPress={() => hasDependents && setMenuVisible(true)}
        activeOpacity={hasDependents ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Active player: ${displayName}. ${hasDependents ? 'Tap to switch.' : ''}`}
      >
        <Ionicons
          name={isDependent ? 'people' : 'person'}
          size={14}
          color={isDependent ? colors.court : colors.inkFaint}
        />
        <Text
          style={[styles.name, isDependent ? styles.dependentName : styles.guardianName]}
          numberOfLines={1}
        >
          Player – {displayName}
        </Text>
        {hasDependents && (
          <Ionicons
            name="chevron-down"
            size={14}
            color={isDependent ? colors.court : colors.inkFaint}
          />
        )}
      </TouchableOpacity>

      {/* Dropdown modal for switching between guardian and dependents */}
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
                      name={item.isDependent ? 'people' : 'person'}
                      size={16}
                      color={isActive ? colors.pine : colors.inkFaint}
                      style={styles.rowIcon}
                    />
                    <Text
                      style={[styles.rowText, isActive && styles.activeRowText]}
                      numberOfLines={1}
                    >
                      Player – {item.name}
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
    maxWidth: 200,
    gap: 5,
  },
  guardianPill: {
    backgroundColor: colors.chalk,
  },
  dependentPill: {
    backgroundColor: colors.pine + '18',
  },
  name: {
    fontSize: 14,
    flexShrink: 1,
  },
  guardianName: {
    fontFamily: fonts.label,
    color: colors.inkFaint,
  },
  dependentName: {
    fontFamily: fonts.label,
    color: colors.court,
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
    backgroundColor: colors.chalk,
    borderRadius: BorderRadius.md,
    minWidth: 200,
    maxWidth: 260,
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
