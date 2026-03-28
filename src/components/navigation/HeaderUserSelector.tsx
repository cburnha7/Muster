import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Image,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { selectActiveUserId, selectDependents, setActiveUser } from '../../store/slices/contextSlice';
import { colors, fonts } from '../../theme';

export function HeaderUserSelector() {
  const { user: guardian } = useAuth();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);
  const [menuVisible, setMenuVisible] = useState(false);

  if (!guardian) return null;

  const activeDep = activeUserId ? dependents.find((d) => d.id === activeUserId) : null;
  const displayName = activeDep ? activeDep.firstName : guardian.firstName || 'Me';
  const profileImage = (activeDep as any)?.profileImage || (guardian as any)?.profileImage;
  const initial = displayName.charAt(0).toUpperCase();

  const handleSwitch = (userId: string | null) => {
    dispatch(setActiveUser(userId));
    setMenuVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Viewing as ${displayName}`}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={[styles.row, !activeUserId && styles.rowActive]}
              onPress={() => handleSwitch(null)}
            >
              <Ionicons name="person" size={16} color={!activeUserId ? colors.pine : colors.inkFaint} />
              <Text style={[styles.rowText, !activeUserId && styles.rowTextActive]}>{guardian.firstName || 'Me'}</Text>
              {!activeUserId && <Ionicons name="checkmark" size={18} color={colors.pine} />}
            </TouchableOpacity>
            {dependents.map((dep) => {
              const isActive = activeUserId === dep.id;
              return (
                <TouchableOpacity key={dep.id} style={[styles.row, isActive && styles.rowActive]} onPress={() => handleSwitch(dep.id)}>
                  <Ionicons name="person" size={16} color={isActive ? colors.pine : colors.inkFaint} />
                  <Text style={[styles.rowText, isActive && styles.rowTextActive]}>{dep.firstName}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.pine} />}
                </TouchableOpacity>
              );
            })}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={() => { setMenuVisible(false); (navigation as any).navigate('Profile', { screen: 'DependentForm', params: {} }); }}>
              <Ionicons name="add-circle-outline" size={16} color={colors.pine} />
              <Text style={[styles.rowText, { color: colors.pine }]}>Add Dependent</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
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
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 18,
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: 260,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  rowActive: {
    backgroundColor: colors.pine + '0D',
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  rowTextActive: {
    fontFamily: fonts.label,
    color: colors.pine,
  },
  divider: {
    height: 1,
    backgroundColor: colors.white,
    marginHorizontal: 14,
  },
});
