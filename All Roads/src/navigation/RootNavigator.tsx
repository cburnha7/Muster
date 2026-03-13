import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { useNetworkState } from '../services/network';

// Direct imports instead of lazy loading for web compatibility
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';

// Import components
import { OfflineIndicator } from '../components/navigation/OfflineIndicator';
import { LoadingScreen } from '../screens/common/LoadingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { isConnected } = useNetworkState();

  // Log user state changes
  useEffect(() => {
    console.log('RootNavigator: User state changed:', user ? `Logged in as ${user.username}` : 'Not logged in');
    console.log('RootNavigator: Auth loading:', authLoading);
  }, [user, authLoading]);

  // Show loading screen while checking auth
  if (authLoading) {
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