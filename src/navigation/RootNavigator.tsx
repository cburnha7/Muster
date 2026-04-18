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

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  // ── Capture invite code from deep link when not authenticated ──
  useEffect(() => {
    const handleURL = ({ url }: { url: string }) => {
      const code = extractInviteCode(url);
      if (code && !user) {
        // Stash the invite code for after authentication
        AsyncStorage.setItem(PENDING_INVITE_KEY, code).catch(() => {});
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
