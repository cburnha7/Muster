import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
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

function parseDOB(dateOfBirth: string): Date | null {
  // Strip time portion if present, parse as UTC to avoid timezone shift
  const dateOnly = dateOfBirth.split('T')[0];
  const d = new Date(dateOnly + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function calculateAge(dateOfBirth: string): number | null {
  const dob = parseDOB(dateOfBirth);
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())
  ) {
    age--;
  }
  return age;
}

function formatDate(dateOfBirth: string): string | null {
  const d = parseDOB(dateOfBirth);
  if (!d) return null;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
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
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, shadowColor: colors.black },
      ]}
    >
      {/* Sport Rankings */}
      <SportRatingsSection userId={userId} />

      {/* Profile Photo */}
      <View style={styles.avatarContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: colors.border },
            ]}
          >
            <Ionicons name="person" size={56} color={colors.inkSecondary} />
          </View>
        )}
      </View>

      {/* Name — removed, shown in header */}

      {/* Info Rows */}
      <View style={styles.infoSection}>
        {(age !== null || gender) && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.cobalt} />
            <Text style={[styles.infoText, { color: colors.inkSoft }]}>
              {age !== null ? `${age} years old` : ''}
              {age !== null && gender ? '  ·  ' : ''}
              {gender || ''}
            </Text>
          </View>
        )}

        {bornFormatted && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.cobalt} />
            <Text style={[styles.infoText, { color: colors.inkSoft }]}>
              Born {bornFormatted}
            </Text>
          </View>
        )}

        {email ? (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.cobalt} />
            <Text style={[styles.infoText, { color: colors.inkSoft }]}>
              {email}
            </Text>
          </View>
        ) : null}

        {phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={colors.cobalt} />
            <Text style={[styles.infoText, { color: colors.inkSoft }]}>
              {phone}
            </Text>
          </View>
        ) : null}

        {address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.cobalt} />
            <Text style={[styles.infoText, { color: colors.inkSoft }]}>
              {address}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
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
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
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
    flex: 1,
  },
});
