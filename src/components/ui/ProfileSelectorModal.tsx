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
import { fonts } from '../../theme';
import { useTheme } from '../../theme';
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
  const { colors } = useTheme();
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
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={handleCancel}
      >
        <View
          style={[styles.modal, { backgroundColor: colors.white }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: colors.ink }]}>
            Who's joining?
          </Text>

          {profiles.map(p => {
            const active = selectedId === p.id;
            const avatarBg = getAvatarColor(p.id);
            const initial = (p.firstName?.[0] || '?').toUpperCase();
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.profileRow,
                  { backgroundColor: colors.surface },
                  active && {
                    borderColor: colors.pine,
                    backgroundColor: colors.pineTint,
                  },
                ]}
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
                    <Text
                      style={[styles.avatarInitial, { color: colors.white }]}
                    >
                      {initial}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.profileName,
                    { color: colors.ink },
                    active && { color: colors.pine },
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
              style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.ink }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.pine },
                !selectedId && { backgroundColor: colors.inkFaint },
              ]}
              onPress={handleConfirm}
              disabled={!selectedId}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmBtnText, { color: colors.white }]}>
                Confirm
              </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
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
    borderWidth: 2,
    borderColor: 'transparent',
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
  },
  profileName: {
    flex: 1,
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
});
