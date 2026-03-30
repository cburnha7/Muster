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
import { useDispatch } from 'react-redux';
import { PurchaseHistorySection } from '../../components/profile/PurchaseHistorySection';
import { UserConnectSection } from '../../components/profile/UserConnectSection';
import { ConnectAccountsSection } from '../../components/profile/ConnectAccountsSection';
import { InsuranceDocumentsSection } from '../../components/profile/InsuranceDocumentsSection';
import { InsuranceDocumentForm } from '../../components/profile/InsuranceDocumentForm';
import { userService } from '../../services/api/UserService';
import { loggingService } from '../../services/LoggingService';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { setUser } from '../../store/slices/authSlice';
import { colors, fonts } from '../../theme';
import type { OnboardingIntent } from '../../navigation/types';

// ── Helpers ──

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  value?: string;
  chevron?: boolean;
  color?: string;
  disabled?: boolean;
  isLast?: boolean;
}

function MenuRow({ icon, label, onPress, value, chevron = true, color, disabled, isLast }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={disabled || !onPress}
    >
      <View style={[styles.menuIconWrap, color ? { backgroundColor: color + '15' } : undefined]}>
        <Ionicons name={icon} size={18} color={color ?? colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.menuLabel, color ? { color } : undefined]} numberOfLines={1}>
        {label}
      </Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {chevron && !value && <Ionicons name="chevron-forward" size={16} color={colors.outlineVariant} />}
    </TouchableOpacity>
  );
}

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

function ToggleRow({ icon, label, value, onValueChange, isLast }: ToggleRowProps) {
  return (
    <View style={[styles.menuRow, isLast && styles.menuRowLast]}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={colors.onSurfaceVariant} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary + '50' }}
        thumbColor={value ? colors.primary : colors.surfaceContainerLow}
        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
      />
    </View>
  );
}

// ── Screen ──

const INTENT_OPTIONS: Array<{ key: OnboardingIntent; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = [
  { key: 'PLAYER', icon: 'basketball-outline', title: 'Find games to play', subtitle: 'Browse and join pickup games near me' },
  { key: 'CAPTAIN', icon: 'clipboard-outline', title: 'Organize my team', subtitle: 'Manage rosters and schedule games' },
  { key: 'GUARDIAN', icon: 'people-outline', title: "Manage my kid's sports", subtitle: 'Schedules, RSVPs, and logistics' },
  { key: 'COMMISSIONER', icon: 'trophy-outline', title: 'Run a league', subtitle: 'Organize seasons, standings, and playoffs' },
  { key: 'FACILITY_OWNER', icon: 'business-outline', title: 'List my facility', subtitle: 'Manage courts, bookings, and availability' },
];

export function SettingsScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const { isDependent } = useDependentContext();
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [intents, setIntents] = useState<string[]>(authUser?.intents ?? []);

  const handleToggleIntent = async (key: string) => {
    const next = intents.includes(key) ? intents.filter((k) => k !== key) : [...intents, key];
    setIntents(next);
    try {
      const { user } = await userService.updateIntents(next);
      if (user) dispatch(setUser(user));
    } catch {
      setIntents(intents); // revert on failure
    }
  };
  const [deleting, setDeleting] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

  const handleExportData = async () => {
    Alert.alert('Export Data', 'Your data will be prepared for download.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Export', onPress: async () => {
        try { await userService.exportUserData(); Alert.alert('Success', 'Check your email for the download link.'); }
        catch (err: any) { Alert.alert('Error', err.message || 'Failed to export data'); }
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    loggingService.logButton('Delete Account', 'SettingsScreen');
    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { setDeleting(true); await userService.deleteAccount(''); Alert.alert('Account Deleted', 'Your account has been deleted.', [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]); }
        catch (err: any) { Alert.alert('Error', err.message || 'Failed to delete account'); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => navigation.navigate('Login' as never) },
    ]);
  };


  const isHost = authUser?.membershipTier === 'host' || authUser?.membershipTier === 'facility' || authUser?.trialTier === 'host';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* Payment & Stripe — wrapped in card styling */}
      {!isDependent && authUser?.id && (
        <>
          <Text style={styles.sectionHeader}>Payments</Text>
          <View style={styles.card}>
            <View style={styles.embeddedSection}>
              <UserConnectSection userId={authUser.id} />
            </View>
          </View>
        </>
      )}

      {!isDependent && authUser?.id && (
        <View style={styles.card}>
          <View style={styles.embeddedSection}>
            <ConnectAccountsSection userId={authUser.id} />
          </View>
        </View>
      )}

      {authUser?.id && <PurchaseHistorySection userId={authUser.id} />}

      {!isDependent && authUser?.id && isHost && (
        <InsuranceDocumentsSection userId={authUser.id} onAddDocument={() => setShowInsuranceForm(true)} />
      )}
      {!isDependent && showInsuranceForm && authUser?.id && (
        <InsuranceDocumentForm userId={authUser.id} onClose={() => setShowInsuranceForm(false)} />
      )}

      {/* Preferences */}
      <Text style={styles.sectionHeader}>Preferences</Text>
      <View style={styles.card}>
        <ToggleRow icon="moon-outline" label="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
        <ToggleRow icon="location-outline" label="Location Services" value={locationServices} onValueChange={setLocationServices} isLast />
      </View>

      {/* How I Use Muster */}
      <Text style={styles.sectionHeader}>How I Use Muster</Text>
      <View style={styles.card}>
        {INTENT_OPTIONS.map((option) => {
          const isOn = intents.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              style={styles.intentRow}
              onPress={() => handleToggleIntent(option.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.intentIconCircle, isOn && styles.intentIconCircleActive]}>
                <Ionicons name={option.icon} size={20} color={isOn ? '#FFFFFF' : colors.primary} />
              </View>
              <View style={styles.intentTextBlock}>
                <Text style={styles.intentTitle}>{option.title}</Text>
                <Text style={styles.intentSubtitle}>{option.subtitle}</Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={() => handleToggleIntent(option.key)}
                trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary + '50' }}
                thumbColor={isOn ? colors.primary : colors.surfaceContainerLow}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account */}
      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.card}>
        <MenuRow icon="shield-checkmark-outline" label="Privacy Policy" />
        <MenuRow icon="document-text-outline" label="Terms of Service" />
        <MenuRow icon="download-outline" label="Export My Data" onPress={handleExportData} />
        <MenuRow icon="ticket-outline" label="Redeem a Code" onPress={() => (navigation as any).navigate('RedeemCode')} />
        <MenuRow icon="log-out-outline" label="Log Out" onPress={handleLogout} color={colors.onSurfaceVariant} chevron={false} />
        <MenuRow
          icon="trash-outline"
          label={deleting ? 'Deleting...' : 'Delete Account'}
          onPress={handleDeleteAccount}
          color={colors.error}
          chevron={false}
          disabled={deleting}
          isLast
        />
      </View>

      {/* About */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.card}>
        <MenuRow icon="information-circle-outline" label="Version" value="1.0.0" chevron={false} />
        <MenuRow icon="help-circle-outline" label="Help & Support" />
        <MenuRow icon="star-outline" label="Rate the App" isLast />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // ── Section headers ──
  sectionHeader: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 2,
  },
  embeddedSection: {
    overflow: 'hidden',
  },

  // ── Menu rows ──
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant + '60',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  menuValue: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },


  // ── Intent rows (How I Use Muster) ──
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  intentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentIconCircleActive: {
    backgroundColor: colors.primary,
  },
  intentTextBlock: {
    flex: 1,
  },
  intentTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 1,
  },
  intentSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
});
