import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { useNetworkState } from '../services/network';
import { TokenStorage } from '../services/auth/TokenStorage';

// Direct imports instead of lazy loading for web compatibility
import { OnboardingNavigator } from './OnboardingNavigator';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';

// Import components
import { OfflineIndicator } from '../components/navigation/OfflineIndicator';
import { LoadingScreen } from '../screens/common/LoadingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

export function RootNavigator(): JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { isConnected } = useNetworkState();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Log user state changes
  useEffect(() => {
    console.log('RootNavigator: User state changed:', user ? `Logged in as ${user.username}` : 'Not logged in');
  }, [user]);

  useEffect(() => {
    checkInitialAuthState();
  }, []);

  const checkInitialAuthState = async () => {
    try {
      // Check onboarding status
      setIsOnboardingCompleted(true); // Skip onboarding for development
      
      // Check for valid authentication tokens
      const tokenStorage = new TokenStorage();
      const accessToken = await tokenStorage.getAccessToken();
      const user = await tokenStorage.getUser();
      
      // If we have both token and user data, authentication is valid
      // The AuthContext will handle the actual authentication state
      console.log('Initial auth check:', {
        hasToken: !!accessToken,
        hasUser: !!user,
      });
    } catch (error) {
      console.error('Error checking initial auth state:', error);
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Show loading screen while checking initial state
  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator isOffline={!isConnected} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isOnboardingCompleted ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingNavigator 
                {...props}
                onComplete={handleOnboardingComplete}
              />
            )}
          </Stack.Screen>
        ) : !user ? (
          <Stack.Screen name="Auth">
            {(props) => (
              <AuthNavigator 
                {...props}
                onAuthSuccess={() => {
                  // Navigation will happen automatically via AuthContext
                  console.log('Authentication successful');
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});