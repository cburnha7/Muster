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
import { SportRatingsSection } from '../../components/profile/SportRatingsSection';
import { InsuranceDocumentsSection } from '../../components/profile/InsuranceDocumentsSection';
import { InsuranceDocumentForm } from '../../components/profile/InsuranceDocumentForm';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();
  const { isDependent } = useDependentContext();

  const [refreshing, setRefreshing] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pine} />}
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
          <Ionicons name="create-outline" size={18} color={colors.pine} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => (navigation as any).navigate('Settings')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={18} color={colors.inkSoft} />
          <Text style={styles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sport Ratings */}
      {authUser?.id && <SportRatingsSection userId={authUser.id} />}

      {/* Insurance Documents */}
      {!isDependent && authUser?.id && (authUser.membershipTier === 'host' || authUser.membershipTier === 'facility' || authUser.trialTier === 'host') && (
        <InsuranceDocumentsSection userId={authUser.id} onAddDocument={() => setShowInsuranceForm(true)} />
      )}
      {!isDependent && showInsuranceForm && authUser?.id && (
        <InsuranceDocumentForm userId={authUser.id} onClose={() => setShowInsuranceForm(false)} />
      )}

      {/* Redeem Code */}
      <TouchableOpacity style={styles.menuRow} onPress={() => (navigation as any).navigate('RedeemCode')} activeOpacity={0.7}>
        <Ionicons name="gift-outline" size={20} color={colors.pine} />
        <Text style={styles.menuRowText}>Redeem Code</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
      </TouchableOpacity>

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.heart} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
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
    backgroundColor: colors.pine,
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
    color: colors.ink,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.pine,
    gap: 6,
  },
  editBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.pine,
  },
  settingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    gap: 6,
  },
  settingsBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.inkSoft,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRowText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
    marginLeft: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.heart + '30',
  },
  logoutText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.heart,
    marginLeft: 8,
  },
});
