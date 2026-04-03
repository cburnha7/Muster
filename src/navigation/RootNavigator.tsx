import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { useNetworkState } from '../services/network';

// Direct imports instead of lazy loading for web compatibility
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import OnboardingNavigator from './OnboardingNavigator';

// Import components
import { OfflineIndicator } from '../components/navigation/OfflineIndicator';
import { LoadingScreen } from '../screens/common/LoadingScreen';

// Profile screens (accessible from avatar bottom sheet on any tab)
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { NotificationPreferencesScreen } from '../screens/profile/NotificationPreferencesScreen';
import { DependentFormScreen } from '../screens/profile/DependentFormScreen';
import { DependentProfileScreen } from '../screens/profile/DependentProfileScreen';
import { TransferAccountScreen } from '../screens/profile/TransferAccountScreen';
import { RedeemCodeScreen } from '../screens/profile/RedeemCodeScreen';
import { AvailabilityCalendarScreen } from '../screens/profile/AvailabilityCalendarScreen';
import { colors, fonts } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const profileScreenOptions = {
  headerShown: true,
  headerBackVisible: true,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.onSurface,
  },
};

const PENDING_INVITE_KEY = '@muster_pending_invite';

/** Extract invite code from a muster.app/join/<code> URL */
function extractInviteCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    // Handle muster://join/CODE or https://muster.app/join/CODE
    if (parsed.path?.startsWith('join/')) {
      return parsed.path.replace('join/', '');
    }
    // Handle path param from linking config
    if (parsed.queryParams?.inviteCode) {
      return parsed.queryParams.inviteCode as string;
    }
    return null;
  } catch {
    return null;
  }
}

export function RootNavigator() {
  const { user, isLoading: authLoading } = useAuth();
  useNetworkState();
  const pendingInviteHandled = useRef(false);

  // Log user state changes
  useEffect(() => {
    console.log(
      'RootNavigator: User state changed:',
      user ? `Logged in as ${user.firstName} ${user.lastName}` : 'Not logged in'
    );
    console.log('RootNavigator: Auth loading:', authLoading);
  }, [user, authLoading]);

  // ── Capture invite code from deep link when not authenticated ──
  useEffect(() => {
    const handleURL = ({ url }: { url: string }) => {
      const code = extractInviteCode(url);
      if (code && !user) {
        // Stash the invite code for after authentication
        AsyncStorage.setItem(PENDING_INVITE_KEY, code).catch(() => {});
        console.log('RootNavigator: Stashed pending invite code:', code);
      }
    };

    // Check initial URL (cold start from link)
    Linking.getInitialURL().then(url => {
      if (url) handleURL({ url });
    });

    // Listen for URLs while app is open
    const subscription = Linking.addEventListener('url', handleURL);
    return () => subscription.remove();
  }, [user]);

  // ── After login + onboarding, redirect to JoinTeam if there's a pending invite ──
  useEffect(() => {
    if (user && user.onboardingComplete && !pendingInviteHandled.current) {
      pendingInviteHandled.current = true;
      AsyncStorage.getItem(PENDING_INVITE_KEY).then(code => {
        if (code) {
          AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});
          console.log(
            'RootNavigator: Redirecting to JoinTeam with pending invite:',
            code
          );
          // The TabNavigatorWithInviteRedirect component below handles the redirect
        }
      });
    }
  }, [user]);

  // Show loading screen while checking auth
  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth">
            {props => (
              <AuthNavigator
                {...props}
                onAuthSuccess={() => {
                  // Navigation will happen automatically via AuthContext
                  console.log('Authentication successful');
                }}
              />
            )}
          </Stack.Screen>
        ) : !user.onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" options={{ headerBackTitle: 'Home' }}>
              {props => <TabNavigatorWithInviteRedirect {...props} />}
            </Stack.Screen>
            <Stack.Group screenOptions={profileScreenOptions}>
              <Stack.Screen
                name="ProfileScreen"
                component={ProfileScreen}
                options={{ headerTitle: 'Profile' }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerTitle: 'Edit Profile' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerTitle: 'Settings' }}
              />
              <Stack.Screen
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
                options={{ headerTitle: 'Notifications' }}
              />
              <Stack.Screen
                name="DependentForm"
                component={DependentFormScreen}
                options={{ headerTitle: 'Dependent' }}
              />
              <Stack.Screen
                name="DependentProfile"
                component={DependentProfileScreen}
                options={{ headerTitle: 'Dependent' }}
              />
              <Stack.Screen
                name="TransferAccount"
                component={TransferAccountScreen}
                options={{ headerTitle: 'Transfer' }}
              />
              <Stack.Screen
                name="RedeemCode"
                component={RedeemCodeScreen}
                options={{ headerTitle: 'Redeem Code' }}
              />
              <Stack.Screen
                name="AvailabilityCalendar"
                component={AvailabilityCalendarScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </View>
  );
}

/** Wrapper that checks for pending invite codes on mount and redirects */
function TabNavigatorWithInviteRedirect(props: any) {
  const navigation = useNavigation();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    AsyncStorage.getItem(PENDING_INVITE_KEY).then(code => {
      if (code) {
        AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});
        // Navigate to JoinTeam within the Teams stack
        setTimeout(() => {
          (navigation as any).navigate('Teams', {
            screen: 'JoinTeam',
            params: { inviteCode: code },
          });
        }, 300);
      }
    });
  }, []);

  return <TabNavigator {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
