import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { SportRatingsSection } from './SportRatingsSection';

export interface ProfileCardProps {
  userId: string;
  profileImage?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDate(dateOfBirth: string): string | null {
  const d = new Date(dateOfBirth);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function ProfileCard({
  userId,
  profileImage,
  firstName,
  lastName,
  dateOfBirth,
  gender,
  email,
  phone,
  address,
}: ProfileCardProps) {
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const bornFormatted = dateOfBirth ? formatDate(dateOfBirth) : null;

  return (
    <View style={styles.card}>
      {/* Sport Rankings */}
      <SportRatingsSection userId={userId} />

      {/* Profile Photo */}
      <View style={styles.avatarContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={40} color={colors.outline} />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name}>{firstName} {lastName}</Text>

      {/* Info Rows */}
      <View style={styles.infoSection}>
        {(age !== null || gender) && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.cobalt} />
            <Text style={styles.infoText}>
              {age !== null ? `${age} years old` : ''}
              {age !== null && gender ? '  ·  ' : ''}
              {gender || ''}
            </Text>
          </View>
        )}

        {bornFormatted && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.cobalt} />
            <Text style={styles.infoText}>Born {bornFormatted}</Text>
          </View>
        )}

        {email ? (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.cobalt} />
            <Text style={styles.infoText}>{email}</Text>
          </View>
        ) : null}

        {phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={colors.cobalt} />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        ) : null}

        {address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.cobalt} />
            <Text style={styles.infoText}>{address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  infoSection: {
    marginTop: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    flex: 1,
  },
});
