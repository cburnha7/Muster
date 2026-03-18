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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MyReservationsSection } from '../../components/profile/MyReservationsSection';
import { SportRatingsSection } from '../../components/profile/SportRatingsSection';
import { ConnectAccountsSection } from '../../components/profile/ConnectAccountsSection';
import { UserConnectSection } from '../../components/profile/UserConnectSection';
import { DependentsSection } from '../../components/profile/DependentsSection';
import { ContextSwitcher } from '../../components/profile/ContextSwitcher';
import { colors, fonts, typeScale } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Nothing heavy to reload — reservations section handles its own data
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        logout();
      }
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.grass} />}
    >
      {/* Context Switcher */}
      <ContextSwitcher />

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarRow}>
          {authUser?.profileImage ? (
            <Image source={{ uri: authUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={36} color={colors.inkFaint} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {authUser?.firstName} {authUser?.lastName}
            </Text>
            {authUser?.email && (
              <Text style={styles.profileEmail}>{authUser.email}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => (navigation as any).navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.grass} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => (navigation as any).navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sport Ratings */}
      {authUser?.id && <SportRatingsSection userId={authUser.id} />}

      {/* User Payment Account */}
      {authUser?.id && <UserConnectSection userId={authUser.id} />}

      {/* Stripe Connect Accounts (entity-level) */}
      {authUser?.id && <ConnectAccountsSection userId={authUser.id} />}

      {/* My Reservations */}
      {authUser?.id && <MyReservationsSection userId={authUser.id} />}

      {/* Dependents */}
      <DependentsSection />

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.track} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  content: {
    paddingBottom: 24,
  },
  profileHeader: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: colors.chalkWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontFamily: fonts.heading,
    ...typeScale.h3,
    color: colors.ink,
  },
  profileEmail: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grass,
  },
  editButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.grass,
    marginLeft: 4,
  },
  settingsButton: {
    padding: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.track}30`,
  },
  logoutText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.track,
    marginLeft: 8,
  },
});
