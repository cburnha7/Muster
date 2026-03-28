import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PurchaseHistorySection } from '../../components/profile/PurchaseHistorySection';
import { UserConnectSection } from '../../components/profile/UserConnectSection';
import { ConnectAccountsSection } from '../../components/profile/ConnectAccountsSection';
import { DependentsSection } from '../../components/profile/DependentsSection';
import { InsuranceDocumentsSection } from '../../components/profile/InsuranceDocumentsSection';
import { InsuranceDocumentForm } from '../../components/profile/InsuranceDocumentForm';
import { userService } from '../../services/api/UserService';
import { loggingService } from '../../services/LoggingService';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { colors, fonts } from '../../theme';

export function SettingsScreen(): JSX.Element {
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { isDependent } = useDependentContext();
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

  const handleExportData = async () => {
    try {
      Alert.alert(
        'Export Data',
        'Your data will be prepared for download. You will receive a link via email.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              try {
                const result = await userService.exportUserData();
                Alert.alert(
                  'Success',
                  'Your data export has been initiated. Check your email for the download link.'
                );
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to export data');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to export data');
    }
  };

  const handleDeleteAccount = () => {
    loggingService.logButton('Delete Account', 'SettingsScreen');
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Show password confirmation
            Alert.prompt(
              'Confirm Password',
              'Please enter your password to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }
                    try {
                      setDeleting(true);
                      await userService.deleteAccount(password);
                      Alert.alert(
                        'Account Deleted',
                        'Your account has been successfully deleted.',
                        [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
                      );
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to delete account');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          // TODO: Implement logout logic
          navigation.navigate('Login' as never);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={darkMode ? '#3B82F6' : '#F3F4F6'}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Location Services</Text>
          <Switch
            value={locationServices}
            onValueChange={setLocationServices}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={locationServices ? '#3B82F6' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Privacy & Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Terms of Service</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
          <Text style={styles.menuItemText}>Export My Data</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {/* Purchase History */}
        {authUser?.id && <PurchaseHistorySection userId={authUser.id} />}

        {/* Payment Account */}
        {!isDependent && authUser?.id && <UserConnectSection userId={authUser.id} />}

        {/* Stripe Connect */}
        {!isDependent && authUser?.id && <ConnectAccountsSection userId={authUser.id} />}

        {/* Insurance Documents */}
        {!isDependent && authUser?.id && (authUser.membershipTier === 'host' || authUser.membershipTier === 'facility' || authUser.trialTier === 'host') && (
          <InsuranceDocumentsSection userId={authUser.id} onAddDocument={() => setShowInsuranceForm(true)} />
        )}
        {!isDependent && showInsuranceForm && authUser?.id && (
          <InsuranceDocumentForm userId={authUser.id} onClose={() => setShowInsuranceForm(false)} />
        )}

        {/* Remove Dependents */}
        {!isDependent && <DependentsSection />}

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} disabled={deleting}>
          <Text style={[styles.menuItemText, styles.deleteText]}>{deleting ? 'Deleting...' : 'Delete Account'}</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Rate the App</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  logoutText: {
    color: '#F59E0B',
  },
  deleteText: {
    color: '#EF4444',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  infoValue: {
    fontSize: 16,
    color: '#6B7280',
  },
});