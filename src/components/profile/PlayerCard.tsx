import React from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { SportRatingsSection } from './SportRatingsSection';

export interface PlayerCardProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  profileImage?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string | null;
}

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  return Math.floor(
    (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

export function PlayerCard({
  visible,
  onClose,
  userId,
  profileImage,
  firstName,
  lastName,
  dateOfBirth,
  gender,
}: PlayerCardProps) {
  const { colors } = useTheme();
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close player card"
          >
            <Ionicons name="close" size={22} color={colors.inkSoft} />
          </TouchableOpacity>

          {/* Sport Rankings */}
          <SportRatingsSection userId={userId} />

          {/* Profile Photo */}
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={34} color={colors.outline} />
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>

          {/* Age + Gender */}
          {(age !== null || gender) && (
            <Text style={styles.detail}>
              {age !== null ? `${age} years old` : ''}
              {age !== null && gender ? '  Ã‚Â·  ' : ''}
              {gender || ''}
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 6,
  },
});
