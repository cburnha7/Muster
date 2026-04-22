import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as StoreReview from 'expo-store-review';
import { fonts, Spacing, useTheme } from '../../theme';
import { selectUser, selectAccessToken } from '../../store/slices/authSlice';
import { useDependentContext } from '../../hooks/useDependentContext';
import { userService } from '../../services/api/UserService';
import { setUser } from '../../store/slices/authSlice';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';
import { useGetInsuranceDocumentsQuery } from '../../store/api/insuranceDocumentsApi';
import { loggingService } from '../../services/LoggingService';
import appJson from '../../../app.json';
import type { OnboardingIntent } from '../../navigation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// entityType values as accepted by the server: 'facility' | 'league' | 'roster'
// We display 'facility' as "Grounds" in the UI.
interface ConnectStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface ConnectAccount {
  entityType: 'facility' | 'league' | 'roster';
  entityId: string;
  entityName: string;
  accountId: string | null;
  status: ConnectStatus | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  'Accounts',
  'Documents',
  'Preferences',
  'Account Books',
  'About',
] as const;

const INTENT_OPTIONS: Array<{
  key: OnboardingIntent;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'PLAYER',
    icon: 'basketball-outline',
    title: 'Find games to play',
    subtitle: 'Browse and join pickup games near me',
  },
  {
    key: 'CAPTAIN',
    icon: 'clipboard-outline',
    title: 'Organize my roster',
    subtitle: 'Manage rosters and schedule games',
  },
  {
    key: 'GUARDIAN',
    icon: 'people-outline',
    title: "Manage my kid's sports",
    subtitle: 'Schedules, RSVPs, and logistics',
  },
  {
    key: 'COMMISSIONER',
    icon: 'trophy-outline',
    title: 'Run a league',
    subtitle: 'Organize seasons, standings, and playoffs',
  },
  {
    key: 'FACILITY_OWNER',
    icon: 'business-outline',
    title: 'List my ground',
    subtitle: 'Manage courts, bookings, and availability',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  label: string;
  labelColor?: string;
  subtitle?: string;
  onPress?: () => void;
  chevron?: boolean;
  rightValue?: string;
  badge?: number | null;
  isLast?: boolean;
}

function MenuRow({
  icon,
  iconBg,
  iconColor,
  label,
  labelColor,
  subtitle,
  onPress,
  chevron = true,
  rightValue,
  badge,
  isLast,
}: MenuRowProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[s.row, { borderBottomColor: colors.border }, isLast && s.rowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[s.iconWrap, { backgroundColor: iconBg ?? colors.surface }]}>
        <Ionicons name={icon} size={18} color={iconColor ?? colors.inkSoft} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            s.rowLabel,
            { color: colors.ink },
            labelColor ? { color: labelColor } : undefined,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[s.rowSubtitle, { color: colors.inkFaint }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge != null ? (
        <View style={[s.badge, { backgroundColor: colors.cobaltTint }]}>
          <Text style={[s.badgeText, { color: colors.cobalt }]}>{badge}</Text>
        </View>
      ) : null}
      {rightValue ? (
        <Text style={[s.rowValue, { color: colors.inkSoft }]}>
          {rightValue}
        </Text>
      ) : null}
      {chevron && !rightValue ? (
        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      ) : null}
    </TouchableOpacity>
  );
}

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

function ToggleRow({
  icon,
  iconBg,
  label,
  value,
  onValueChange,
  isLast,
}: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[s.row, { borderBottomColor: colors.border }, isLast && s.rowLast]}
    >
      <View style={[s.iconWrap, { backgroundColor: iconBg ?? colors.surface }]}>
        <Ionicons name={icon} size={18} color={colors.inkSoft} />
      </View>
      <Text style={[s.rowLabel, { color: colors.ink }, { flex: 1 }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.cobalt + '50' }}
        thumbColor={value ? colors.cobalt : colors.inkFaint}
        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Bar
// ─────────────────────────────────────────────────────────────────────────────

interface TabBarProps {
  activeIndex: number;
  onPress: (index: number) => void;
}

