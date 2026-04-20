import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import { getAvatarColor } from '../../theme/colors';

export interface ProfileOption {
  id: string;
  firstName: string;
  lastName?: string;
  profileImage?: string | null;
}

interface ProfileSelectorModalProps {
  visible: boolean;
  profiles: ProfileOption[];
  onSelect: (profileId: string) => void;
  onCancel: () => void;
}

export function ProfileSelectorModal({
  visible,
  profiles,
  onSelect,
  onCancel,
}: ProfileSelectorModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId(null);
    }
  };

  const handleCancel = () => {
    setSelectedId(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Who's joining?</Text>

          {profiles.map(p => {
            const active = selectedId === p.id;
            const avatarBg = getAvatarColor(p.id);
            const initial = (p.firstName?.[0] || '?').toUpperCase();
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.profileRow, active && styles.profileRowActive]}
                onPress={() => setSelectedId(p.id)}
                activeOpacity={0.7}
              >
                {p.profileImage ? (
                  <Image
                    source={{ uri: p.profileImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: avatarBg },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.profileName,
                    active && styles.profileNameActive,
                  ]}
                >
                  {p.firstName}
                  {p.lastName ? ` ${p.lastName}` : ''}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.pine}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !selectedId && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedId}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 61, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileRowActive: {
    borderColor: colors.pine,
    backgroundColor: colors.pineTint,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 18,
    color: tokenColors.white,
  },
  profileName: {
    flex: 1,
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  profileNameActive: { color: colors.pine },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  cancelBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.ink },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.pine,
  },
  confirmBtnDisabled: { backgroundColor: colors.inkFaint },
  confirmBtnText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: tokenColors.white,
  },
});
