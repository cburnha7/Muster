import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { colors, fonts } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const profileScreenOptions = {
  headerShown: true,
  headerBackVisible: true,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.onSurface },
};

export function RootNavigator() {
  const { user, isLoading: authLoading } = useAuth();
  useNetworkState();

  // Log user state changes
  useEffect(() => {
    console.log('RootNavigator: User state changed:', user ? `Logged in as ${user.firstName} ${user.lastName}` : 'Not logged in');
    console.log('RootNavigator: Auth loading:', authLoading);
  }, [user, authLoading]);

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
        ) : !user.onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Group screenOptions={profileScreenOptions}>
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerTitle: 'Profile' }} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerTitle: 'Edit Profile' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerTitle: 'Settings' }} />
              <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} options={{ headerTitle: 'Notifications' }} />
              <Stack.Screen name="DependentForm" component={DependentFormScreen} options={{ headerTitle: 'Dependent' }} />
              <Stack.Screen name="DependentProfile" component={DependentProfileScreen} options={{ headerTitle: 'Dependent' }} />
              <Stack.Screen name="TransferAccount" component={TransferAccountScreen} options={{ headerTitle: 'Transfer' }} />
              <Stack.Screen name="RedeemCode" component={RedeemCodeScreen} options={{ headerTitle: 'Redeem Code' }} />
            </Stack.Group>
          </>
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