function TabBar({ activeIndex, onPress }: TabBarProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.tabBarOuter,
        { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab}
              style={s.tabItem}
              onPress={() => onPress(i)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.tabLabel,
                  { color: colors.inkSoft },
                  active && { color: colors.cobalt },
                ]}
              >
                {tab}
              </Text>
              {active && (
                <View
                  style={[s.tabUnderline, { backgroundColor: colors.cobalt }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

// Derive display status from a ConnectAccount
function getConnectState(
  account: ConnectAccount
): 'connected' | 'incomplete' | 'not_connected' {
  if (!account.accountId || !account.status) return 'not_connected';
  if (account.status.chargesEnabled) return 'connected';
  if (account.status.detailsSubmitted) return 'incomplete';
  return 'not_connected';
}

// ── Animated entity row ──────────────────────────────────────────────────────

interface EntityRowProps {
  account: ConnectAccount;
  isLast: boolean;
  onboardingId: string | null;
  onOnboard: (
    entityType: ConnectAccount['entityType'],
    entityId: string
  ) => void;
}

function EntityRow({
  account,
  isLast,
  onboardingId,
  onOnboard,
}: EntityRowProps) {
  const { colors } = useTheme();
  const state = getConnectState(account);
  const isOnboarding = onboardingId === account.entityId;

  // Animated fill: 0 = ghost, 1 = filled cobalt
  const fillAnim = useRef(
    new Animated.Value(state === 'connected' ? 1 : 0)
  ).current;

  // When state transitions to connected, animate the button fill
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: state === 'connected' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [state]);

  const btnBg = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.cobalt],
  });
  const btnBorderColor = colors.cobalt;
  const btnTextColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cobalt, colors.white],
  });

  let statusText = 'Not connected';
  let statusColor = colors.inkFaint;
  if (state === 'connected') {
    statusText = 'Connected · payouts enabled';
    statusColor = colors.pine;
  } else if (state === 'incomplete') {
    statusText = 'Setup incomplete';
    statusColor = colors.gold;
  }

  const btnLabel = state === 'connected' ? 'Manage' : 'Connect';

  return (
    <View
      style={[s.row, { borderBottomColor: colors.border }, isLast && s.rowLast]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.entityName, { color: colors.ink }]}>
          {account.entityName}
        </Text>
        <Text style={[s.entityStatus, { color: statusColor }]}>
          {statusText}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onOnboard(account.entityType, account.entityId)}
        disabled={isOnboarding}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            s.entityBtn,
            { backgroundColor: btnBg, borderColor: btnBorderColor },
          ]}
        >
          {isOnboarding ? (
            <ActivityIndicator
              size="small"
              color={state === 'connected' ? colors.white : colors.cobalt}
            />
          ) : (
            <Animated.Text style={[s.entityBtnText, { color: btnTextColor }]}>
              {btnLabel}
            </Animated.Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

// ── Account group ────────────────────────────────────────────────────────────

interface AccountGroupProps {
  label: string;
  entities: ConnectAccount[];
  onboardingId: string | null;
  onOnboard: (
    entityType: ConnectAccount['entityType'],
    entityId: string
  ) => void;
  loading: boolean;
}

function AccountGroup({
  label,
  entities,
  onboardingId,
  onOnboard,
  loading,
}: AccountGroupProps) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>{label}</Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        {loading ? (
          <View style={s.groupLoadingRow}>
            <ActivityIndicator size="small" color={colors.cobalt} />
          </View>
        ) : entities.length === 0 ? (
          <View style={[s.row, s.rowLast]}>
            <Text style={[s.emptyText, { color: colors.inkFaint }]}>
              No {label.toLowerCase()} yet
            </Text>
          </View>
        ) : (
          entities.map((account, idx) => (
            <EntityRow
              key={`${account.entityType}-${account.entityId}`}
              account={account}
              isLast={idx === entities.length - 1}
              onboardingId={onboardingId}
              onOnboard={onOnboard}
            />
          ))
        )}
      </View>
    </View>
  );
}

// ── Accounts tab ─────────────────────────────────────────────────────────────

interface AccountsTabProps {
  userId: string;
  token: string | null;
  navigation: any;
  deleting: boolean;
  onDeleteAccount: () => void;
}

