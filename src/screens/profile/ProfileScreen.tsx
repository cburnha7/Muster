import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SportRatingsSection } from '../../components/profile/SportRatingsSection';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();
  const { isDependent } = useDependentContext();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) { logout(); }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const age = authUser?.dateOfBirth
    ? Math.floor((Date.now() - new Date(authUser.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const contentMaxWidth = width > 600 ? 540 : undefined;

  if (!authUser) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="person-outline"
          title="Profile Unavailable"
          subtitle="Unable to load your profile. Please try logging in again."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          {authUser?.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {authUser?.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{authUser?.firstName} {authUser?.lastName}</Text>
            {(authUser as any)?.gender && (
              <Text style={styles.detailText}>
                {(authUser as any).gender === 'male' ? 'Male' : (authUser as any).gender === 'female' ? 'Female' : (authUser as any).gender}
              </Text>
            )}
            {age != null && <Text style={styles.detailText}>{age} years old</Text>}
            {authUser?.email && <Text style={styles.detailText}>{authUser.email}</Text>}
            {authUser?.phoneNumber && <Text style={styles.detailText}>{authUser.phoneNumber}</Text>}
            {(authUser as any)?.address && <Text style={styles.detailText}>{(authUser as any).address}</Text>}
          </View>
        </View>
      </View>

      {/* Edit + Settings */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => (navigation as any).navigate('EditProfile')} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => (navigation as any).navigate('Settings')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sport Ratings */}
      {authUser?.id && <SportRatingsSection userId={authUser.id} />}

      {/* Redeem Code */}
      <TouchableOpacity style={styles.menuRow} onPress={() => (navigation as any).navigate('RedeemCode')} activeOpacity={0.7}>
        <Ionicons name="gift-outline" size={20} color={colors.primary} />
        <Text style={styles.menuRowText}>Redeem Code</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      </TouchableOpacity>

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.onErrorContainer} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.ui,
    fontSize: 36,
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
    gap: 2,
  },
  profileName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 0,
    backgroundColor: colors.primary,
    gap: 6,
  },
  editBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#FFFFFF',
  },
  settingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
    gap: 6,
  },
  settingsBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
  },
  menuRowText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    marginLeft: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: colors.errorContainer,
    borderRadius: 9999,
    borderWidth: 0,
  },
  logoutText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onErrorContainer,
    marginLeft: 8,
  },
});