function AccountsTab({
  userId,
  token,
  navigation,
  deleting,
  onDeleteAccount,
}: AccountsTabProps) {
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<ConnectAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);

  // ── User-level payment account state ──
  const [paymentStatus, setPaymentStatus] = useState<{
    onboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentOnboarding, setPaymentOnboarding] = useState(false);

  // ── Auth headers helper ──
  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const tkn = token || (await TokenStorage.getAccessToken());
    const h: Record<string, string> = {};
    if (tkn) h['Authorization'] = `Bearer ${tkn}`;
    return h;
  }, [token]);

  // ── Load user-level payment account status ──
  const loadPaymentStatus = useCallback(async () => {
    try {
      setPaymentLoading(true);
      const res = await fetch(`${API_BASE_URL}/stripe/connect/status`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPaymentStatus(data);
    } catch {
      setPaymentStatus(null);
    } finally {
      setPaymentLoading(false);
    }
  }, [authHeaders]);

  const handlePaymentOnboard = useCallback(async () => {
    try {
      setPaymentOnboarding(true);
      const returnUrl =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? window.location.href
            : 'https://muster.app'
          : 'muster://settings/accounts';
      const res = await fetch(`${API_BASE_URL}/stripe/connect/onboard`, {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshUrl: returnUrl, returnUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || 'Failed to start payment setup';
        Alert.alert('Payment Setup', msg);
        return;
      }
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch (err) {
      Alert.alert(
        'Payment Setup',
        'Could not connect to payment service. Please try again later.'
      );
    } finally {
      setPaymentOnboarding(false);
    }
  }, [authHeaders]);

  // ── Load all accounts from /connect/accounts ──
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/connect/accounts`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (err) {
      console.error('loadAccounts error', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadAccounts();
    loadPaymentStatus();
  }, [loadAccounts, loadPaymentStatus]);
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      loadPaymentStatus();
    }, [loadAccounts, loadPaymentStatus])
  );

  // ── Re-fetch a single entity's status after returning from Stripe ──
  const refreshEntityStatus = useCallback(
    async (entityType: ConnectAccount['entityType'], entityId: string) => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/connect/status/${entityType}/${entityId}`,
          { headers: await authHeaders() }
        );
        if (!res.ok) return;
        const data = await res.json();
        // data shape: { onboarded: boolean, chargesEnabled?, payoutsEnabled?, detailsSubmitted? }
        setAccounts(prev =>
          prev.map(a => {
            if (a.entityId !== entityId || a.entityType !== entityType)
              return a;
            if (!data.onboarded) return { ...a, accountId: null, status: null };
            return {
              ...a,
              accountId: data.accountId ?? a.accountId,
              status: {
                chargesEnabled: data.chargesEnabled ?? false,
                payoutsEnabled: data.payoutsEnabled ?? false,
                detailsSubmitted: data.detailsSubmitted ?? false,
              },
            };
          })
        );
      } catch (err) {
        console.error('refreshEntityStatus error', err);
      }
    },
    [authHeaders]
  );

  // ── Deep-link listener: muster://settings/accounts ──
  // When the user returns from Stripe, re-fetch the entity that was being onboarded.
  const pendingOnboardRef = useRef<{
    entityType: ConnectAccount['entityType'];
    entityId: string;
  } | null>(null);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (!url.includes('settings/accounts')) return;
      // Refresh user-level payment status
      loadPaymentStatus();
      // Refresh entity-level status if an entity onboard was in progress
      const pending = pendingOnboardRef.current;
      if (pending) {
        refreshEntityStatus(pending.entityType, pending.entityId);
        pendingOnboardRef.current = null;
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, [refreshEntityStatus, loadPaymentStatus]);

  // ── Onboard handler ──
  const handleOnboard = useCallback(
    async (entityType: ConnectAccount['entityType'], entityId: string) => {
      try {
        setOnboardingId(entityId);
        pendingOnboardRef.current = { entityType, entityId };

        const returnUrl =
          Platform.OS === 'web'
            ? typeof window !== 'undefined'
              ? window.location.href
              : 'https://muster.app'
            : 'muster://settings/accounts';

        const res = await fetch(`${API_BASE_URL}/connect/onboard`, {
          method: 'POST',
          headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entityType,
            entityId,
            refreshUrl: returnUrl,
            returnUrl,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          Alert.alert(
            'Payment Setup',
            body.error || 'Failed to start payment setup'
          );
          pendingOnboardRef.current = null;
          return;
        }
        const data = await res.json();
        if (data.url) await Linking.openURL(data.url);
      } catch (err) {
        Alert.alert(
          'Payment Setup',
          'Could not connect to payment service. Please try again later.'
        );
        pendingOnboardRef.current = null;
      } finally {
        setOnboardingId(null);
      }
    },
    [authHeaders]
  );

  // ── Group by entity type ──
  const grounds = accounts.filter(a => a.entityType === 'facility');
  const leagues = accounts.filter(a => a.entityType === 'league');
  const rosters = accounts.filter(a => a.entityType === 'roster');

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: () => navigation.navigate('Login') },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Payment Account — user-level Stripe Connect */}
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>
        Payment Account
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        {paymentLoading ? (
          <View style={[s.row, s.rowLast]}>
            <ActivityIndicator size="small" color={colors.cobalt} />
          </View>
        ) : paymentStatus?.chargesEnabled && paymentStatus?.payoutsEnabled ? (
          <View style={[s.row, s.rowLast]}>
            <View style={[s.iconWrap, { backgroundColor: colors.pineTint }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.pine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.ink }]}>Connected</Text>
              <Text style={[s.rowSubtitle, { color: colors.pine }]}>
                You can receive payments from bookings and join fees
              </Text>
            </View>
            <TouchableOpacity
              style={[s.btnFilled, { backgroundColor: colors.cobalt }]}
              onPress={handlePaymentOnboard}
              disabled={paymentOnboarding}
              activeOpacity={0.7}
            >
              {paymentOnboarding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[s.btnFilledText, { color: colors.white }]}>
                  Manage
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : paymentStatus?.detailsSubmitted ? (
          <View style={[s.row, s.rowLast]}>
            <View style={[s.iconWrap, { backgroundColor: colors.goldTint }]}>
              <Ionicons name="time-outline" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.ink }]}>
                Pending Review
              </Text>
              <Text style={[s.rowSubtitle, { color: colors.inkFaint }]}>
                Your account is under review. Resume onboarding if needed.
              </Text>
            </View>
            <TouchableOpacity
              style={[s.btnGhost, { borderColor: colors.cobalt }]}
              onPress={handlePaymentOnboard}
              disabled={paymentOnboarding}
              activeOpacity={0.7}
            >
              {paymentOnboarding ? (
                <ActivityIndicator size="small" color={colors.cobalt} />
              ) : (
                <Text style={[s.btnGhostText, { color: colors.cobalt }]}>
                  Resume
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.row, s.rowLast]}>
            <View style={[s.iconWrap, { backgroundColor: colors.cobaltTint }]}>
              <Ionicons name="card-outline" size={18} color={colors.cobalt} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.ink }]}>
                Set Up Payments
              </Text>
              <Text style={[s.rowSubtitle, { color: colors.inkFaint }]}>
                Connect a payment account to receive funds
              </Text>
            </View>
            <TouchableOpacity
              style={[s.btnGhost, { borderColor: colors.cobalt }]}
              onPress={handlePaymentOnboard}
              disabled={paymentOnboarding}
              activeOpacity={0.7}
            >
              {paymentOnboarding ? (
                <ActivityIndicator size="small" color={colors.cobalt} />
              ) : (
                <Text style={[s.btnGhostText, { color: colors.cobalt }]}>
                  Connect
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <AccountGroup
        label="Grounds"
        entities={grounds}
        onboardingId={onboardingId}
        onOnboard={handleOnboard}
        loading={loading}
      />
      <AccountGroup
        label="Leagues"
        entities={leagues}
        onboardingId={onboardingId}
        onOnboard={handleOnboard}
        loading={loading}
      />
      <AccountGroup
        label="Rosters"
        entities={rosters}
        onboardingId={onboardingId}
        onOnboard={handleOnboard}
        loading={loading}
      />

      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>Account</Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <MenuRow
          icon="log-out-outline"
          iconBg={colors.surface}
          label="Log Out"
          chevron={false}
          onPress={handleLogout}
        />
        <MenuRow
          icon="trash-outline"
          iconBg={colors.heartTint}
          iconColor={colors.heart}
          label={deleting ? 'Deleting…' : 'Delete Account'}
          labelColor={colors.heart}
          chevron={false}
          onPress={onDeleteAccount}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  userId: string;
  navigation: any;
}

function DocumentsTab({ userId, navigation }: DocumentsTabProps) {
  const { colors } = useTheme();
  const { data: docs } = useGetInsuranceDocumentsQuery({ userId });
  const count = docs?.length ?? 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>Documents</Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <MenuRow
          icon="document-text-outline"
          iconBg={colors.cobaltTint}
          iconColor={colors.cobalt}
          label="Insurance Documents"
          badge={count}
          onPress={() => (navigation as any).navigate('InsuranceDocuments')}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

interface PreferencesTabProps {
  intents: string[];
  onToggleIntent: (key: string) => void;
}

function PreferencesTab({ intents, onToggleIntent }: PreferencesTabProps) {
  const { isDark, setDarkMode } = useTheme();
  const [locationServices, setLocationServices] = useState(true);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>
        Preferences
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <ToggleRow
          icon="moon-outline"
          iconBg={colors.surface}
          label="Dark Mode"
          value={isDark}
          onValueChange={setDarkMode}
        />
        <ToggleRow
          icon="location-outline"
          iconBg={colors.surface}
          label="Location Services"
          value={locationServices}
          onValueChange={setLocationServices}
          isLast
        />
      </View>

      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>
        How I Use Muster
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        {INTENT_OPTIONS.map((opt, idx) => {
          const isOn = intents.includes(opt.key);
          const isLast = idx === INTENT_OPTIONS.length - 1;
          return (
            <View
              key={opt.key}
              style={[
                s.row,
                { borderBottomColor: colors.border },
                isLast && s.rowLast,
              ]}
            >
              <View
                style={[
                  s.iconWrap,
                  { backgroundColor: isOn ? colors.cobalt : colors.cobaltTint },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={isOn ? colors.white : colors.cobalt}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.intentTitle, { color: colors.ink }]}>
                  {opt.title}
                </Text>
                <Text style={[s.intentSubtitle, { color: colors.inkSoft }]}>
                  {opt.subtitle}
                </Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={() => onToggleIntent(opt.key)}
                trackColor={{
                  false: colors.border,
                  true: colors.cobalt + '50',
                }}
                thumbColor={isOn ? colors.cobalt : colors.inkFaint}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — ACCOUNT BOOKS
// ─────────────────────────────────────────────────────────────────────────────

interface AccountBooksTabProps {
  userId: string;
  token: string | null;
  navigation: any;
  onExportData: () => void;
}

function AccountBooksTab({
  userId,
  token,
  navigation,
  onExportData,
}: AccountBooksTabProps) {
  const { colors } = useTheme();
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tkn = token || (await TokenStorage.getAccessToken());
        const headers: Record<string, string> = {
          ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}),
        };
        const res = await fetch(
          `${API_BASE_URL}/rentals/my-rentals?userId=${userId}`,
          { headers }
        );
        if (!res.ok) return;
        const data = await res.json();
        const rentals: any[] = data.rentals ?? data ?? [];
        const past = rentals.filter((r: any) =>
          ['past', 'cancelled', 'used', 'completed'].includes(
            (r.status ?? '').toLowerCase()
          )
        );
        setPurchaseCount(past.length);
      } catch {
        // silently ignore
      }
    })();
  }, [userId, token]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>
        Account Books
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <MenuRow
          icon="receipt-outline"
          iconBg={colors.cobaltTint}
          iconColor={colors.cobalt}
          label="Purchase History"
          badge={purchaseCount}
          onPress={() => (navigation as any).navigate('BookingHistory')}
        />
        <MenuRow
          icon="download-outline"
          iconBg={colors.surface}
          label="Export Data"
          subtitle="Download your activity and records"
          onPress={onExportData}
        />
        <MenuRow
          icon="ticket-outline"
          iconBg={colors.surface}
          label="Redeem a Code"
          subtitle="Enter a promo or access code"
          onPress={() => (navigation as any).navigate('RedeemCode')}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 — ABOUT
// ─────────────────────────────────────────────────────────────────────────────

function AboutTab() {
  const { colors } = useTheme();
  const version = `${appJson.expo.version} (${appJson.expo.android?.versionCode ?? 1})`;

  const handleRateApp = async () => {
    try {
      if (await StoreReview.hasAction()) {
        StoreReview.requestReview();
      }
    } catch (err) {
      console.warn('StoreReview error', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>About</Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.bgCard, shadowColor: colors.ink },
        ]}
      >
        <MenuRow
          icon="shield-outline"
          iconBg={colors.surface}
          label="Privacy Policy"
          onPress={() =>
            Linking.openURL(`${API_BASE_URL.replace('/api', '')}/privacy`)
          }
        />
        <MenuRow
          icon="document-text-outline"
          iconBg={colors.surface}
          label="Terms of Service"
          onPress={() => Linking.openURL('https://muster.app/terms')}
        />
        <MenuRow
          icon="help-circle-outline"
          iconBg={colors.surface}
          label="Help & Support"
          onPress={() => Linking.openURL('mailto:support@muster.app')}
        />
        <MenuRow
          icon="star-outline"
          iconBg={colors.goldTint}
          iconColor={colors.gold}
          label="Rate Muster"
          onPress={handleRateApp}
        />
        <MenuRow
          icon="information-circle-outline"
          iconBg={colors.surface}
          label="Version"
          rightValue={version}
          chevron={false}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsScreen(): JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const authUser = useSelector(selectUser);
  const token = useSelector(selectAccessToken);
  const { isDependent } = useDependentContext();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState(0);
  const [intents, setIntents] = useState<string[]>(authUser?.intents ?? []);
  const [deleting, setDeleting] = useState(false);

  const pagerRef = useRef<ScrollView>(null);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const handlePagerScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== activeTab) setActiveTab(index);
  };

  const handleToggleIntent = async (key: string) => {
    const prev = intents;
    const next = intents.includes(key)
      ? intents.filter(k => k !== key)
      : [...intents, key];
    setIntents(next);
    try {
      const { user } = await userService.updateIntents(next);
      if (user) dispatch(setUser(user));
    } catch {
      setIntents(prev);
    }
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Your data will be prepared for download.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Export',
        onPress: async () => {
          try {
            await userService.exportUserData();
            Alert.alert('Success', 'Check your email for the download link.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to export data');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    loggingService.logButton('Delete Account', 'SettingsScreen');
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await userService.deleteAccount('');
              Alert.alert('Account Deleted', 'Your account has been deleted.', [
                {
                  text: 'OK',
                  onPress: () => (navigation as any).navigate('Login'),
                },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const userId = authUser?.id ?? '';

  return (
    <View style={[s.screen, { backgroundColor: colors.bgScreen }]}>
      <TabBar activeIndex={activeTab} onPress={handleTabPress} />

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handlePagerScroll}
        style={{ flex: 1 }}
      >
        {/* TAB 1 — ACCOUNTS */}
        <View style={{ width: screenWidth }}>
          {!isDependent && userId ? (
            <AccountsTab
              userId={userId}
              token={token}
              navigation={navigation}
              deleting={deleting}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <Text
                style={[s.sectionLabel, { marginTop: 40, textAlign: 'center' }]}
              >
                Not available in dependent mode
              </Text>
            </ScrollView>
          )}
        </View>

        {/* TAB 2 — DOCUMENTS */}
        <View style={{ width: screenWidth }}>
          {userId ? (
            <DocumentsTab userId={userId} navigation={navigation} />
          ) : null}
        </View>

        {/* TAB 3 — PREFERENCES */}
        <View style={{ width: screenWidth }}>
          <PreferencesTab
            intents={intents}
            onToggleIntent={handleToggleIntent}
          />
        </View>

        {/* TAB 4 — ACCOUNT BOOKS */}
        <View style={{ width: screenWidth }}>
          {userId ? (
            <AccountBooksTab
              userId={userId}
              token={token}
              navigation={navigation}
              onExportData={handleExportData}
            />
          ) : null}
        </View>

        {/* TAB 5 — ABOUT */}
        <View style={{ width: screenWidth }}>
          <AboutTab />
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ── Tab bar ──
  tabBarOuter: {
    borderBottomWidth: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tabItem: {
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
  tabLabelActive: {},
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },

  // ── Section label ──
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },

  // ── Card ──
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  rowValue: {
    fontFamily: fonts.body,
    fontSize: 15,
  },

  // ── Icon wrap ──
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Badge ──
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },

  // ── Account groups ──
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 6,
  },
  groupHeaderText: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupDivider: {
    height: 1,
  },
  groupLoadingRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // ── Entity rows ──
  entityName: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
  },
  entityStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },

  // ── Buttons ──
  entityBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 80,
    height: 34,
  },
  entityBtnText: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
  // kept for any remaining references
  btnFilled: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center' as const,
    minWidth: 72,
  },
  btnFilledText: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
  btnGhost: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center' as const,
    minWidth: 72,
  },
  btnGhostText: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },

  // ── Intent rows ──
  intentTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    marginBottom: 1,
  },
  intentSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
